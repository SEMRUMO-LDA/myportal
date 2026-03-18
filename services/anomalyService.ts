/**
 * Serviço centralizado para gestão de anomalias
 * Centraliza toda a lógica de criação, validação e processamento de anomalias
 */

import { supabase } from './supabaseClient';
import { ensureNumericId } from './idResolver';

// Tipos de anomalias suportados
export type AnomalyType =
  | 'LATE_ENTRY'           // Entrada tardia
  | 'EARLY_EXIT'           // Saída antecipada
  | 'HOURS_DEFICIT'        // Défice de horas
  | 'HOURS_SURPLUS'        // Excesso de horas
  | 'UNCLOSED_SESSION'     // Sessão não encerrada
  | 'MISSING_CLOCK_IN'     // Falta de entrada
  | 'MISSING_CLOCK_OUT'    // Falta de saída
  | 'MISSING_BREAK'        // Pausa não registada
  | 'INVALID_LOCATION';    // Localização inválida

// Severidade da anomalia
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Estado da anomalia
export type AnomalyStatus =
  | 'PENDING'                      // Pendente
  | 'AWAITING_JUSTIFICATION'       // Aguardando justificação
  | 'JUSTIFIED_PENDING_REVIEW'     // Justificada, pendente de revisão
  | 'JUSTIFIED_MANAGER'            // Aprovada pelo manager
  | 'ESCALATED_HR'                 // Escalada para RH
  | 'REJECTED'                     // Rejeitada
  | 'RESOLVED';                    // Resolvida

export interface CreateAnomalyParams {
  userId: number | string;
  userEmail?: string;
  date: string;
  type: AnomalyType;
  description: string;
  minutes?: number;
  timeLogId?: number | string;
  detectedBy?: string;
  severity?: AnomalySeverity;
  status?: AnomalyStatus;
}

export interface Anomaly {
  id: number;
  user_id: number;
  date: string;
  type: AnomalyType;
  description: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  time_log_id?: number;
  minutes?: number;
  detected_at: string;
  detected_by: string;
  resolved_by?: number;
  resolved_at?: string;
  resolution?: string;
  created_at: string;
  updated_at?: string;
}

class AnomalyService {
  /**
   * Cria uma nova anomalia com validação de duplicatas
   */
  async createAnomaly(params: CreateAnomalyParams): Promise<{ success: boolean; anomaly?: Anomaly; error?: string }> {
    try {
      // 1. Resolver ID numérico do utilizador
      const numericUserId = await ensureNumericId(params.userId, params.userEmail);

      // 2. Verificar se já existe anomalia para o mesmo time_log e tipo
      if (params.timeLogId) {
        const { data: existing } = await supabase
          .from('anomalies')
          .select('id')
          .eq('time_log_id', params.timeLogId)
          .eq('type', params.type)
          .maybeSingle();

        if (existing) {
          console.warn(`[AnomalyService] Anomalia duplicada evitada - time_log_id: ${params.timeLogId}, type: ${params.type}`);
          return {
            success: false,
            error: 'Anomalia já existe para este registo'
          };
        }
      }

      // 3. Calcular severidade se não fornecida
      const severity = params.severity || this.calculateSeverity(params.type, params.minutes);

      // 4. Determinar status inicial baseado na severidade
      const status = params.status || (
        severity === 'CRITICAL' || severity === 'HIGH'
          ? 'AWAITING_JUSTIFICATION'
          : 'PENDING'
      );

      // 5. Criar anomalia
      const anomalyData = {
        user_id: numericUserId,
        date: params.date,
        type: params.type,
        description: params.description,
        severity,
        status,
        time_log_id: params.timeLogId ? Number(params.timeLogId) : null,
        minutes: params.minutes || null,
        detected_at: new Date().toISOString(),
        detected_by: params.detectedBy || 'SYSTEM',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('anomalies')
        .insert(anomalyData)
        .select()
        .single();

      if (error) {
        console.error('[AnomalyService] Erro ao criar anomalia:', error);
        throw error;
      }

      console.log(`[AnomalyService] ✅ Anomalia criada - ID: ${data.id}, Type: ${params.type}, User: ${numericUserId}`);

      // 6. Notificar se necessário
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        await this.notifyAnomalyCritical(numericUserId, params.type, params.minutes);
      }

      return {
        success: true,
        anomaly: data as Anomaly
      };

    } catch (error: any) {
      console.error('[AnomalyService] Erro ao criar anomalia:', error);
      return {
        success: false,
        error: error.message || 'Erro ao criar anomalia'
      };
    }
  }

