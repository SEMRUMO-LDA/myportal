import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  Filter,
  Search,
  ChevronRight,
  Eye,
  Check,
  X,
  MessageSquare,
  CalendarDays,
  UserCheck,
  UserX,
  Activity,
  DollarSign,
  FileText,
  Download,
  RefreshCw,
  Zap,
  ChevronDown,
  Info,
  Briefcase,
  Home,
  Heart,
  GraduationCap,
  Baby,
  Stethoscope,
  MapPin,
  Timer,
  CheckSquare
} from 'lucide-react';
import { User, Leave, LeaveType, Department } from '../types';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';

interface LeaveRequest extends Leave {
  user?: User;
  approver?: User;
  type_details?: LeaveType;
}

interface LeaveManagementProps {
  currentUser: User | null;
  users: User[];
  departments: Department[];
  leaveTypes: LeaveType[];
}

// Helper function to get leave type icon
const getLeaveTypeIcon = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'VACATION':
    case 'FERIAS':
      return <Briefcase className="w-4 h-4" />;
    case 'SICK':
    case 'MEDICAL':
    case 'BAIXA':
      return <Stethoscope className="w-4 h-4" />;
    case 'PERSONAL':
    case 'PESSOAL':
      return <Home className="w-4 h-4" />;
    case 'MATERNITY':
    case 'MATERNIDADE':
      return <Baby className="w-4 h-4" />;
    case 'PATERNITY':
    case 'PATERNIDADE':
      return <Heart className="w-4 h-4" />;
    case 'TRAINING':
    case 'FORMACAO':
      return <GraduationCap className="w-4 h-4" />;
    default:
      return <Calendar className="w-4 h-4" />;
  }
};

