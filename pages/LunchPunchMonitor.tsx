import React, { useState, useEffect } from 'react';
import { Coffee, AlertTriangle, TrendingDown, Users, CheckCircle, XCircle, Send, Info } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import Header from '../components/Header';
import { useToast } from '../context/ToastContext';

interface UserPattern {
  userId: number;
  userName: string;
  department: string;
  daysWith4Punches: number;
  daysWith2Punches: number;
  percent4Punches: number;
  last4PunchDate: string;
  trend: 'improving' | 'worsening' | 'stable';
}

const LunchPunchMonitor: React.FC = () => {
  const [users, setUsers] = useState<UserPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('lunch_pattern_analysis')
        .select('*')
        .order('days_with_4_punches', { ascending: false });

      if (error) throw error;

      if (data) {
        setUsers(data.map(u => ({
          userId: u.user_id,
          userName: u.user_name,
          department: u.department,
          daysWith4Punches: u.days_with_4_punches,
          daysWith2Punches: u.days_with_2_punches,
          percent4Punches: u.percent_4_punches,
          last4PunchDate: u.last_4_punch_date,
          trend: determineTrend(u)
        })));
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
      addToast('error', 'Erro ao carregar padrões de picagem');
    } finally {
      setLoading(false);
    }
  };

  const determineTrend = (user: any): 'improving' | 'worsening' | 'stable' => {
    // Logic to determine if user is improving
    const recentDates = user.dates_with_4_punches?.slice(0, 5) || [];
    if (recentDates.length < 2) return 'stable';

    const daysSinceLastError = Math.floor(
      (new Date().getTime() - new Date(user.last_4_punch_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastError > 7) return 'improving';
    if (daysSinceLastError <= 2) return 'worsening';
    return 'stable';
  };

  const handleSendReminder = async () => {
    if (selectedUsers.length === 0) {
      addToast('warning', 'Selecione pelo menos um colaborador');
      return;
    }

    setSending(true);
    try {
      // Send personalized reminders
      for (const userId of selectedUsers) {
        await supabase.from('internal_messages').insert({
          sender_id: 1, // Admin
          recipient_id: userId,
          subject: '📍 Lembrete: Sistema de Picagem Simplificado',
          message: `Detectámos que ainda está a fazer 4 picagens diárias.

Relembramos que o novo sistema requer apenas:
✅ 1 picagem de ENTRADA (manhã)
✅ 1 picagem de SAÍDA (tarde)

❌ NÃO precisa picar para almoço!

O sistema deduz automaticamente 1 hora de almoço.

Se continuar a picar 4 vezes, as picagens extras serão ignoradas automaticamente.

Obrigado pela compreensão!`,
          priority: 'HIGH',
          date: new Date().toISOString()
        });
      }

      addToast('success', `Lembretes enviados para ${selectedUsers.length} colaboradores`);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error sending reminders:', error);
      addToast('error', 'Erro ao enviar lembretes');
    } finally {
      setSending(false);
    }
  };

  const handleAutoFix = async () => {
    if (!confirm('Isto irá corrigir automaticamente todas as picagens dos últimos 30 dias. Continuar?')) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('fix_historical_lunch_punches');

      if (error) throw error;

      addToast('success', `Correções aplicadas com sucesso!`);
      fetchPatterns(); // Refresh data
    } catch (error) {
      console.error('Error fixing punches:', error);
      addToast('error', 'Erro ao aplicar correções');
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="text-green-500" size={16} />;
      case 'worsening':
        return <AlertTriangle className="text-red-500" size={16} />;
      default:
        return <Info className="text-gray-400" size={16} />;
    }
  };

  const stats = {
    total: users.length,
    stillUsing4: users.filter(u => u.percent4Punches > 50).length,
    improved: users.filter(u => u.trend === 'improving').length,
    needsAttention: users.filter(u => u.percent4Punches > 80).length
  };

  return (
    <div className="flex">
      <div className="flex-1">
        <Header title="Monitor de Picagens de Almoço" />

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Colaboradores</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Ainda 4 Picagens</p>
                  <p className="text-2xl font-bold text-red-700">{stats.stillUsing4}</p>
                </div>
                <XCircle className="text-red-500" size={32} />
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Melhoraram</p>
                  <p className="text-2xl font-bold text-green-700">{stats.improved}</p>
                </div>
                <CheckCircle className="text-green-500" size={32} />
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600">Atenção Urgente</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.needsAttention}</p>
                </div>
                <AlertTriangle className="text-amber-500" size={32} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between border border-blue-200">
            <div className="flex items-center gap-3">
              <Coffee className="text-blue-600" size={24} />
              <div>
                <p className="font-bold text-blue-900">Ações em Massa</p>
                <p className="text-sm text-blue-700">Corrigir problemas de picagem</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAutoFix}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle size={18} />
                Corrigir Histórico
              </button>
              <button
                onClick={handleSendReminder}
                disabled={selectedUsers.length === 0 || sending}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <Send size={18} />
                Enviar Lembrete ({selectedUsers.length})
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Padrões de Picagem por Colaborador</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(users.filter(u => u.percent4Punches > 50).map(u => u.userId));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Departamento</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">4 Picagens</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">2 Picagens</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">% Erro</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Tendência</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Último Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.userId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.userId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.userId]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.userId));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{user.userName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{user.department}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                            user.daysWith4Punches > 10 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.daysWith4Punches}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            {user.daysWith2Punches}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-full max-w-[60px] bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  user.percent4Punches > 70 ? 'bg-red-500' :
                                  user.percent4Punches > 30 ? 'bg-amber-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${user.percent4Punches}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-700">
                              {user.percent4Punches}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getTrendIcon(user.trend)}
                            <span className={`text-xs font-medium ${
                              user.trend === 'improving' ? 'text-green-600' :
                              user.trend === 'worsening' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {user.trend === 'improving' ? 'Melhorando' :
                               user.trend === 'worsening' ? 'Piorando' :
                               'Estável'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-gray-600">
                            {new Date(user.last4PunchDate).toLocaleDateString('pt-PT')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LunchPunchMonitor;