  /**
   * Calcula a severidade baseado no tipo e minutos
   */
  private calculateSeverity(type: AnomalyType, minutes?: number): AnomalySeverity {
    switch (type) {
      case 'UNCLOSED_SESSION':
        return 'HIGH';

      case 'LATE_ENTRY':
        if (!minutes) return 'MEDIUM';
        if (minutes >= 60) return 'CRITICAL';
        if (minutes >= 30) return 'HIGH';
        if (minutes >= 15) return 'MEDIUM';
        return 'LOW';

      case 'EARLY_EXIT':
        if (!minutes) return 'MEDIUM';
        if (minutes >= 60) return 'CRITICAL';
        if (minutes >= 30) return 'HIGH';
        if (minutes >= 15) return 'MEDIUM';
        return 'LOW';

      case 'HOURS_DEFICIT':
        if (!minutes) return 'MEDIUM';
        if (minutes >= 120) return 'CRITICAL'; // 2+ horas
        if (minutes >= 60) return 'HIGH';      // 1+ hora
        if (minutes >= 30) return 'MEDIUM';    // 30+ minutos
        return 'LOW';

      case 'HOURS_SURPLUS':
        if (!minutes) return 'LOW';
        if (minutes >= 180) return 'HIGH';     // 3+ horas extra
        if (minutes >= 120) return 'MEDIUM';   // 2+ horas extra
        return 'LOW';

      case 'MISSING_CLOCK_IN':
      case 'MISSING_CLOCK_OUT':
        return 'HIGH';

      case 'MISSING_BREAK':
        return 'MEDIUM';

      case 'INVALID_LOCATION':
        return 'MEDIUM';

      default:
        return 'MEDIUM';
    }
  }

  /**
   * Notifica sobre anomalia crítica
   */
  private async notifyAnomalyCritical(userId: number, type: AnomalyType, minutes?: number): Promise<void> {
    try {
      const message = this.buildNotificationMessage(type, minutes);

      await supabase.from('internal_messages').insert({
        sender_id: 'SYSTEM',
        receiver_id: userId,
        subject: 'Justificação Requerida - Anomalia Detetada',
        content: message,
        priority: 'HIGH',
        is_broadcast: false,
        created_at: new Date().toISOString()
      });

      console.log(`[AnomalyService] Notificação enviada ao utilizador ${userId}`);
    } catch (error) {
      console.error('[AnomalyService] Erro ao enviar notificação:', error);
      // Não falhar a criação da anomalia se a notificação falhar
    }
  }

  /**
   * Constrói mensagem de notificação
   */
  private buildNotificationMessage(type: AnomalyType, minutes?: number): string {
    const minutesStr = minutes ? `${minutes} minutos` : '';

    switch (type) {
      case 'LATE_ENTRY':
        return `Foi detetada uma entrada tardia de ${minutesStr}. Por favor, justifique esta ocorrência.`;

      case 'EARLY_EXIT':
        return `Foi detetada uma saída antecipada de ${minutesStr}. Por favor, justifique esta ocorrência.`;

      case 'HOURS_DEFICIT':
        return `Foi detetado um défice de ${minutesStr} nas horas trabalhadas. Por favor, justifique esta ocorrência.`;

      case 'UNCLOSED_SESSION':
        return 'Foi detetada uma sessão não encerrada. Por favor, verifique o seu registo de ponto.';

      default:
        return 'Foi detetada uma anomalia no seu registo de ponto. Por favor, contacte o RH.';
    }
  }