// Helper to calculate business days
const calculateBusinessDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const LeaveManagementEnhanced: React.FC<LeaveManagementProps> = ({
  currentUser,
  users,
  departments,
  leaveTypes
}) => {
  const { addToast } = useToast();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeaves, setSelectedLeaves] = useState<number[]>([]);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'pending_manager' | 'pending_hr' | 'approved'>('all');
  const [filterType, setFilterType] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showOnlyUrgent, setShowOnlyUrgent] = useState(false);

  // View modes
  const [viewMode, setViewMode] = useState<'cards' | 'calendar' | 'timeline'>('cards');

  // Quick action states
  const [processingIds, setProcessingIds] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch leaves
  const fetchLeaves = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('leaves')
        .select(`
          *,
          user:users!leaves_userId_fkey (
            id,
            name,
            email,
            department,
            photoUrl
          )
        `)
        .order('startDate', { ascending: false });

      // Apply date range filter
      if (filterDateRange !== 'all') {
        const now = new Date();
        let dateLimit = new Date();

        if (filterDateRange === 'today') {
          dateLimit = now;
        } else if (filterDateRange === 'week') {
          dateLimit.setDate(now.getDate() + 7);
        } else if (filterDateRange === 'month') {
          dateLimit.setMonth(now.getMonth() + 1);
        }

        query = query.lte('startDate', dateLimit.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with leave type details
      const enrichedData = (data || []).map(leave => ({
        ...leave,
        type_details: leaveTypes.find(lt => lt.id === leave.typeId)
      }));

      setLeaves(enrichedData);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      addToast('error', 'Erro ao carregar ausências');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Filter leaves based on current filters
  const filteredLeaves = useMemo(() => {
    let filtered = [...leaves];

    // Tab filter
    if (activeTab === 'pending_manager') {
      filtered = filtered.filter(l => l.status === 'PENDING');
    } else if (activeTab === 'pending_hr') {
      filtered = filtered.filter(l => l.status === 'APPROVED_MANAGER');
    } else if (activeTab === 'approved') {
      filtered = filtered.filter(l => l.status === 'APPROVED');
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(l => l.typeId === parseInt(filterType));
    }

    // Department filter
    if (filterDepartment) {
      filtered = filtered.filter(l => l.user?.department === filterDepartment);
    }

    // Urgent filter (starting in next 7 days)
    if (showOnlyUrgent) {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      filtered = filtered.filter(l => new Date(l.startDate) <= weekFromNow);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.user?.name.toLowerCase().includes(term) ||
        l.user?.email.toLowerCase().includes(term) ||
        l.reason?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [leaves, activeTab, filterType, filterDepartment, showOnlyUrgent, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthLeaves = leaves.filter(l => {
      const leaveDate = new Date(l.startDate);
      return leaveDate.getMonth() === currentMonth && leaveDate.getFullYear() === currentYear;
    });

    const pendingTotal = leaves.filter(l => l.status === 'PENDING' || l.status === 'APPROVED_MANAGER').length;
    const pendingManager = leaves.filter(l => l.status === 'PENDING').length;
    const pendingHR = leaves.filter(l => l.status === 'APPROVED_MANAGER').length;

    // Calculate absenteeism rate
    const totalWorkDays = 22; // Average work days per month
    const totalEmployees = users.filter(u => u.status === 'ACTIVE').length;
    const totalPossibleDays = totalWorkDays * totalEmployees;
    const totalAbsentDays = monthLeaves.reduce((sum, l) => {
      if (l.status === 'APPROVED') {
        return sum + calculateBusinessDays(l.startDate, l.endDate);
      }
      return sum;
    }, 0);
    const absenteeismRate = totalPossibleDays > 0 ? (totalAbsentDays / totalPossibleDays) * 100 : 0;

    // Calculate costs (estimated)
    const avgDailyCost = 100; // EUR per day (configurable)
    const estimatedCost = totalAbsentDays * avgDailyCost;

    // Today's absences
    const todayAbsences = leaves.filter(l => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      return now >= start && now <= end && l.status === 'APPROVED';
    });

    // Trend (compare to last month)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthLeaves = leaves.filter(l => {
      const leaveDate = new Date(l.startDate);
      return leaveDate >= lastMonth && leaveDate <= lastMonthEnd;
    });
    const trend = lastMonthLeaves.length > 0
      ? ((monthLeaves.length - lastMonthLeaves.length) / lastMonthLeaves.length) * 100
      : 0;

    return {
      pendingTotal,
      pendingManager,
      pendingHR,
      todayAbsences: todayAbsences.length,
      monthTotal: monthLeaves.length,
      absenteeismRate,
      estimatedCost,
      trend
    };
  }, [leaves, users]);

  // Quick approve/reject
  const handleQuickAction = async (leaveId: number, action: 'approve' | 'reject', reason?: string) => {
    setProcessingIds(prev => [...prev, leaveId]);

    try {
      const leave = leaves.find(l => l.id === leaveId);
      if (!leave) return;

      let newStatus = leave.status;
      if (action === 'approve') {
        if (leave.status === 'PENDING') {
          newStatus = 'APPROVED_MANAGER';
        } else if (leave.status === 'APPROVED_MANAGER') {
          newStatus = 'APPROVED';
        }
      } else {
        newStatus = 'REJECTED';
      }

      const { error } = await supabase
        .from('leaves')
        .update({
          status: newStatus,
          approvedBy: currentUser?.id,
          approvalDate: new Date().toISOString(),
          rejectionReason: action === 'reject' ? reason : null
        })
        .eq('id', leaveId);

      if (error) throw error;

      // Update local state
      setLeaves(prev => prev.map(l =>
        l.id === leaveId
          ? { ...l, status: newStatus, approvedBy: currentUser?.id }
          : l
      ));

      addToast('success', `Ausência ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso`);

      // Send notification to employee
      const notification = {
        sender_id: currentUser?.id || 'SYSTEM',
        receiver_id: leave.userId,
        subject: `Ausência ${action === 'approve' ? 'Aprovada' : 'Rejeitada'}`,
        content: `A sua ausência de ${new Date(leave.startDate).toLocaleDateString('pt-PT')} a ${new Date(leave.endDate).toLocaleDateString('pt-PT')} foi ${action === 'approve' ? 'aprovada' : 'rejeitada'}.${action === 'reject' && reason ? ` Motivo: ${reason}` : ''}`,
        date: new Date().toISOString(),
        read: false,
        priority: action === 'reject' ? 'HIGH' : 'NORMAL'
      };

      await supabase.from('internal_messages').insert(notification);

    } catch (error) {
      console.error('Error processing leave:', error);
      addToast('error', 'Erro ao processar ausência');
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== leaveId));
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedLeaves.length === 0) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja ${action === 'approve' ? 'aprovar' : 'rejeitar'} ${selectedLeaves.length} ausência(s)?`
    );

    if (!confirmed) return;

    setProcessingIds(selectedLeaves);

    let successCount = 0;
    for (const leaveId of selectedLeaves) {
      try {
        await handleQuickAction(leaveId, action);
        successCount++;
      } catch (error) {
        console.error(`Error processing leave ${leaveId}:`, error);
      }
    }

    addToast(
      'success',
      `${successCount} de ${selectedLeaves.length} ausências processadas com sucesso`
    );

    setSelectedLeaves([]);
    setShowBulkActions(false);
    setProcessingIds([]);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'APPROVED_MANAGER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'APPROVED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Aguarda Gestor';
      case 'APPROVED_MANAGER':
        return 'Aguarda RH';
      case 'APPROVED':
        return 'Aprovado';
      case 'REJECTED':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Nome', 'Departamento', 'Tipo', 'Início', 'Fim', 'Dias Úteis', 'Estado', 'Aprovado Por', 'Data Aprovação'];
    const rows = filteredLeaves.map(leave => [
      leave.user?.name || 'N/A',
      leave.user?.department || 'N/A',
      leave.type_details?.name || 'N/A',
      new Date(leave.startDate).toLocaleDateString('pt-PT'),
      new Date(leave.endDate).toLocaleDateString('pt-PT'),
      calculateBusinessDays(leave.startDate, leave.endDate),
      getStatusLabel(leave.status),
      leave.approvedBy ? users.find(u => u.id === leave.approvedBy)?.name || 'N/A' : 'N/A',
      leave.approvalDate ? new Date(leave.approvalDate).toLocaleDateString('pt-PT') : 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ausencias_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Header
        title="Gestão de Ausências"
        subtitle="Aprovação e análise de ausências da equipa"
      />

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Pending Approvals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">PENDENTES</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingTotal}</p>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-yellow-600">
                  {stats.pendingManager} Gestor
                </span>
                <span className="text-xs text-purple-600">
                  {stats.pendingHR} RH
                </span>
              </div>
            </div>
            {stats.pendingTotal > 0 && (
              <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* Today Absences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">HOJE AUSENTES</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.todayAbsences}</p>
              <p className="text-xs text-gray-500 mt-1">colaboradores</p>
            </div>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        {/* Absenteeism Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">TAXA ABSENTISMO</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.absenteeismRate.toFixed(1)}%</p>
              <div className="flex items-center gap-1 mt-1">
                {stats.trend > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-500">+{stats.trend.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">{stats.trend.toFixed(1)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">CUSTO ESTIMADO</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">€{stats.estimatedCost.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">este mês</p>
            </div>
            <Info className="w-4 h-4 text-gray-400" title="Baseado em custo médio diário" />
          </div>
        </div>
      </div>

      {/* Filters and Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg h-fit">
            {[
              { id: 'all', label: 'Todos', count: leaves.length },
              { id: 'pending_manager', label: 'Aguarda Gestor', count: stats.pendingManager },
              { id: 'pending_hr', label: 'Aguarda RH', count: stats.pendingHR },
              { id: 'approved', label: 'Aprovados', count: leaves.filter(l => l.status === 'APPROVED').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-1 gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
            >
              <option value="">Todos os tipos</option>
              {leaveTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
            >
              <option value="">Todos os departamentos</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>

            {/* Quick Filters */}
            <button
              onClick={() => setShowOnlyUrgent(!showOnlyUrgent)}
              className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showOnlyUrgent
                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              Urgentes
            </button>

            {/* View Mode */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'cards' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                  viewMode === 'calendar' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600'
                }`}
              >
                Calendário
              </button>
            </div>

            {/* Export */}
            <button
              onClick={exportToCSV}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedLeaves.length > 0 && (
          <div className="mt-4 p-3 bg-brand-50 rounded-lg flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-brand-600" />
              <span className="text-sm font-medium text-brand-700">
                {selectedLeaves.length} ausência(s) selecionada(s)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4 inline mr-1" />
                Aprovar Todas
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <X className="w-4 h-4 inline mr-1" />
                Rejeitar Todas
              </button>
              <button
                onClick={() => setSelectedLeaves([])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">A carregar ausências...</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="p-6">
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma ausência encontrada</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredLeaves.map(leave => {
                  const isProcessing = processingIds.includes(leave.id);
                  const isSelected = selectedLeaves.includes(leave.id);
                  const isUrgent = new Date(leave.startDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  const businessDays = calculateBusinessDays(leave.startDate, leave.endDate);

                  return (
                    <div
                      key={leave.id}
                      className={`relative bg-white rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                        isSelected ? 'border-brand-500 bg-brand-50' : 'border-gray-200'
                      } ${isProcessing ? 'opacity-50' : ''}`}
                    >
                      {/* Selection Checkbox */}
                      {(leave.status === 'PENDING' || leave.status === 'APPROVED_MANAGER') && (
                        <div className="absolute top-4 left-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeaves(prev => [...prev, leave.id]);
                              } else {
                                setSelectedLeaves(prev => prev.filter(id => id !== leave.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            disabled={isProcessing}
                          />
                        </div>
                      )}

                      <div className="flex items-start gap-4 ml-8">
                        {/* User Info */}
                        <img
                          src={leave.user?.photoUrl || `https://ui-avatars.com/api/?name=${leave.user?.name}`}
                          alt=""
                          className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                        />

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">{leave.user?.name}</h3>
                              <p className="text-sm text-gray-500">{leave.user?.department}</p>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-2">
                              {isUrgent && leave.status === 'PENDING' && (
                                <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-200">
                                  <Timer className="w-3 h-3 inline mr-1" />
                                  Urgente
                                </span>
                              )}
                              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(leave.status)}`}>
                                {getStatusLabel(leave.status)}
                              </span>
                            </div>
                          </div>

                          {/* Leave Details */}
                          <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                            <div className="flex items-center gap-1.5">
                              {getLeaveTypeIcon(leave.type_details?.name)}
                              <span className="font-medium text-gray-700">{leave.type_details?.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <CalendarDays className="w-4 h-4" />
                              <span>
                                {new Date(leave.startDate).toLocaleDateString('pt-PT')} -
                                {new Date(leave.endDate).toLocaleDateString('pt-PT')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                {businessDays} {businessDays === 1 ? 'dia útil' : 'dias úteis'}
                              </span>
                            </div>
                          </div>

                          {/* Reason */}
                          {leave.reason && (
                            <p className="text-sm text-gray-600 mb-3 italic">
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              {leave.reason}
                            </p>
                          )}

                          {/* Approval Info */}
                          {leave.approvedBy && (
                            <div className="text-xs text-gray-500 mb-3">
                              <UserCheck className="w-3 h-3 inline mr-1" />
                              Aprovado por {users.find(u => u.id === leave.approvedBy)?.name} em {' '}
                              {leave.approvalDate && new Date(leave.approvalDate).toLocaleDateString('pt-PT')}
                            </div>
                          )}

                          {/* Quick Actions */}
                          {(leave.status === 'PENDING' || leave.status === 'APPROVED_MANAGER') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleQuickAction(leave.id, 'approve')}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Check className="w-4 h-4 inline mr-1" />
                                Aprovar
                              </button>
                              <button
                                onClick={() => {
                                  const reason = window.prompt('Motivo da rejeição:');
                                  if (reason) {
                                    handleQuickAction(leave.id, 'reject', reason);
                                  }
                                }}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <X className="w-4 h-4 inline mr-1" />
                                Rejeitar
                              </button>
                              <button
                                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                              >
                                <Eye className="w-4 h-4 inline mr-1" />
                                Detalhes
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Calendar View Placeholder */
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Vista de calendário em desenvolvimento</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagementEnhanced;