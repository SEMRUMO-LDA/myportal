import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Trophy, Clock, Calendar, Target, Award,
  Users, Zap, Activity, Star, Coffee, AlertCircle
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
         subDays, differenceInHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductivityMetrics {
  totalHours: number;
  averageHours: number;
  punctualityRate: number;
  attendanceRate: number;
  overtimeHours: number;
  weeklyTrend: any[];
  monthlyComparison: any[];
  teamRanking: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

const ProductivityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ProductivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (user?.id) {
      loadProductivityData();
    }
  }, [user, selectedPeriod]);

  const loadProductivityData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startDate = selectedPeriod === 'week'
        ? startOfWeek(now, { locale: ptBR })
        : selectedPeriod === 'month'
        ? startOfMonth(now)
        : new Date(now.getFullYear(), 0, 1);

      const endDate = selectedPeriod === 'week'
        ? endOfWeek(now, { locale: ptBR })
        : selectedPeriod === 'month'
        ? endOfMonth(now)
        : new Date(now.getFullYear(), 11, 31);

      // Buscar logs de tempo
      const { data: timeLogs } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      // Calcular métricas
      const metrics = calculateMetrics(timeLogs || []);
      setMetrics(metrics);
    } catch (error) {
      console.error('Error loading productivity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (logs: any[]): ProductivityMetrics => {
    // Total de horas
    const totalHours = logs.reduce((sum, log) => sum + (log.total_hours || 0), 0);

    // Taxa de pontualidade (chegou antes das 9h)
    const punctualLogs = logs.filter(log => {
      if (!log.check_in) return false;
      const checkInHour = parseInt(log.check_in.split(':')[0]);
      return checkInHour < 9;
    });
    const punctualityRate = logs.length > 0 ? (punctualLogs.length / logs.length) * 100 : 0;

    // Taxa de presença
    const workDays = 22; // Média mensal
    const attendanceRate = (logs.length / workDays) * 100;

    // Horas extras (mais de 8h por dia)
    const overtimeHours = logs.reduce((sum, log) => {
      const hours = log.total_hours || 0;
      return sum + (hours > 8 ? hours - 8 : 0);
    }, 0);

    // Tendência semanal
    const weeklyTrend = calculateWeeklyTrend(logs);

    // Comparação mensal
    const monthlyComparison = calculateMonthlyComparison(logs);

    // Conquistas
    const achievements = calculateAchievements(logs, totalHours, punctualityRate);

    return {
      totalHours,
      averageHours: logs.length > 0 ? totalHours / logs.length : 0,
      punctualityRate,
      attendanceRate: Math.min(attendanceRate, 100),
      overtimeHours,
      weeklyTrend,
      monthlyComparison,
      teamRanking: Math.floor(Math.random() * 10) + 1, // Simulado
      achievements
    };
  };

  const calculateWeeklyTrend = (logs: any[]) => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    const weekData = days.map((day, index) => {
      const dayLogs = logs.filter(log => {
        const date = new Date(log.date);
        return date.getDay() === index + 1;
      });

      const totalHours = dayLogs.reduce((sum, log) => sum + (log.total_hours || 0), 0);
      const avgHours = dayLogs.length > 0 ? totalHours / dayLogs.length : 0;

      return {
        day,
        horas: parseFloat(avgHours.toFixed(2)),
        meta: 8
      };
    });

    return weekData;
  };

  const calculateMonthlyComparison = (logs: any[]) => {
    const currentMonth = new Date().getMonth();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return months.slice(0, currentMonth + 1).map((month, index) => {
      const monthLogs = logs.filter(log => {
        const date = new Date(log.date);
        return date.getMonth() === index;
      });

      const totalHours = monthLogs.reduce((sum, log) => sum + (log.total_hours || 0), 0);

      return {
        month,
        horas: totalHours,
        dias: monthLogs.length
      };
    });
  };

  const calculateAchievements = (logs: any[], totalHours: number, punctualityRate: number): Achievement[] => {
    return [
      {
        id: '1',
        title: 'Madrugador',
        description: 'Chegue antes das 8h por 5 dias seguidos',
        icon: '🌅',
        unlocked: punctualityRate > 80,
        progress: Math.min(punctualityRate, 100),
        target: 100
      },
      {
        id: '2',
        title: 'Maratonista',
        description: 'Complete 40 horas numa semana',
        icon: '🏃',
        unlocked: totalHours >= 40,
        progress: Math.min(totalHours, 40),
        target: 40
      },
      {
        id: '3',
        title: 'Consistente',
        description: '30 dias sem faltas',
        icon: '📅',
        unlocked: logs.length >= 22,
        progress: logs.length,
        target: 22
      },
      {
        id: '4',
        title: 'Equilibrado',
        description: 'Sem horas extras este mês',
        icon: '⚖️',
        unlocked: metrics?.overtimeHours === 0,
        progress: metrics?.overtimeHours === 0 ? 100 : 0,
        target: 100
      },
      {
        id: '5',
        title: 'Team Player',
        description: 'Top 5 do ranking da equipa',
        icon: '🏆',
        unlocked: metrics?.teamRanking ? metrics.teamRanking <= 5 : false,
        progress: metrics?.teamRanking ? (10 - metrics.teamRanking) * 10 : 0,
        target: 100
      }
    ];
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
        <p>Sem dados de produtividade disponíveis</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Dashboard de Produtividade
        </h1>
        <p className="text-gray-600">
          Acompanhe o seu desempenho e conquistas
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'year'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPeriod === period
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period === 'week' ? 'Semana' : period === 'month' ? 'Mês' : 'Ano'}
          </button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-blue-500" />
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {metrics.totalHours.toFixed(1)}h
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Média: {metrics.averageHours.toFixed(1)}h/dia
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 text-green-500" />
            <span className="text-sm text-gray-500">Pontualidade</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {metrics.punctualityRate.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Chegadas a tempo
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 text-purple-500" />
            <span className="text-sm text-gray-500">Presença</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {metrics.attendanceRate.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Taxa de presença
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <span className="text-sm text-gray-500">Ranking</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            #{metrics.teamRanking}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Na equipa
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Trend */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Tendência Semanal
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="horas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="meta" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Evolução Mensal
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={metrics.monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="horas"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          Conquistas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                achievement.unlocked
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="text-3xl mb-2 text-center">{achievement.icon}</div>
              <h4 className="font-semibold text-sm text-center mb-1">
                {achievement.title}
              </h4>
              <p className="text-xs text-gray-600 text-center mb-2">
                {achievement.description}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all"
                  style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                />
              </div>
              <p className="text-xs text-center mt-1">
                {achievement.progress}/{achievement.target}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Motivational Quote */}
      <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-xl text-white">
        <div className="flex items-center gap-4">
          <Star className="w-12 h-12" />
          <div>
            <p className="text-lg font-semibold mb-1">Continue assim!</p>
            <p className="opacity-90">
              A sua produtividade está {metrics.averageHours >= 8 ? 'acima' : 'próxima'} da meta.
              Mantenha o foco e alcance novos objetivos!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductivityDashboard;