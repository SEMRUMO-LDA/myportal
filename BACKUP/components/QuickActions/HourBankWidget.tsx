import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, X } from 'lucide-react';
import { User } from '../../types';
import { supabase } from '../../services/supabaseClient';
import QuickActionCard from './QuickActionCard';

interface HourBankWidgetProps {
  user: User;
}

interface HourBankData {
  balance: number; // in minutes
  last30Days: { date: string; minutes: number }[];
  projection: number; // projected balance for next month
}

const HourBankWidget: React.FC<HourBankWidgetProps> = ({ user }) => {
  const [hourBank, setHourBank] = useState<HourBankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchHourBankData();
  }, [user.id]);

  const fetchHourBankData = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      // Get time logs for last 30 days
      const { data: logs, error: logsError } = await supabase
        .from('time_logs')
        .select('date, entry_time, exit_time, break_duration')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (logsError) throw logsError;

      // Calculate daily balances
      const dailyBalances: { date: string; minutes: number }[] = [];
      let cumulativeBalance = 0;

      (logs || []).forEach(log => {
        if (!log.entry_time || !log.exit_time) return;

        const entry = new Date(`${log.date}T${log.entry_time}`);
        const exit = new Date(`${log.date}T${log.exit_time}`);
        const workedMinutes = (exit.getTime() - entry.getTime()) / (1000 * 60);
        const breakMinutes = log.break_duration || 0;
        const netWorked = workedMinutes - breakMinutes;

        // Expected: 8 hours = 480 minutes
        const expectedMinutes = 480;
        const balance = netWorked - expectedMinutes;

        cumulativeBalance += balance;

        dailyBalances.push({
          date: log.date,
          minutes: cumulativeBalance
        });
      });

      // Calculate projection (average daily balance * 30)
      const avgDailyBalance = dailyBalances.length > 0
        ? cumulativeBalance / dailyBalances.length
        : 0;
      const projection = avgDailyBalance * 30;

      setHourBank({
        balance: cumulativeBalance,
        last30Days: dailyBalances,
        projection
      });
    } catch (error) {
      console.error('Error fetching hour bank data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (minutes: number): string => {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = Math.round(absMinutes % 60);
    const sign = minutes < 0 ? '-' : '+';
    return `${sign}${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const getBalanceColor = (minutes: number): string => {
    if (minutes > 0) return 'text-green-600';
    if (minutes < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getBalanceIcon = (minutes: number) => {
    if (minutes > 0) return <TrendingUp size={20} className="text-green-600" />;
    if (minutes < 0) return <TrendingDown size={20} className="text-red-600" />;
    return null;
  };

  if (loading) {
    return (
      <QuickActionCard
        icon={Clock}
        title="Banco de Horas"
        description="A carregar..."
        color="blue"
        onClick={() => {}}
        disabled
        loading
      />
    );
  }

  if (!hourBank) {
    return null;
  }

  const balanceFormatted = formatHours(hourBank.balance);
  const isPositive = hourBank.balance >= 0;

  return (
    <>
      <QuickActionCard
        icon={Clock}
        title="Banco de Horas"
        description={balanceFormatted}
        color={isPositive ? 'blue' : 'red'}
        badge={isPositive ? '✓' : '!'}
        onClick={() => setShowModal(true)}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center rounded-t-3xl">
              <h2 className="text-2xl font-bold text-gray-900">Banco de Horas</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Current Balance */}
              <div className={`bg-gradient-to-br ${isPositive ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-red-50 to-red-100 border-red-200'} border-2 rounded-2xl p-6 mb-6`}>
                <p className="text-sm font-semibold text-gray-600 mb-2">Saldo Atual</p>
                <div className="flex items-center gap-3">
                  {getBalanceIcon(hourBank.balance)}
                  <p className={`text-5xl font-black ${getBalanceColor(hourBank.balance)}`}>
                    {balanceFormatted}
                  </p>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  {isPositive
                    ? '✅ Tem horas a crédito no banco de horas'
                    : '⚠️ Tem horas em déficit no banco de horas'}
                </p>
              </div>

              {/* Projection */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  📊 Projeção para próximo mês
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatHours(hourBank.projection)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Baseado na média diária dos últimos 30 dias
                </p>
              </div>

              {/* Graph */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  Evolução (últimos 30 dias)
                </p>

                {hourBank.last30Days.length > 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="relative h-32">
                      {/* Y-axis (0 line) */}
                      <div className="absolute inset-x-0 top-1/2 border-t-2 border-gray-300 -translate-y-1/2"></div>

                      {/* Bars */}
                      <div className="flex items-end justify-between h-full gap-1">
                        {hourBank.last30Days.map((day, index) => {
                          const maxAbs = Math.max(
                            ...hourBank.last30Days.map(d => Math.abs(d.minutes))
                          );
                          const heightPercent = maxAbs > 0
                            ? (Math.abs(day.minutes) / maxAbs) * 100
                            : 0;
                          const isPositiveBar = day.minutes >= 0;

                          return (
                            <div
                              key={index}
                              className="relative flex-1 flex flex-col items-center justify-center"
                              style={{ height: '100%' }}
                            >
                              <div
                                className={`w-full ${isPositiveBar ? 'bg-blue-400' : 'bg-red-400'} rounded-sm transition-all hover:opacity-80`}
                                style={{
                                  height: `${heightPercent / 2}%`,
                                  [isPositiveBar ? 'marginBottom' : 'marginTop']: '50%'
                                }}
                                title={`${day.date}: ${formatHours(day.minutes)}`}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-400 rounded"></div>
                        <span>Crédito</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-400 rounded"></div>
                        <span>Déficit</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <p className="text-sm text-gray-500">
                      Sem dados suficientes para gerar gráfico
                    </p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">ℹ️ Como funciona:</span> O banco de horas calcula a diferença entre as horas trabalhadas e as 8 horas diárias esperadas. Valores positivos indicam horas extra, valores negativos indicam déficit.
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowModal(false)}
                className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HourBankWidget;
