import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import QuorumAnalyzer, { calculateQuorum } from '../components/QuorumAnalyzer';
import { Leave, LeaveType, LeaveStatus, LeaveStatusLabels, User, Department, Location, Anomaly } from '../types';
import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Filter, ChevronRight, User as UserIcon, LayoutGrid, List, ChevronLeft, AlertTriangle, MapPin, Building2, Users, ArrowRight, ShieldCheck, FileText, MessageSquare } from 'lucide-react';
import { useVisibleUsers } from '../hooks/useVisibleUsers';

interface AbsenceManagementProps {
    leaves: Leave[];
    leaveTypes: LeaveType[];
    users: User[];
    departments: Department[];
    locations: Location[];
    anomalies?: Anomaly[];
    onUpdateAnomaly?: (anomaly: Anomaly) => void;
    onUpdateLeave: (leave: Leave) => void;
    onAddLeave?: (leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>) => void;
    currentUser: User | null;
}

const AbsenceManagement: React.FC<AbsenceManagementProps> = ({ leaves, leaveTypes, users, departments, locations, anomalies, onUpdateAnomaly, onUpdateLeave, onAddLeave, currentUser }) => {
    const [filterDepartment, setFilterDepartment] = useState<string>('');
    const [filterLocation, setFilterLocation] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');

    const routerLocation = useLocation();
    const [activeTab, setActiveTab] = useState<'LEAVES' | 'JUSTIFICATIONS'>('LEAVES');

    useEffect(() => {
        if (routerLocation.state && routerLocation.state.activeTab === 'JUSTIFICATIONS') {
            setActiveTab('JUSTIFICATIONS');
            // Clean up state so refresh doesn't force it open
            window.history.replaceState({}, document.title)
        }
    }, [routerLocation.state]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [expandedQuorum, setExpandedQuorum] = useState<number | null>(null);
    const [approvalStepFilter, setApprovalStepFilter] = useState<'ALL' | 'MANAGER' | 'HR' | 'DONE'>('ALL');

    // Centralized visibility logic
    const { visibleUsers, isFullAccess, isDepartmentManager, canInteractWith } = useVisibleUsers(currentUser, users, departments, locations);
    const isHR = isFullAccess || (currentUser?.role || '').toUpperCase() === 'RH' || (currentUser?.role || '').toUpperCase() === 'RECURSOS HUMANOS';

    // Get user info helper
    const getUserById = (userId: number) => users.find(u => u.id === userId);
    const getLeaveTypeById = (id: number) => leaveTypes.find(lt => lt.id === id);

    // Visible user IDs for fast filtering
    const visibleUserIds = useMemo(() => new Set(visibleUsers.map(u => u.id)), [visibleUsers]);

    // Filter leaves — only show leaves from visible users
    const filteredLeaves = useMemo(() => {
        return leaves.filter(leave => {
            // Only show leaves from users this person can see
            if (!visibleUserIds.has(leave.userId)) return false;

            const user = getUserById(leave.userId);
            if (!user) return false;

            const matchesDepartment = filterDepartment ? user.department === filterDepartment : true;
            const matchesLocation = filterLocation ? user.locationId === filterLocation : true;
            const matchesStatus = filterStatus === 'ALL' ? true : leave.status === filterStatus;

            // Approval step filter
            let matchesStep = true;
            if (approvalStepFilter === 'MANAGER') {
                matchesStep = leave.status === 'PENDING' && (!leave.approvalStep || leave.approvalStep === 'MANAGER');
            } else if (approvalStepFilter === 'HR') {
                matchesStep = leave.status === 'PENDING' && leave.approvalStep === 'HR';
            } else if (approvalStepFilter === 'DONE') {
                matchesStep = leave.status === 'APPROVED' || leave.status === 'REJECTED';
            }

            return matchesDepartment && matchesLocation && matchesStatus && matchesStep;
        }).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    }, [leaves, filterDepartment, filterLocation, filterStatus, visibleUserIds, approvalStepFilter]);

    // Added activeScope state mapping to the UI Scope Tabs
    const [activeScope, setActiveScope] = useState<'TEAM' | 'ALL'>('ALL');

    // STATS
    const pendingCount = filteredLeaves.filter(l => l.status === 'PENDING').length;
    const scopedPendingLeaves = leaves.filter(l => l.status === 'PENDING' && visibleUserIds.has(l.userId));
    const pendingManagerCount = scopedPendingLeaves.filter(l => !l.approvalStep || l.approvalStep === 'MANAGER').length;
    const pendingHRCount = scopedPendingLeaves.filter(l => l.approvalStep === 'HR').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAbsent = filteredLeaves.filter(l => {
        return l.status === 'APPROVED' && todayStr >= l.startDate && todayStr <= l.endDate;
    }).length;

    // ANOMALIES FILTERING
    const filteredAnomalies = useMemo(() => {
        return (anomalies || []).filter(anomaly => {
            if (!visibleUserIds.has(anomaly.userId)) return false;
            if (activeScope === 'TEAM' && !isFullAccess) {
                const user = getUserById(anomaly.userId);
                const dept = departments.find(d => d.name === user?.department);
                if (dept?.managerId !== currentUser?.id) return false;
            }
            if (filterStatus !== 'ALL') {
                if (filterStatus === 'PENDING' && anomaly.status !== 'JUSTIFIED_PENDING_REVIEW') return false;
                if (filterStatus === 'APPROVED' && anomaly.status !== 'JUSTIFIED_MANAGER') return false;
                if (filterStatus === 'REJECTED' && anomaly.status !== 'REJECTED') return false;
            }
            return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [anomalies, visibleUserIds, activeScope, isFullAccess, currentUser?.id, departments, filterStatus]);

    const pendingJustificationsCount = filteredAnomalies.filter(a => a.status === 'JUSTIFIED_PENDING_REVIEW').length;

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start
    };
    const changeMonth = (increment: number) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1));

    const isWithinRange = (date: Date, start: string, end: string) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const s = new Date(start);
        s.setHours(0, 0, 0, 0);
        const e = new Date(end);
        e.setHours(0, 0, 0, 0);
        return d >= s && d <= e;
    };

    // Get leave color from LeaveType
    const getLeaveColor = (leaveTypeId: number, status: LeaveStatus) => {
        const lt = getLeaveTypeById(leaveTypeId);
        const color = lt?.color || '#9CA3AF';
        const isPending = status === 'PENDING';
        const isRejected = status === 'REJECTED';
        return {
            bg: isPending ? `${color}20` : isRejected ? '#F3F4F6' : `${color}30`,
            border: isPending ? color : isRejected ? '#D1D5DB' : color,
            text: isRejected ? '#9CA3AF' : color,
            solid: color,
            isPending,
            isRejected
        };
    };

    // Handlers
    const handleApprove = (leave: Leave) => {
        // Admin: Single-step full approval
        if (isFullAccess) {
            onUpdateLeave({
                ...leave,
                status: 'APPROVED',
                approvalStep: 'DONE',
                managerApprovalStatus: 'APPROVED',
                hrApprovalStatus: 'APPROVED',
                approvedBy: currentUser?.id,
            });
            return;
        }

        // Manager: Multi-step approval
        const currentStep = leave.approvalStep || 'MANAGER';

        if (currentStep === 'MANAGER') {
            onUpdateLeave({
                ...leave,
                approvalStep: 'HR',
                managerApprovalStatus: 'APPROVED'
            });
        } else if (currentStep === 'HR' && isHR) {
            onUpdateLeave({
                ...leave,
                approvalStep: 'DONE',
                hrApprovalStatus: 'APPROVED',
                status: 'APPROVED',
                approvedBy: currentUser?.id,
            });
        }
    };

    const handleReject = (leave: Leave) => {
        const currentStep = leave.approvalStep || 'MANAGER';

        const update: Partial<Leave> = {
            status: 'REJECTED', // Kill it immediately
            approvalStep: 'DONE'
        };

        if (currentStep === 'MANAGER') {
            update.managerApprovalStatus = 'REJECTED';
        } else {
            update.hrApprovalStatus = 'REJECTED';
        }

        onUpdateLeave({ ...leave, ...update });
    };

    const handleBulkApprove = () => {
        selectedItems.forEach(id => {
            const leave = leaves.find(l => l.id === id && l.status === 'PENDING');
            if (leave && canApproveLeave(leave)) handleApprove(leave);
        });
        setSelectedItems([]);
    };

    const handleBulkReject = () => {
        selectedItems.forEach(id => {
            const leave = leaves.find(l => l.id === id && l.status === 'PENDING');
            if (leave && canApproveLeave(leave)) handleReject(leave);
        });
        setSelectedItems([]);
    };

    const canApproveLeave = (leave: Leave) => {
        if (isFullAccess) return true;
        const currentStep = leave.approvalStep || 'MANAGER';
        if (currentStep === 'MANAGER') {
            const user = getUserById(leave.userId);
            if (!user) return false;
            const dept = departments.find(d => d.name === user.department);
            return dept?.managerId === currentUser?.id;
        } else if (currentStep === 'HR') {
            return isHR;
        }
        return false;
    };

    const toggleSelect = (id: number) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        const pendingIds = filteredLeaves.filter(l => l.status === 'PENDING').map(l => l.id);
        if (selectedItems.length === pendingIds.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(pendingIds);
        }
    };

    // Render Calendar
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const startDay = getFirstDayOfMonth(currentDate);
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="bg-gray-50/30 border border-gray-100 min-h-[100px]"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
            const dayLeaves = filteredLeaves.filter(l => l.status !== 'REJECTED' && isWithinRange(currentDayDate, l.startDate, l.endDate));
            const isToday = new Date().toDateString() === currentDayDate.toDateString();

            days.push(
                <div key={d} className={`border border-gray-100 p-2 min-h-[100px] flex flex-col gap-1 relative bg-white hover:bg-gray-50 transition-colors ${isToday ? 'bg-blue-50/40' : ''}`}>
                    <span className={`text-xs font-bold mb-1 ${isToday ? 'bg-brand-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-500'}`}>
                        {d}
                    </span>
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">
                        {dayLeaves.map(leave => {
                            const user = getUserById(leave.userId);
                            const colors = getLeaveColor(leave.leaveTypeId, leave.status);
                            const lt = getLeaveTypeById(leave.leaveTypeId);
                            return (
                                <div
                                    key={`${leave.id}-${d}`}
                                    className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium cursor-help ${colors.isPending ? 'border border-dashed' : ''}`}
                                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                                    title={`${user?.name || 'Utilizador'} - ${lt?.name || 'Ausência'} (${leave.status})`}
                                >
                                    {user?.name?.split(' ')[0] || 'N/A'} {colors.isPending && '⏳'}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 capitalize">
                        {currentDate.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-300 transition-all text-gray-600"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">Hoje</button>
                        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-300 transition-all text-gray-600"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center bg-white border-b border-gray-200">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 bg-gray-50">{days}</div>
                <div className="p-3 bg-white border-t border-gray-200 flex gap-4 text-xs text-gray-500 overflow-x-auto flex-wrap">
                    {leaveTypes.map(lt => (
                        <div key={lt.id} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: lt.color }}></div>
                            {lt.name}
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-white border-2 border-dashed border-gray-400 opacity-60"></div>
                        Pendente
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 w-full max-w-7xl mx-auto">
            <Header title="Gestão de Ausências" subtitle="Aprovação e mapa de ausências da equipa" />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
                {/* Left: Stats & Filters */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Resumo</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                <span className="text-sm font-bold text-yellow-700">Pendentes Total</span>
                                <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-yellow-600 shadow-sm">{pendingCount}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-orange-50/60 rounded-lg border border-orange-100">
                                <span className="text-xs font-bold text-orange-600 flex items-center gap-1.5"><UserIcon size={12} /> Aguarda Gestor</span>
                                <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-orange-600 shadow-sm">{pendingManagerCount}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-purple-50/60 rounded-lg border border-purple-100">
                                <span className="text-xs font-bold text-purple-600 flex items-center gap-1.5"><ShieldCheck size={12} /> Aguarda RH</span>
                                <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-purple-600 shadow-sm">{pendingHRCount}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <span className="text-sm font-bold text-blue-700">Hoje Ausentes</span>
                                <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-blue-600 shadow-sm">{todayAbsent}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => setActiveTab('JUSTIFICATIONS')}>
                                <span className="text-sm font-bold text-amber-700">Justificações</span>
                                <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-amber-600 shadow-sm">{pendingJustificationsCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* SCOPE TABS */}
                    <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex gap-1">
                        <button
                            onClick={() => setActiveScope('TEAM')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeScope === 'TEAM' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Minha Equipa
                        </button>
                        <button
                            onClick={() => setActiveScope('ALL')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeScope === 'ALL' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Todos
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Filter size={14} /> Filtros
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Estado</label>
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="PENDING">Pendente</option>
                                    <option value="APPROVED">Aprovado</option>
                                    <option value="REJECTED">Rejeitado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Departamento</label>
                                <select
                                    value={filterDepartment}
                                    onChange={e => setFilterDepartment(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="">Todos</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Local</label>
                                <select
                                    value={filterLocation || ''}
                                    onChange={e => setFilterLocation(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="">Todos</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedItems.length > 0 && (
                        <div className="bg-brand-50 p-4 rounded-xl border border-brand-200">
                            <p className="text-sm font-medium text-brand-700 mb-3">{selectedItems.length} selecionado{selectedItems.length > 1 ? 's' : ''}</p>
                            <div className="flex gap-2">
                                <button onClick={handleBulkApprove} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
                                    <CheckCircle size={14} /> Aprovar
                                </button>
                                <button onClick={handleBulkReject} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200">
                                    <XCircle size={14} /> Rejeitar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Content */}
                <div className="lg:col-span-3">
                    {/* Approval Step Tabs */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { key: 'ALL' as const, label: 'Todos', count: null },
                            { key: 'MANAGER' as const, label: 'Aguarda Gestor', count: pendingManagerCount },
                            { key: 'HR' as const, label: 'Aguarda RH', count: pendingHRCount },
                            { key: 'DONE' as const, label: 'Concluídos', count: null }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setApprovalStepFilter(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${approvalStepFilter === tab.key
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                                {tab.count !== null && tab.count > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${approvalStepFilter === tab.key
                                        ? 'bg-white/20 text-white'
                                        : 'bg-amber-100 text-amber-700'
                                        }`}>{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            <button
                                onClick={() => setActiveTab('LEAVES')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${activeTab === 'LEAVES' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <CalendarIcon size={16} /> Férias & Faltas
                            </button>
                            <button
                                onClick={() => setActiveTab('JUSTIFICATIONS')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${activeTab === 'JUSTIFICATIONS' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <MessageSquare size={16} /> Justificações de Ponto
                                {pendingJustificationsCount > 0 && <span className="bg-amber-200 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{pendingJustificationsCount}</span>}
                            </button>
                        </div>

                        {activeTab === 'LEAVES' && (
                            <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm ml-auto">
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'LIST' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <List size={16} /> Lista
                                </button>
                                <button
                                    onClick={() => setViewMode('CALENDAR')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'CALENDAR' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <LayoutGrid size={16} /> Mapa
                                </button>
                            </div>
                        )}
                    </div>

                    {activeTab === 'JUSTIFICATIONS' ? (
                        <div className="space-y-4 animate-fade-in">
                            {filteredAnomalies.length === 0 ? (
                                <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center">
                                    <MessageSquare className="mx-auto text-gray-300 mb-3" size={40} />
                                    <p className="text-gray-500 font-medium">Não há justificações pendentes para analisar.</p>
                                </div>
                            ) : (
                                filteredAnomalies.map(anomaly => {
                                    const user = getUserById(anomaly.userId);

                                    const handleApproveAnomaly = () => {
                                        if (onUpdateAnomaly) {
                                            const note = prompt("Nota do Responsável (Opcional):");
                                            onUpdateAnomaly({
                                                ...anomaly,
                                                status: 'JUSTIFIED_MANAGER',
                                                managerId: currentUser?.id,
                                                managerNotes: note || anomaly.managerNotes
                                            });
                                        }
                                    };

                                    const handleRejectAnomaly = () => {
                                        if (onUpdateAnomaly) {
                                            const note = prompt("Motivo da Rejeição (Opcional):");
                                            onUpdateAnomaly({
                                                ...anomaly,
                                                status: 'REJECTED',
                                                managerId: currentUser?.id,
                                                managerNotes: note || anomaly.managerNotes
                                            });
                                        }
                                    };

                                    const handleConvertToAbsence = () => {
                                        const falatType = leaveTypes.find(lt => lt.name.toLowerCase() === 'falta');
                                        if (!falatType) {
                                            alert("Tipo de ausência 'Falta' não encontrado.");
                                            return;
                                        }

                                        if (onAddLeave && onUpdateAnomaly) {
                                            const confirmConv = window.confirm("Deseja converter esta anomalia em Falta? Isto criará um registo de ausência para o dia correspondente.");
                                            if (!confirmConv) return;

                                            onAddLeave({
                                                userId: anomaly.userId,
                                                leaveTypeId: falatType.id,
                                                startDate: anomaly.createdAt.split('T')[0],
                                                endDate: anomaly.createdAt.split('T')[0],
                                                status: 'APPROVED',
                                                notes: `Convertido de anomalia: ${anomaly.type} (${anomaly.minutes} min)`,
                                                approvalStep: 'DONE',
                                                managerApprovalStatus: 'APPROVED',
                                                hrApprovalStatus: 'APPROVED',
                                                approvedBy: currentUser?.id
                                            });

                                            onUpdateAnomaly({
                                                ...anomaly,
                                                status: 'REJECTED',
                                                managerId: currentUser?.id,
                                                managerNotes: 'Convertido em Falta.'
                                            });
                                        }
                                    };

                                    return (
                                        <div key={anomaly.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${anomaly.status === 'REJECTED' ? 'opacity-60' : ''}`}>
                                            <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                <div className="flex-shrink-0 bg-gray-50 border border-gray-100 rounded-lg p-3 text-center min-w-[80px]">
                                                    <div className="text-xs font-bold text-gray-400 uppercase">{new Date(anomaly.createdAt).toLocaleString('pt-PT', { month: 'short' })}</div>
                                                    <div className="text-2xl font-bold text-gray-800">{new Date(anomaly.createdAt).getDate()}</div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-gray-900 truncate">{user?.name || 'Utilizador Desconhecido'}</h4>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                                            {anomaly.type === 'LATE_ENTRY' ? 'Atraso' :
                                                                anomaly.type === 'EARLY_EXIT' ? 'Saída Antecipada' :
                                                                    anomaly.type === 'HOURS_DEFICIT' ? 'Défice de Horas' :
                                                                        anomaly.type === 'HOURS_SURPLUS' ? 'Excedente de Horas' : anomaly.type}
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">{anomaly.minutes} min</span>
                                                    </div>
                                                    <div className="text-sm text-gray-700 italic border-l-2 border-amber-300 pl-3 my-2 break-words">
                                                        "{anomaly.employeeJustification || 'Sem justificação escrita.'}"
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {anomaly.status === 'JUSTIFIED_PENDING_REVIEW' ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={handleApproveAnomaly}
                                                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm transition-colors"
                                                            >
                                                                <CheckCircle size={16} /> Aceitar
                                                            </button>
                                                            <button
                                                                onClick={handleRejectAnomaly}
                                                                className="flex items-center gap-1.5 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                                                            >
                                                                <XCircle size={16} /> Rejeitar
                                                            </button>
                                                            <button
                                                                onClick={handleConvertToAbsence}
                                                                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-sm transition-colors"
                                                            >
                                                                <AlertTriangle size={16} /> Converter em Falta
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${anomaly.status === 'JUSTIFIED_MANAGER'
                                                            ? 'bg-green-50 text-green-700 border-green-100'
                                                            : 'bg-red-50 text-red-700 border-red-100'
                                                            }`}>
                                                            {anomaly.status === 'JUSTIFIED_MANAGER' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                            {anomaly.status === 'JUSTIFIED_MANAGER' ? 'Justificado' : 'Rejeitado'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : viewMode === 'CALENDAR' ? (
                        renderCalendar()
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {/* Select All for pending */}
                            {filteredLeaves.some(l => l.status === 'PENDING') && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.length === filteredLeaves.filter(l => l.status === 'PENDING').length && selectedItems.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-sm text-gray-600">Selecionar todos pendentes</span>
                                </div>
                            )}

                            {filteredLeaves.length === 0 ? (
                                <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center">
                                    <CalendarIcon className="mx-auto text-gray-300 mb-3" size={40} />
                                    <p className="text-gray-500 font-medium">Não há pedidos que correspondam aos filtros.</p>
                                </div>
                            ) : (
                                filteredLeaves.map(leave => {
                                    const user = getUserById(leave.userId);
                                    const leaveType = getLeaveTypeById(leave.leaveTypeId);
                                    const colors = getLeaveColor(leave.leaveTypeId, leave.status);
                                    const daysCount = Math.ceil((new Date(leave.endDate + 'T00:00:00').getTime() - new Date(leave.startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                    return (
                                        <div key={leave.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${colors.isRejected ? 'opacity-60' : ''}`}>
                                            <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                {/* Checkbox for pending */}
                                                {leave.status === 'PENDING' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.includes(leave.id)}
                                                        onChange={() => toggleSelect(leave.id)}
                                                        className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 flex-shrink-0"
                                                    />
                                                )}

                                                {/* Date Box */}
                                                <div className="flex-shrink-0 bg-gray-50 border border-gray-100 rounded-lg p-3 text-center min-w-[80px]">
                                                    <div className="text-xs font-bold text-gray-400 uppercase">{new Date(leave.startDate + 'T00:00:00').toLocaleString('pt-PT', { month: 'short' })}</div>
                                                    <div className="text-2xl font-bold text-gray-800">{new Date(leave.startDate + 'T00:00:00').getDate()}</div>
                                                    {leave.startDate !== leave.endDate && (
                                                        <div className="text-[10px] text-gray-400 border-t border-gray-200 mt-1 pt-1">
                                                            até {new Date(leave.endDate + 'T00:00:00').getDate()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-gray-900 truncate">{user?.name || 'Utilizador Desconhecido'}</h4>
                                                        {user?.department && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">{user.department}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm mb-1">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.solid }}></span>
                                                        <span className="font-semibold" style={{ color: colors.solid }}>{leaveType?.name || 'Ausência'}</span>
                                                        <span className="text-gray-400">• {daysCount} dia{daysCount > 1 ? 's' : ''}</span>
                                                        {leave.notes && <span className="text-gray-400 text-xs italic truncate max-w-xs">— "{leave.notes}"</span>}
                                                    </div>
                                                    {/* Approval Step Indicator */}
                                                    {leave.status === 'PENDING' && (
                                                        <div className="flex items-center gap-1 mt-2">
                                                            {[
                                                                { step: 'MANAGER', label: 'Gestor' },
                                                                { step: 'HR', label: 'RH' },
                                                                { step: 'DONE', label: 'Concluído' }
                                                            ].map((s, idx) => {
                                                                const currentStep = leave.approvalStep || 'MANAGER';
                                                                const stepOrder = ['MANAGER', 'HR', 'DONE'];
                                                                const currentIdx = stepOrder.indexOf(currentStep);
                                                                const thisIdx = stepOrder.indexOf(s.step);
                                                                const isPast = thisIdx < currentIdx;
                                                                const isCurrent = thisIdx === currentIdx;
                                                                return (
                                                                    <React.Fragment key={s.step}>
                                                                        {idx > 0 && <ArrowRight size={10} className={isPast || isCurrent ? 'text-brand-400' : 'text-gray-300'} />}
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPast ? 'bg-green-100 text-green-700' :
                                                                            isCurrent ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300' :
                                                                                'bg-gray-100 text-gray-400'
                                                                            }`}>
                                                                            {isPast && '✓ '}{s.label}
                                                                        </span>
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {/* Quorum Alert for pending leaves */}
                                                    {leave.status === 'PENDING' && user?.department && (() => {
                                                        const quorum = calculateQuorum(
                                                            user.department,
                                                            leave.startDate,
                                                            leave.endDate,
                                                            users,
                                                            leaves,
                                                            leaveTypes,
                                                            leave.userId,
                                                            70
                                                        );
                                                        return quorum.alertLevel !== 'ok' ? (
                                                            <div className="mt-2">
                                                                <button
                                                                    onClick={() => setExpandedQuorum(expandedQuorum === leave.id ? null : leave.id)}
                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${quorum.alertLevel === 'critical'
                                                                        ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                                                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                                                        }`}
                                                                >
                                                                    <Users size={14} />
                                                                    {quorum.percentAvailable}% equipa disponível
                                                                    ({quorum.absentUsers.length} ausente{quorum.absentUsers.length > 1 ? 's' : ''})
                                                                </button>
                                                                {expandedQuorum === leave.id && (
                                                                    <div className="mt-2">
                                                                        <QuorumAnalyzer
                                                                            departmentName={user.department}
                                                                            startDate={leave.startDate}
                                                                            endDate={leave.endDate}
                                                                            users={users}
                                                                            leaves={leaves}
                                                                            leaveTypes={leaveTypes}
                                                                            departments={departments}
                                                                            excludeUserId={leave.userId}
                                                                            minQuorumPercentage={70}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                </div>

                                                {/* Status & Actions */}
                                                <div className="flex items-center gap-3">
                                                    {leave.status === 'PENDING' ? (
                                                        <div className="flex items-center gap-2">
                                                            {canApproveLeave(leave) ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApprove(leave)}
                                                                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm transition-colors"
                                                                    >
                                                                        <CheckCircle size={16} />
                                                                        {isFullAccess ? 'Aprovar' : (leave.approvalStep || 'MANAGER') === 'MANAGER' ? 'Aprovar (Gestor)' : 'Aprovar (RH)'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleReject(leave)}
                                                                        className="flex items-center gap-1.5 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                                                                    >
                                                                        <XCircle size={16} /> Rejeitar
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 italic">Sem permissão para aprovar nesta fase</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${leave.status === 'APPROVED'
                                                            ? 'bg-green-50 text-green-700 border-green-100'
                                                            : 'bg-red-50 text-red-700 border-red-100'
                                                            }`}>
                                                            {leave.status === 'APPROVED' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                            {LeaveStatusLabels[leave.status] || leave.status}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AbsenceManagement;