  /**
   * Verifica se existe anomalia duplicada
   */
  async checkDuplicate(timeLogId: number | string, type: AnomalyType): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('anomalies')
        .select('id')
        .eq('time_log_id', Number(timeLogId))
        .eq('type', type)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('[AnomalyService] Erro ao verificar duplicata:', error);
      return false;
    }
  }

  /**
   * Resolve uma anomalia
   */
  async resolveAnomaly(
    anomalyId: number,
    resolvedBy: number,
    resolution: string,
    status: AnomalyStatus = 'RESOLVED'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({
          status,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          resolution,
          updated_at: new Date().toISOString()
        })
        .eq('id', anomalyId);

      if (error) throw error;

      console.log(`[AnomalyService] ✅ Anomalia ${anomalyId} resolvida`);
      return { success: true };

    } catch (error: any) {
      console.error('[AnomalyService] Erro ao resolver anomalia:', error);
      return {
        success: false,
        error: error.message || 'Erro ao resolver anomalia'
      };
    }
  }

  /**
   * Solicita justificação para uma anomalia
   */
  async requestJustification(anomalyId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({
          status: 'AWAITING_JUSTIFICATION',
          updated_at: new Date().toISOString()
        })
        .eq('id', anomalyId);

      if (error) throw error;

      return { success: true };

    } catch (error: any) {
      console.error('[AnomalyService] Erro ao solicitar justificação:', error);
      return {
        success: false,
        error: error.message || 'Erro ao solicitar justificação'
      };
    }
  }

  /**
   * Escala anomalia para RH
   */
  async escalateToHR(anomalyId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({
          status: 'ESCALATED_HR',
          updated_at: new Date().toISOString()
        })
        .eq('id', anomalyId);

      if (error) throw error;

      // TODO: Notificar RH

      return { success: true };

    } catch (error: any) {
      console.error('[AnomalyService] Erro ao escalar para RH:', error);
      return {
        success: false,
        error: error.message || 'Erro ao escalar para RH'
      };
    }
  }

  /**
   * Helper para criar anomalia de LATE_ENTRY
   */
  async createLateEntry(
    userId: number | string,
    userEmail: string,
    date: string,
    minutesLate: number,
    timeLogId?: number | string
  ): Promise<{ success: boolean; anomaly?: Anomaly; error?: string }> {
    return this.createAnomaly({
      userId,
      userEmail,
      date,
      type: 'LATE_ENTRY',
      description: `Entrada tardia de ${minutesLate} minutos`,
      minutes: minutesLate,
      timeLogId
    });
  }

  /**
   * Helper para criar anomalia de EARLY_EXIT
   */
  async createEarlyExit(
    userId: number | string,
    userEmail: string,
    date: string,
    minutesEarly: number,
    timeLogId?: number | string
  ): Promise<{ success: boolean; anomaly?: Anomaly; error?: string }> {
    return this.createAnomaly({
      userId,
      userEmail,
      date,
      type: 'EARLY_EXIT',
      description: `Saída antecipada de ${minutesEarly} minutos`,
      minutes: minutesEarly,
      timeLogId
    });
  }

  /**
   * Helper para criar anomalia de HOURS_DEFICIT
   */
  async createHoursDeficit(
    userId: number | string,
    userEmail: string,
    date: string,
    deficitMinutes: number,
    timeLogId?: number | string
  ): Promise<{ success: boolean; anomaly?: Anomaly; error?: string }> {
    return this.createAnomaly({
      userId,
      userEmail,
      date,
      type: 'HOURS_DEFICIT',
      description: `Défice de ${deficitMinutes} minutos nas horas trabalhadas`,
      minutes: deficitMinutes,
      timeLogId
    });
  }

  /**
   * Helper para criar anomalia de UNCLOSED_SESSION
   */
  async createUnclosedSession(
    userId: number | string,
    userEmail: string,
    date: string,
    checkInTime: string,
    timeLogId?: number | string
  ): Promise<{ success: boolean; anomaly?: Anomaly; error?: string }> {
    return this.createAnomaly({
      userId,
      userEmail,
      date,
      type: 'UNCLOSED_SESSION',
      description: `Sessão não encerrada - Entrada às ${checkInTime}`,
      timeLogId,
      severity: 'HIGH'
    });
  }
}

// Exportar instância única
export const anomalyService = new AnomalyService();