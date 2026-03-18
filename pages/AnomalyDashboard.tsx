import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Edit3,
  ChevronRight,
  Shield,
  ShieldAlert,
  ShieldOff,
  BarChart3,
  Users,
  Building2,
  Search,
  X,
  ChevronDown,
  Eye,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import { User as UserType, Department, TimeLog } from '../types';
import { correctUnclosedSession, isAnomalyCheckout } from '../utils/sessionChecker';

interface Anomaly {
  id: string; // UUID em vez de number
  user_id: number;
  date: string; // Usar 'date' que é o nome real da coluna
  type: string; // Simplificado para string
  description: string;
  severity: string; // Simplificado para string
  status: string; // Simplificado para string
  time_log_id?: string; // UUID em vez de number
  detected_at: string;
  detected_by: string | number;
  resolved_by?: number;
  resolved_at?: string;
  resolution?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    department: string;
    photoUrl?: string;
  };
  time_log?: {
    id: number;
    date: string;
    checkIn: string;
    checkOut?: string;
    totalHours?: number;
  };
}

interface AnomalyDashboardProps {
  currentUser: UserType | null;
  users: UserType[];
  departments: Department[];
}

const AnomalyDashboard: React.FC<AnomalyDashboardProps> = ({ currentUser, users, departments }) => {
  const { addToast } = useToast();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [filterType, setFilterType] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [searchTerm, setSearchTerm] = useState('');

  // Correction Modal
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctTime, setCorrectTime] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch anomalies
  const fetchAnomalies = async () => {
    try {
      setLoading(true);

      // First, check if anomalies table exists
      const { data: testData, error: testError } = await supabase
        .from('anomalies')
        .select('id')
        .limit(1);

      // If table doesn't exist, use empty array
      if (testError && testError.message.includes('relation')) {
        console.warn('Anomalies table not found, using empty dataset');
        setAnomalies([]);
        setLoading(false);
        return;
      }

      // Build query - simplificado para evitar problemas com foreign keys
      let query = supabase
        .from('anomalies')
        .select('*')
        .order('detected_at', { ascending: false });

      // Apply filters
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      if (filterType) {
        query = query.eq('type', filterType);
      }
      if (filterSeverity) {
        query = query.eq('severity', filterSeverity);
      }

      // Date range filter - FIXED: usar datas independentes
      if (filterDateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('date', today);
      } else if (filterDateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('detected_at', weekAgo.toISOString());
      } else if (filterDateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('detected_at', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map anomalies with user data if available
      let enrichedData = data || [];

      // Try to enrich with user data if we have users
      if (users && users.length > 0) {
        enrichedData = enrichedData.map(anomaly => {
          const user = users.find(u => u.id === anomaly.user_id);
          return {
            ...anomaly,
            user: user ? {
              id: user.id,
              name: user.name,
              email: user.email,
              department: user.department,
              photoUrl: user.photoUrl
            } : null
          };
        });
      }

      // Additional filtering for department (if needed)
      let filteredData = enrichedData;
      if (filterDepartment) {
        filteredData = filteredData.filter(a => a.user?.department === filterDepartment);
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(a =>
          a.user?.name?.toLowerCase().includes(term) ||
          a.user?.email?.toLowerCase().includes(term) ||
          a.description?.toLowerCase().includes(term)
        );
      }

      setAnomalies(filteredData);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      addToast('error', 'Erro ao carregar anomalias');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [filterStatus, filterType, filterSeverity, filterDepartment, filterDateRange]);

  // Statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = anomalies.length;
    const pending = anomalies.filter(a => a.status === 'PENDING').length;
    const awaitingJustification = anomalies.filter(a => a.status === 'AWAITING_JUSTIFICATION').length;
    const resolved = anomalies.filter(a => a.status === 'RESOLVED').length;
    const critical = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;

    // CRITICAL: Alertas críticos de hoje
    const todayCritical = anomalies.filter(a =>
      a.date === today &&
      a.severity === 'CRITICAL' &&
      (a.status === 'PENDING' || a.status === 'AWAITING_JUSTIFICATION')
    ).length;

    // Trend calculation (compare to previous period)
    const halfPeriod = new Date();
    if (filterDateRange === 'week') {
      halfPeriod.setDate(halfPeriod.getDate() - 3.5);
    } else if (filterDateRange === 'month') {
      halfPeriod.setDate(halfPeriod.getDate() - 15);
    }

    const recentAnomalies = anomalies.filter(a => new Date(a.detected_at) > halfPeriod).length;
    const oldAnomalies = total - recentAnomalies;
    const trend = oldAnomalies > 0 ? ((recentAnomalies - oldAnomalies) / oldAnomalies) * 100 : 0;

    // By type
    const byType = {
      unclosed: anomalies.filter(a => a.type === 'UNCLOSED_SESSION').length,
      late: anomalies.filter(a => a.type === 'LATE_ENTRY').length,
      early: anomalies.filter(a => a.type === 'EARLY_EXIT').length,
      break: anomalies.filter(a => a.type === 'MISSING_BREAK').length,
      location: anomalies.filter(a => a.type === 'INVALID_LOCATION').length
    };

    // Most affected users
    const userCounts = anomalies.reduce((acc, a) => {
      if (a.user) {
        acc[a.user.id] = (acc[a.user.id] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const topUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => {
        const user = anomalies.find(a => a.user?.id === parseInt(userId))?.user;
        return { user, count };
      });

    return {
      total,
      pending,
      awaitingJustification,
      resolved,
      critical,
      todayCritical, // ADICIONADO: alertas críticos de hoje
      trend,
      byType,
      topUsers,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0
    };
  }, [anomalies, filterDateRange]);

  // Request justification from user
  const handleRequestJustification = async (anomaly: Anomaly) => {
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({
          status: 'AWAITING_JUSTIFICATION'
        })
        .eq('id', anomaly.id);

      if (error) throw error;

      addToast('success', 'Justificação solicitada ao colaborador');
      fetchAnomalies();
    } catch (error) {
      console.error('Error requesting justification:', error);
      addToast('error', 'Erro ao solicitar justificação');
    }
  };

  // Accept/Dismiss anomaly (mark as resolved)
  const handleAcceptAnomaly = async (anomaly: Anomaly) => {
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({
          status: 'RESOLVED',
          resolved_by: currentUser?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', anomaly.id);

      if (error) throw error;

      addToast('success', 'Anomalia aceite e resolvida');
      fetchAnomalies();
    } catch (error) {
      console.error('Error accepting anomaly:', error);
      addToast('error', 'Erro ao aceitar anomalia: ' + (error as any).message);
    }
  };

  // Handle correction
  const handleCorrection = async () => {
    if (!selectedAnomaly || !correctTime || !justification.trim()) {
      addToast('error', 'Preencha todos os campos');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedAnomaly.type === 'UNCLOSED_SESSION' && selectedAnomaly.time_log_id) {
        // Use the session checker utility to correct
        const result = await correctUnclosedSession(
          selectedAnomaly.time_log_id,
          correctTime,
          currentUser?.id || 0,
          justification
        );

        if (result.success) {
          addToast('success', 'Anomalia corrigida com sucesso');
          setShowCorrectionModal(false);
          setSelectedAnomaly(null);
          setCorrectTime('');
          setJustification('');
          fetchAnomalies(); // Refresh
        } else {
          throw result.error;
        }
      } else {
        // Generic anomaly resolution
        const { error } = await supabase
          .from('anomalies')
          .update({
            status: 'RESOLVED',
            resolved_by: currentUser?.id,
            resolved_at: new Date().toISOString(),
            resolution: justification
          })
          .eq('id', selectedAnomaly.id);

        if (error) throw error;

        addToast('success', 'Anomalia resolvida com sucesso');
        setShowCorrectionModal(false);
        setSelectedAnomaly(null);
        setJustification('');
        fetchAnomalies();
      }
    } catch (error) {
      console.error('Error correcting anomaly:', error);
      addToast('error', 'Erro ao corrigir anomalia');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Colaborador', 'Departamento', 'Tipo', 'Descrição', 'Severidade', 'Status', 'Detetado Em', 'Resolvido Por', 'Resolução'];
    const rows = anomalies.map(a => [
      a.date,
      a.user?.name || 'N/A',
      a.user?.department || 'N/A',
      a.type,
      a.description,
      a.severity,
      a.status,
      new Date(a.detected_at).toLocaleString('pt-PT'),
      a.resolved_by ? users.find(u => u.id === a.resolved_by)?.name || 'N/A' : 'N/A',
      a.resolution || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anomalias_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'text-green-600 bg-green-50 border-green-200';
      case 'AWAITING_JUSTIFICATION': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'REJECTED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'UNCLOSED_SESSION': return <Clock size={14} />;
      case 'LATE_ENTRY': return <TrendingUp size={14} />;
      case 'EARLY_EXIT': return <TrendingDown size={14} />;
      case 'MISSING_BREAK': return <Calendar size={14} />;
      case 'INVALID_LOCATION': return <Shield size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'UNCLOSED_SESSION': return 'Sessão Não Encerrada';
      case 'MISSING_PUNCH': return 'Falta de Marcação';
      case 'LATE_ARRIVAL': return 'Chegada Tardia';
      case 'LATE_ENTRY': return 'Entrada Tardia';
      case 'EARLY_EXIT': return 'Saída Antecipada';
      case 'EARLY_DEPARTURE': return 'Saída Antecipada';
      case 'EXCESSIVE_OVERTIME': return 'Horas Extras';
      case 'EXCESSIVE_BREAK': return 'Pausa Longa';
      case 'MISSING_BREAK': return 'Pausa Não Registada';
      case 'INVALID_LOCATION': return 'Localização Inválida';
      case 'UNAUTHORIZED_ACCESS': return 'Acesso Não Autorizado';
      default: return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
      <Header
        title="Dashboard de Anomalias"
        subtitle="Gestão e correção de irregularidades no controlo de assiduidade"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <BarChart3 size={16} className="text-blue-600 sm:w-5 sm:h-5" />
            </div>
            <div className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold ${stats.trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {stats.trend > 0 ? <TrendingUp size={10} className="sm:w-3 sm:h-3" /> : <TrendingDown size={10} className="sm:w-3 sm:h-3" />}
              {Math.abs(stats.trend).toFixed(1)}%
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-[10px] sm:text-xs text-gray-500">Total</div>
        </div>

        {/* CRÍTICO: Alertas de hoje */}
        <div className={`rounded-lg sm:rounded-xl shadow-sm border p-3 sm:p-4 ${stats.todayCritical > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`p-1.5 sm:p-2 rounded-lg ${stats.todayCritical > 0 ? 'bg-red-200 animate-pulse' : 'bg-red-100'}`}>
              <ShieldAlert size={16} className="text-red-600 sm:w-5 sm:h-5" />
            </div>
            {stats.todayCritical > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-red-600 px-2 py-0.5 bg-red-100 rounded-full">
                HOJE
              </span>
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${stats.todayCritical > 0 ? 'text-red-700' : 'text-gray-900'}`}>
            {stats.todayCritical}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500">Críticas Hoje</div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg">
              <Clock size={16} className="text-yellow-600 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pending}</div>
          <div className="text-[10px] sm:text-xs text-gray-500">Pendentes</div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
              <AlertTriangle size={16} className="text-orange-600 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.awaitingJustification}</div>
          <div className="text-[10px] sm:text-xs text-gray-500">Aguardando</div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
              <ShieldAlert size={16} className="text-red-600 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.critical}</div>
          <div className="text-[10px] sm:text-xs text-gray-500">Críticas</div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
              <CheckCircle2 size={16} className="text-green-600 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.resolutionRate.toFixed(1)}%</div>
          <div className="text-[10px] sm:text-xs text-gray-500">Resolução</div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* By Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Por Tipo</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Sessões não encerradas</span>
              <span className="font-bold">{stats.byType.unclosed}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Entradas tardias</span>
              <span className="font-bold">{stats.byType.late}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Saídas antecipadas</span>
              <span className="font-bold">{stats.byType.early}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Pausas não registadas</span>
              <span className="font-bold">{stats.byType.break}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Localização inválida</span>
              <span className="font-bold">{stats.byType.location}</span>
            </div>
          </div>
        </div>

        {/* Top Affected Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Colaboradores Mais Afetados</h3>
          <div className="space-y-2">
            {stats.topUsers.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <img
                  src={item.user?.photoUrl || `https://ui-avatars.com/api/?name=${item.user?.name}`}
                  className="w-8 h-8 rounded-full"
                  alt=""
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-800">{item.user?.name}</p>
                  <p className="text-[10px] text-gray-500">{item.user?.department}</p>
                </div>
                <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded">
                  {item.count}
                </span>
              </div>
            ))}
            {stats.topUsers.length === 0 && (
              <p className="text-xs text-gray-400 italic">Sem dados disponíveis</p>
            )}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center justify-between mb-3">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm"
            >
              <option value="">Todos os Status</option>
              <option value="PENDING">Pendente</option>
              <option value="AWAITING_JUSTIFICATION">Aguardando</option>
              <option value="RESOLVED">Resolvido</option>
              <option value="REJECTED">Rejeitado</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm"
            >
              <option value="">Todos os Tipos</option>
              <option value="UNCLOSED_SESSION">Sessão Não Encerrada</option>
              <option value="LATE_ENTRY">Entrada Tardia</option>
              <option value="EARLY_EXIT">Saída Antecipada</option>
              <option value="MISSING_BREAK">Pausa Não Registada</option>
              <option value="INVALID_LOCATION">Localização Inválida</option>
            </select>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm"
            >
              <option value="">Todas as Severidades</option>
              <option value="CRITICAL">Crítica</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </select>

            {/* Department Filter - hide on mobile, show on tablet+ */}
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="hidden sm:block px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm"
            >
              <option value="">Todos os Departamentos</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* Actions - show inline on desktop */}
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => { setRefreshing(true); fetchAnomalies(); }}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={exportToCSV}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Exportar para CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Date Range - full width on mobile */}
        <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg mb-3">
          {(['today', 'week', 'month', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setFilterDateRange(range)}
              className={`flex-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all ${
                filterDateRange === range
                  ? 'bg-white shadow-sm text-brand-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range === 'today' ? 'Hoje' : range === 'week' ? 'Semana' : range === 'month' ? 'Mês' : 'Tudo'}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
          />
        </div>

        {/* Mobile actions */}
        <div className="flex sm:hidden gap-2 mt-3 justify-end">
          <button
            onClick={() => { setRefreshing(true); fetchAnomalies(); }}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportToCSV}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Exportar para CSV"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={32} className="animate-spin mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500">A carregar anomalias...</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
            <p className="text-lg font-semibold text-gray-700 mb-1">Sem anomalias encontradas</p>
            <p className="text-sm text-gray-500">Não existem anomalias com os filtros selecionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Colaborador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Severidade</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {anomalies.map((anomaly) => (
                  <tr key={anomaly.id} className="hover:bg-gray-50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      {anomaly.user ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={anomaly.user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(anomaly.user.name)}`}
                            className="w-8 h-8 rounded-full"
                            alt=""
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{anomaly.user.name}</p>
                            <p className="text-xs text-gray-500">{anomaly.user.department || 'Sem departamento'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={14} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-500">Utilizador Desconhecido</p>
                            <p className="text-xs text-gray-400">ID: {anomaly.user_id}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-700">
                        {new Date(anomaly.date).toLocaleDateString('pt-PT')}
                      </p>
                      {anomaly.time_log && (
                        <p className="text-xs text-gray-500">
                          {anomaly.time_log.checkIn} - {anomaly.time_log.checkOut || '??:??'}
                        </p>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{getTypeIcon(anomaly.type)}</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {getTypeLabel(anomaly.type)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 mt-0.5 ml-6">
                          {anomaly.type}
                        </span>
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity === 'CRITICAL' && <ShieldOff size={10} />}
                        {anomaly.severity === 'HIGH' && <ShieldAlert size={10} />}
                        {anomaly.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(anomaly.status)}`}>
                        {anomaly.status === 'RESOLVED' && <CheckCircle2 size={10} />}
                        {anomaly.status === 'PENDING' && <Clock size={10} />}
                        {anomaly.status === 'AWAITING_JUSTIFICATION' && <AlertTriangle size={10} />}
                        {anomaly.status === 'RESOLVED' ? 'Resolvido' :
                         anomaly.status === 'PENDING' ? 'Pendente' :
                         anomaly.status === 'AWAITING_JUSTIFICATION' ? 'Aguardando' :
                         anomaly.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {anomaly.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleRequestJustification(anomaly)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                              title="Pedir Justificação"
                            >
                              <MessageSquare size={12} />
                              <span>Justificar</span>
                            </button>
                            <button
                              onClick={() => handleAcceptAnomaly(anomaly)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                              title="Aceitar Anomalia"
                            >
                              <ThumbsUp size={12} />
                              <span>Aceitar</span>
                            </button>
                          </>
                        )}
                        {anomaly.status === 'AWAITING_JUSTIFICATION' && (
                          <button
                            onClick={() => handleAcceptAnomaly(anomaly)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                            title="Aceitar Anomalia"
                          >
                            <ThumbsUp size={12} />
                            <span>Aceitar</span>
                          </button>
                        )}
                        {anomaly.status === 'RESOLVED' && (
                          <span className="text-xs text-gray-500 italic">Resolvida</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Correction Modal */}
      {showCorrectionModal && selectedAnomaly && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedAnomaly.type === 'UNCLOSED_SESSION' ? 'Corrigir Sessão' : 'Resolver Anomalia'}
                </h3>
                <button
                  onClick={() => {
                    setShowCorrectionModal(false);
                    setSelectedAnomaly(null);
                    setCorrectTime('');
                    setJustification('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Anomaly Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={selectedAnomaly.user?.photoUrl || `https://ui-avatars.com/api/?name=${selectedAnomaly.user?.name}`}
                    className="w-10 h-10 rounded-full"
                    alt=""
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{selectedAnomaly.user?.name}</p>
                    <p className="text-xs text-gray-500">{selectedAnomaly.user?.department}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data:</span>
                    <span className="font-semibold">{new Date(selectedAnomaly.date).toLocaleDateString('pt-PT')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo:</span>
                    <span className="font-semibold">{getTypeLabel(selectedAnomaly.type)}</span>
                  </div>
                  {selectedAnomaly.time_log && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Entrada:</span>
                        <span className="font-semibold">{selectedAnomaly.time_log.checkIn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Saída:</span>
                        <span className={`font-semibold ${isAnomalyCheckout(selectedAnomaly.time_log.checkOut) ? 'text-red-600' : ''}`}>
                          {selectedAnomaly.time_log.checkOut || '--:--'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Correction Form */}
              <div className="space-y-4">
                {selectedAnomaly.type === 'UNCLOSED_SESSION' && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                      Hora de Saída Correta
                    </label>
                    <input
                      type="time"
                      value={correctTime}
                      onChange={(e) => setCorrectTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
                      placeholder="HH:MM"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Insira a hora correta de saída do colaborador
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Justificação / Resolução *
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none resize-none"
                    placeholder="Descreva a correção ou resolução aplicada..."
                  />
                </div>
              </div>
            </div>

            <div className="flex border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCorrectionModal(false);
                  setSelectedAnomaly(null);
                  setCorrectTime('');
                  setJustification('');
                }}
                className="flex-1 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleCorrection}
                disabled={
                  isSubmitting ||
                  !justification.trim() ||
                  (selectedAnomaly.type === 'UNCLOSED_SESSION' && !correctTime)
                }
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors border-l border-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'A processar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnomalyDashboard;