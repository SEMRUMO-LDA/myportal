/**
 * Session Checker - Verifica e fecha automaticamente sessões abertas do dia anterior
 * Executa no início do Kiosk para garantir integridade dos dados
 */

import { supabase } from '../services/supabaseClient';
import { TimeLog, TimeLogStatus } from '../types';

const SESSION_ANOMALY_TIME = '99:99'; // Legacy marker - avoid using for new closures

export interface OpenSessionResult {
  hasOpenSessions: boolean;
  closedSessions: number;
  errors: any[];
  affectedUsers: Array<{
    userId: number;
    userName: string;
    date: string;
    checkInTime: string;
  }>;
}

/**
 * Verifica e fecha automaticamente sessões abertas do dia anterior
 * @param currentUserId - ID do utilizador atual (para logging)
 * @returns Resultado da operação com detalhes das sessões fechadas
 */
export async function checkAndCloseOpenSessions(currentUserId?: number): Promise<OpenSessionResult> {
  const result: OpenSessionResult = {
    hasOpenSessions: false,
    closedSessions: 0,
    errors: [],
    affectedUsers: []
  };

  try {
    // 1. Obter data de "corte" logicamente segura
    // Usamos um buffer de 16 horas para não fechar turnos de noite ativos
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 16);
    
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const cutoffTime = cutoffDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });

    console.log(`[SessionChecker] Sweeping sessions started before ${cutoffStr} ${cutoffTime}`);

    // 2. Buscar sessões abertas que não sejam do turno atual (mais de 16h atrás)
    let query = supabase
      .from('time_logs')
      .select(`
        *,
        user:users!time_logs_user_id_fkey (
          id,
          name,
          email,
          department
        )
      `)
      .is('check_out', null)
      .neq('status', TimeLogStatus.ANOMALY) // Ignorar anomalias já marcadas
      .or(`date.lt.${cutoffStr},and(date.eq.${cutoffStr},check_in.lte.${cutoffTime})`);

    // OTIMIZAÇÃO: Filtra apenas para o utilizador atual se fornecido (carregamento mais rápido no Kiosk)
    if (currentUserId) {
      query = query.eq('user_id', currentUserId);
    }

    const { data: openSessions, error: fetchError } = await query.order('date', { ascending: false });

    if (fetchError) {
      console.error('Error fetching open sessions:', fetchError);
      result.errors.push(fetchError);
      return result;
    }

    if (!openSessions || openSessions.length === 0) {
      console.log('No open sessions found requiring auto-closure');
      return result;
    }

    result.hasOpenSessions = true;
    console.log(`Found ${openSessions.length} open sessions to evaluate/close`);

    // 3. Processar cada sessão aberta
    for (const session of openSessions) {
      try {
        // 3.1. Atualizar time_log - USAR NULL em vez de 99:99 para evitar erro 400
        const { error: updateError } = await supabase
          .from('time_logs')
          .update({
            check_out: null, // Mantemos null mas mudamos o status
            status: TimeLogStatus.ANOMALY,
            total_hours: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);

        if (updateError) {
          console.error(`Error closing session ${session.id}:`, updateError);
          result.errors.push({ sessionId: session.id, error: updateError });
          continue;
        }

        // 3.2. Criar registo de anomalia
        const anomalyData = {
          user_id: session.user_id,
          date: session.date,
          type: 'UNCLOSED_SESSION',
          description: `Sessão não encerrada - Entrada às ${session.check_in}. Fechada automaticamente pelo sistema (Sweep).`,
          severity: 'HIGH',
          status: 'PENDING',
          time_log_id: session.id,
          detected_at: new Date().toISOString()
        };

        const { error: anomalyError } = await supabase
          .from('anomalies')
          .insert(anomalyData);

        if (anomalyError) {
          console.error('Error creating anomaly record:', anomalyError);
        }

        // 3.3. Notificar o colaborador
        if (session.user) {
          const notificationMessage = {
            sender_id: 'SYSTEM',
            receiver_id: session.user_id,
            subject: '⚠️ Sessão de Trabalho Não Encerrada',
            content: `Foi detetado que não encerrou a sua sessão de trabalho do dia ${new Date(session.date).toLocaleDateString('pt-PT')}.

Entrada registada: ${session.check_in}
Saída: NÃO REGISTADA

A sessão foi automaticamente marcada como anomalia por exceder o tempo limite de permanência aberta.

Por favor, contacte o seu responsável ou RH para corrigir este registo.

Lembre-se sempre de registar a sua saída ao fim do dia de trabalho.`,
            date: new Date().toISOString(),
            read: false,
            priority: 'HIGH'
          };

          await supabase.from('internal_messages').insert(notificationMessage);

          // Adicionar aos resultados
          result.affectedUsers.push({
            userId: session.user_id,
            userName: session.user.name,
            date: session.date,
            checkInTime: session.check_in
          });
        }

        result.closedSessions++;
        console.log(`Successfully auto-closed session for user ${session.userId} on ${session.date}`);

      } catch (sessionError) {
        console.error(`Error processing session ${session.id}:`, sessionError);
        result.errors.push({ sessionId: session.id, error: sessionError });
      }
    }

    // 4. Auditoria
    if (result.closedSessions > 0) {
      const auditLog = {
        action: 'AUTO_CLOSE_SESSIONS',
        performed_by: currentUserId || 'SYSTEM',
        performed_at: new Date().toISOString(),
        details: {
          closed_count: result.closedSessions,
          affected_users: result.affectedUsers,
          errors_count: result.errors.length,
          method: 'NEW_STRICT_STATUS'
        }
      };

      await supabase.from('audit_logs').insert(auditLog);
    }

  } catch (error) {
    console.error('Critical error in session checker:', error);
    result.errors.push({ critical: true, error });
  }

  return result;
}

/**
 * Verifica se um valor de checkout é uma anomalia
 */
export function isAnomalyCheckout(checkOut: string | null, status?: TimeLogStatus): boolean {
  // Suporta legado (99:99) e novo padrão (null + ANOMALY)
  return checkOut === SESSION_ANOMALY_TIME || 
         (checkOut === null && status === TimeLogStatus.ANOMALY);
}

/**
 * Formata mensagem de anomalia para exibição
 */
export function formatAnomalyMessage(checkOut: string | null, status?: TimeLogStatus): string {
  if (isAnomalyCheckout(checkOut, status)) {
    return 'Sessão não encerrada (Anomalia)';
  }
  return '';
}

/**
 * Obter todas as anomalias pendentes para um gestor
 */
export async function getPendingAnomalies(managerId: number) {
  const { data, error } = await supabase
    .from('anomalies')
    .select(`
      *,
      user:users!anomalies_user_id_fkey (
        id,
        name,
        email,
        department
      ),
      time_log:time_logs!anomalies_time_log_id_fkey (
        id,
        date,
        check_in,
        check_out
      )
    `)
    .eq('status', 'PENDING')
    .order('detected_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending anomalies:', error);
    return [];
  }

  return data || [];
}

/**
 * Corrigir uma anomalia de sessão não fechada
 */
export async function correctUnclosedSession(
  timeLogId: number,
  correctCheckOut: string,
  correctedBy: number,
  justification: string
) {
  try {
    // 1. Atualizar o time_log com o valor correto
    const { error: updateError } = await supabase
      .from('time_logs')
      .update({
        check_out: correctCheckOut,
        status: TimeLogStatus.PRESENT,
        notes: `[CORRIGIDO] ${justification} - Corrigido por user ID ${correctedBy} em ${new Date().toLocaleDateString('pt-PT')}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', timeLogId);

    if (updateError) throw updateError;

    // 2. Recalcular totalHours baseado nos novos valores
    const { data: timeLog } = await supabase
      .from('time_logs')
      .select('check_in, check_out, break_start, break_end')
      .eq('id', timeLogId)
      .single();

    if (timeLog && timeLog.check_in && timeLog.check_out) {
      const totalHours = calculateTotalHours(
        timeLog.check_in,
        timeLog.check_out,
        timeLog.break_start,
        timeLog.break_end
      );

      await supabase
        .from('time_logs')
        .update({ total_hours: totalHours })
        .eq('id', timeLogId);
    }

    // 3. Atualizar anomalia como resolvida
    const { error: anomalyError } = await supabase
      .from('anomalies')
      .update({
        status: 'RESOLVED',
        resolved_by: correctedBy,
        resolved_at: new Date().toISOString(),
        resolution: justification
      })
      .eq('time_log_id', timeLogId)
      .eq('type', 'UNCLOSED_SESSION');

    if (anomalyError) throw anomalyError;

    return { success: true };
  } catch (error) {
    console.error('Error correcting unclosed session:', error);
    return { success: false, error };
  }
}

/**
 * Helper para calcular horas totais
 */
function calculateTotalHours(
  checkIn: string,
  checkOut: string,
  breakStart?: string,
  breakEnd?: string
): number {
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);

  let checkInMinutes = h1 * 60 + m1;
  let checkOutMinutes = h2 * 60 + m2;

  if (checkOutMinutes < checkInMinutes) {
    checkOutMinutes += 24 * 60;
  }

  let totalMinutes = checkOutMinutes - checkInMinutes;

  if (breakStart && breakEnd) {
    const [bh1, bm1] = breakStart.split(':').map(Number);
    const [bh2, bm2] = breakEnd.split(':').map(Number);

    let breakStartMinutes = bh1 * 60 + bm1;
    let breakEndMinutes = bh2 * 60 + bm2;

    if (breakEndMinutes < breakStartMinutes) {
      breakEndMinutes += 24 * 60;
    }

    const breakMinutes = breakEndMinutes - breakStartMinutes;
    if (breakMinutes > 0 && breakMinutes < totalMinutes) {
      totalMinutes -= breakMinutes;
    }
  }

  return totalMinutes / 60;
}