import React, { useState, useMemo, useEffect } from 'react';
import {
    Calendar,
    Download,
    ExternalLink,
    Mail,
    PlusCircle,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    TreePalm,
    Clock,
    ArrowRight,
    Users,
    CalendarCheck,
    Layers,
    Sparkles,
    CalendarDays
} from 'lucide-react';
import Header from '../components/Header';
import VacationBalanceCard, { calculateVacationBalance } from '../components/VacationBalanceCard';
import SearchableSelect from '../components/SearchableSelect';
import KioskCalendarModal from '../components/KioskCalendarModal';
import { User, Leave, LeaveType, AbsenceStatus, UserStatus, ScheduleTemplate } from '../types';
import { getEffectiveScheduleDay } from '../utils/scheduleUtils';
import { getRoleDisplayName } from '../utils/authUtils';
import { useToast } from '../context/ToastContext';
import { downloadICS as downloadICSService, addToGoogleCalendar, addToOutlookCalendar } from '../services/calendarIntegration';

interface EmployeeVacationsProps {
    user: User;
    users?: User[];
    leaves: Leave[];
    leaveTypes: LeaveType[];
    scheduleTemplates?: ScheduleTemplate[];
    onAddLeave?: (leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean | void> | void;
    defaultTab?: 'overview' | 'request';
    kioskMode?: boolean;
}

const EmployeeVacations: React.FC<EmployeeVacationsProps> = ({
    user,
    users = [],
    leaves = [],
    leaveTypes = [],
    scheduleTemplates = [],
    onAddLeave,
    defaultTab = 'overview',
    kioskMode = false
}) => {
    const { addToast } = useToast();
    const currentYear = new Date().getFullYear();

    // Tab state: 'overview' (As Minhas Férias) vs 'request' (Pedir Férias / Ausência)
    const [activeTab, setActiveTab] = useState<'overview' | 'request'>(defaultTab);

    // Filter year in overview
    const [selectedYearFilter, setSelectedYearFilter] = useState<number | 'ALL'>(currentYear);

    // Form state for leave request
    const [selectedLeaveType, setSelectedLeaveType] = useState<number | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [backupUserId, setBackupUserId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCalendarModal, setShowCalendarModal] = useState(false);

    // Pre-select vacation type if available when switching to request
    useEffect(() => {
        if (!selectedLeaveType && leaveTypes.length > 0) {
            const vacationType = leaveTypes.find(lt => lt.deductsVacation || lt.name.toLowerCase().includes('férias'));
            if (vacationType) {
                setSelectedLeaveType(vacationType.id);
            } else {
                setSelectedLeaveType(leaveTypes[0].id);
            }
        }
    }, [leaveTypes, selectedLeaveType]);

    // Update activeTab if defaultTab changes (e.g. navigation via route)
    useEffect(() => {
        if (defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [defaultTab]);

    // User's leaves sorted descending
    const myLeaves = useMemo(() => {
        return leaves
            .filter(l => Number(l.userId) === Number(user.id))
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [leaves, user.id]);

    // Pending leaves
    const pendingLeaves = useMemo(() => {
        return myLeaves.filter(l => l.status === 'PENDING' || l.status?.toLowerCase() === 'pending');
    }, [myLeaves]);

    // Approved leaves for current year
    const approvedThisYear = useMemo(() => {
        return myLeaves.filter(l => {
            const isApproved = l.status === 'APPROVED' || l.status?.toLowerCase() === 'approved';
            if (!isApproved) return false;
            return new Date(l.startDate).getFullYear() === currentYear;
        });
    }, [myLeaves, currentYear]);

    // Filtered historical leaves
    const filteredHistoryLeaves = useMemo(() => {
        return myLeaves.filter(l => {
            if (l.status === 'PENDING' || l.status?.toLowerCase() === 'pending') return false; // Shown in pending section
            if (selectedYearFilter === 'ALL') return true;
            return new Date(l.startDate).getFullYear() === selectedYearFilter;
        });
    }, [myLeaves, selectedYearFilter]);

    // Available years for filter
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        years.add(currentYear);
        myLeaves.forEach(l => {
            if (l.startDate) {
                const y = new Date(l.startDate).getFullYear();
                if (!isNaN(y)) years.add(y);
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [myLeaves, currentYear]);

    // Calculate vacation balance
    const vacationBalance = useMemo(() => {
        return calculateVacationBalance(user, leaves, user.id, leaveTypes, scheduleTemplates);
    }, [user, leaves, leaveTypes, scheduleTemplates]);

    // Calculate effective work days excluding off-days
    const calculateEffectiveDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        const startD = new Date(start + 'T00:00:00');
        const endD = new Date(end + 'T00:00:00');
        if (endD < startD) return 0;

        let count = 0;
        const iter = new Date(startD);
        const userTemplate = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);

        while (iter <= endD) {
            const daySchedule = getEffectiveScheduleDay(iter, user, userTemplate);
            const isOff = daySchedule?.isOff ?? (iter.getDay() === 0 || iter.getDay() === 6);
            if (!isOff) count++;
            iter.setDate(iter.getDate() + 1);
        }
        return count;
    };

    const totalDaysRequested = useMemo(() => calculateEffectiveDays(startDate, endDate), [startDate, endDate]);

    // Check for team conflicts (same department)
    const hasTeamConflict = useMemo(() => {
        if (!startDate || !endDate || !user.department) return false;
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');

        return leaves.some(l => {
            if (l.status === 'REJECTED' || l.userId === user.id) return false;
            const u = users.find(usr => usr.id === l.userId);
            if (u?.department !== user.department) return false;

            const lStart = new Date(l.startDate + 'T00:00:00');
            const lEnd = new Date(l.endDate + 'T00:00:00');
            return (start <= lEnd && end >= lStart);
        });
    }, [startDate, endDate, leaves, users, user]);

    // Colleagues in same department for backup/coverage
    const backupUsers = useMemo(() => {
        return users.filter(u =>
            u.id !== user.id &&
            u.status === UserStatus.ACTIVE &&
            u.department === user.department
        );
    }, [users, user]);

    const getLeaveType = (leaveTypeId: number) => {
        return leaveTypes.find(lt => lt.id === leaveTypeId);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const calculateDaysDuration = (startDateStr: string, endDateStr: string) => {
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T00:00:00');
        return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    // Calendar export handlers
    const handleDownloadICS = () => {
        downloadICSService(approvedThisYear, user, leaveTypes);
    };

    const handleAddToGoogle = (leave: Leave) => {
        addToGoogleCalendar(leave, user, leaveTypes);
    };

    const handleAddToOutlook = (leave: Leave) => {
        addToOutlookCalendar(leave, user, leaveTypes);
    };

    // Submit leave request
    const handleSubmitRequest = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!selectedLeaveType || !startDate || !endDate) {
            addToast('error', 'Por favor preencha todos os campos obrigatórios (Tipo e Datas).');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            addToast('error', 'A data de fim deve ser posterior ou igual à data de início.');
            return;
        }

        if (!onAddLeave) {
            addToast('error', 'Funcionalidade de submissão não disponível.');
            return;
        }

        setIsSubmitting(true);

        try {
            const success = await onAddLeave({
                userId: user.id,
                leaveTypeId: selectedLeaveType,
                startDate,
                endDate,
                status: AbsenceStatus.PENDING,
                notes: notes || undefined,
                backupUserId: backupUserId || undefined,
            });

            if (success === false) {
                return;
            }

            // Reset form
            setStartDate('');
            setEndDate('');
            setNotes('');
            setBackupUserId(null);

            // Switch to overview tab so user sees their new request
            await new Promise(resolve => setTimeout(resolve, 600));
            setActiveTab('overview');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('[EmployeeVacations] Submit error:', error);
            addToast('error', 'Erro ao submeter pedido. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto pb-24">
            <Header
                title="Férias & Ausências"
                subtitle="Consulte o seu saldo, histórico e registe novos pedidos num único local"
            />

            {/* Seamless Tab Navigation Bar */}
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'overview'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                        <TreePalm size={18} className={activeTab === 'overview' ? 'text-emerald-600' : 'text-gray-500'} />
                        <span>As Minhas Férias</span>
                        {pendingLeaves.length > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 font-bold rounded-full">
                                {pendingLeaves.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('request')}
                        className={`flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'request'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                        <PlusCircle size={18} className={activeTab === 'request' ? 'text-brand-600' : 'text-gray-500'} />
                        <span>Pedir Férias / Ausência</span>
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <button
                        onClick={() => setActiveTab('request')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <PlusCircle size={16} />
                        <span>Novo Pedido</span>
                    </button>
                )}
            </div>

            {/* TAB 1: AS MINHAS FÉRIAS (OVERVIEW) */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* Vacation Balance Card */}
                    <div>
                        <VacationBalanceCard
                            balance={vacationBalance}
                            userName={user.name}
                            onRequestVacation={() => setActiveTab('request')}
                        />
                    </div>

                    {/* Pending Leaves Alert Section */}
                    {pendingLeaves.length > 0 && (
                        <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-amber-900 flex items-center gap-2.5 text-base">
                                    <Clock size={20} className="text-amber-600 animate-pulse" />
                                    <span>{pendingLeaves.length} Pedido{pendingLeaves.length > 1 ? 's' : ''} em Análise (Aguardam Aprovação)</span>
                                </h3>
                                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-200/70 text-amber-900 rounded-full">
                                    Em análise pela chefia / RH
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {pendingLeaves.map(leave => {
                                    const lt = getLeaveType(leave.leaveTypeId);
                                    const days = calculateDaysDuration(leave.startDate, leave.endDate);
                                    return (
                                        <div
                                            key={leave.id}
                                            className="p-4 bg-white rounded-xl border border-amber-200/70 shadow-xs flex flex-col justify-between"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: lt?.color || '#F59E0B' }}
                                                    />
                                                    <span className="font-bold text-gray-900">{lt?.name || 'Ausência'}</span>
                                                </div>
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-md">
                                                    Pendente
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <span>{formatDate(leave.startDate)} — {formatDate(leave.endDate)}</span>
                                                <span className="font-semibold text-gray-800">
                                                    {days} {days === 1 ? 'dia' : 'dias'}
                                                </span>
                                            </div>

                                            {leave.notes && (
                                                <p className="text-xs text-gray-500 italic mt-2 border-t border-gray-100 pt-2 line-clamp-2">
                                                    "{leave.notes}"
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Export to Calendar Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                                    <Calendar className="text-brand-600" size={20} />
                                    <span>Sincronizar com o seu Calendário Pessoal</span>
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Adicione as suas férias aprovadas ao Google Calendar, Outlook ou descarregue em formato .ics
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2.5">
                                <button
                                    onClick={handleDownloadICS}
                                    disabled={approvedThisYear.length === 0}
                                    className="flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-all text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Download size={14} /> iCal (.ics)
                                </button>
                                <button
                                    onClick={() => approvedThisYear.length > 0 && handleAddToGoogle(approvedThisYear[0])}
                                    disabled={approvedThisYear.length === 0}
                                    className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-all text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ExternalLink size={14} /> Google Calendar
                                </button>
                                <button
                                    onClick={() => approvedThisYear.length > 0 && handleAddToOutlook(approvedThisYear[0])}
                                    disabled={approvedThisYear.length === 0}
                                    className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-all text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Mail size={14} /> Outlook
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Approved & Historical Leaves List */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <CalendarCheck size={20} className="text-emerald-600" />
                                    <span>Histórico de Férias e Ausências</span>
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Registo de férias aprovadas e períodos concluídos
                                </p>
                            </div>

                            {/* Year filter selector */}
                            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                                {availableYears.map(yr => (
                                    <button
                                        key={yr}
                                        onClick={() => setSelectedYearFilter(yr)}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            selectedYearFilter === yr
                                                ? 'bg-white text-gray-900 shadow-xs'
                                                : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        {yr}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setSelectedYearFilter('ALL')}
                                    className={`px-3 py-1.5 rounded-lg transition-all ${
                                        selectedYearFilter === 'ALL'
                                            ? 'bg-white text-gray-900 shadow-xs'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    Todas
                                </button>
                            </div>
                        </div>

                        {filteredHistoryLeaves.length === 0 ? (
                            <div className="text-center py-16 px-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <TreePalm className="mx-auto text-gray-300 mb-3" size={44} />
                                <p className="text-gray-700 font-semibold mb-1">Sem registos para o período selecionado</p>
                                <p className="text-sm text-gray-400 mb-4">Ainda não tem férias registadas para este ano.</p>
                                <button
                                    onClick={() => setActiveTab('request')}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    <PlusCircle size={16} />
                                    <span>Pedir Férias Agora</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredHistoryLeaves.map(leave => {
                                    const lt = getLeaveType(leave.leaveTypeId);
                                    const days = calculateDaysDuration(leave.startDate, leave.endDate);
                                    const isApproved = leave.status === 'APPROVED' || leave.status?.toLowerCase() === 'approved';
                                    const isRejected = leave.status === 'REJECTED' || leave.status?.toLowerCase() === 'rejected';
                                    const isPast = new Date(leave.endDate) < new Date();

                                    return (
                                        <div
                                            key={leave.id}
                                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-3 ${
                                                isRejected
                                                    ? 'bg-red-50/60 border-red-200 opacity-80'
                                                    : isPast
                                                    ? 'bg-gray-50 border-gray-200 opacity-75'
                                                    : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div
                                                    className={`p-2.5 rounded-xl ${
                                                        isRejected
                                                            ? 'bg-red-100 text-red-600'
                                                            : isPast
                                                            ? 'bg-gray-200 text-gray-600'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                    }`}
                                                >
                                                    <Calendar size={20} />
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-gray-900 text-sm md:text-base">
                                                            {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                                                        </p>
                                                        <span
                                                            className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                                                            style={{
                                                                backgroundColor: (lt?.color || '#10B981') + '25',
                                                                color: lt?.color || '#047857'
                                                            }}
                                                        >
                                                            {lt?.name || 'Ausência'}
                                                        </span>
                                                        {isRejected && (
                                                            <span className="text-[11px] px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-md">
                                                                Rejeitado
                                                            </span>
                                                        )}
                                                        {isApproved && !isPast && (
                                                            <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">
                                                                Aprovado
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-gray-500 mt-1">
                                                        <span className="font-semibold text-gray-700">{days} {days === 1 ? 'dia' : 'dias'}</span>
                                                        {leave.notes && <span className="italic ml-2">— "{leave.notes}"</span>}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                {isPast ? (
                                                    <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-md">
                                                        Concluído
                                                    </span>
                                                ) : isApproved ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleAddToGoogle(leave)}
                                                            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100/60 hover:bg-emerald-100 transition-colors"
                                                            title="Adicionar ao Google Calendar"
                                                        >
                                                            <ExternalLink size={13} /> Google
                                                        </button>
                                                        <button
                                                            onClick={() => handleAddToOutlook(leave)}
                                                            className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-100/60 hover:bg-blue-100 transition-colors"
                                                            title="Adicionar ao Outlook"
                                                        >
                                                            <Mail size={13} /> Outlook
                                                        </button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: PEDIR FÉRIAS / AUSÊNCIA (FORM) */}
            {activeTab === 'request' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
                    {/* Compact Balance summary */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-brand-600 transition-colors"
                        >
                            <span>← Voltar às Minhas Férias</span>
                        </button>
                        <span className="text-xs text-gray-400 font-medium">Formulário de Pedido Oficial</span>
                    </div>

                    <VacationBalanceCard balance={vacationBalance} compact />

                    {/* Main Form */}
                    <form onSubmit={handleSubmitRequest} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="p-6 md:p-8 space-y-6">
                            {/* Collaborator details header */}
                            <div className="bg-gradient-to-r from-brand-50 to-blue-50 p-4 rounded-xl border border-brand-100 flex items-center gap-4">
                                <img
                                    src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff`}
                                    alt={user.name}
                                    className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                                />
                                <div>
                                    <div className="font-bold text-base md:text-lg text-gray-900">{user.name}</div>
                                    <div className="text-xs md:text-sm text-gray-600">
                                        {user.department || 'Geral'} · {getRoleDisplayName(user.role)}
                                    </div>
                                </div>
                            </div>

                            {/* Leave Type Selector */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                    Tipo de Ausência <span className="text-red-500">*</span>
                                </label>

                                {leaveTypes.length === 0 ? (
                                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                                        <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                                        <p className="text-red-900 font-bold">Nenhum tipo de ausência configurado</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {leaveTypes.map(lt => {
                                            const isSelected = selectedLeaveType === lt.id;
                                            return (
                                                <button
                                                    key={lt.id}
                                                    type="button"
                                                    onClick={() => setSelectedLeaveType(lt.id)}
                                                    className={`p-3.5 rounded-xl text-left font-medium transition-all flex items-center gap-3 border-2 ${
                                                        isSelected
                                                            ? 'border-gray-900 ring-2 ring-gray-900/10 shadow-md scale-[1.02]'
                                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                                                    }`}
                                                    style={{
                                                        backgroundColor: isSelected ? (lt.color || '#3B82F6') + '15' : 'white',
                                                        color: isSelected ? (lt.color || '#1F2937') : '#374151'
                                                    }}
                                                >
                                                    <span
                                                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: lt.color || '#3B82F6' }}
                                                    />
                                                    <span className="flex-1 text-sm font-bold truncate">{lt.name}</span>
                                                    {isSelected && <CheckCircle2 size={18} className="flex-shrink-0 text-gray-900" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Dates Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Data Início <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={startDate}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            if (!endDate || endDate < e.target.value) {
                                                setEndDate(e.target.value);
                                            }
                                        }}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Data Fim <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        min={startDate}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-medium"
                                    />
                                </div>
                            </div>

                            {/* Days Counter */}
                            {totalDaysRequested > 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CalendarCheck className="text-emerald-600" size={22} />
                                        <div>
                                            <span className="text-sm font-bold text-emerald-950 block">Duração Efetiva Calculada</span>
                                            <span className="text-xs text-emerald-700">Exclui folgas e fins de semana do seu horário</span>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-extrabold text-emerald-700">
                                        {totalDaysRequested} {totalDaysRequested === 1 ? 'dia útil' : 'dias úteis'}
                                    </span>
                                </div>
                            )}

                            {/* Conflict Warning */}
                            {hasTeamConflict && (
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-bold text-amber-900 text-sm">Atenção: Sobreposição de Equipa</div>
                                        <div className="text-xs text-amber-700 mt-1">
                                            Existem outros colegas do departamento ({user.department}) ausentes nestas datas.
                                            O pedido será avaliado pela sua chefia direta.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Backup User / Substitute Colleague */}
                            {backupUsers.length > 0 && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <UserCheck size={16} className="text-emerald-600" />
                                        <span>Colega Substituto / Cobertura (Opcional)</span>
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            { id: '', label: 'Nenhum colega selecionado' },
                                            ...backupUsers.map(u => ({
                                                id: u.id,
                                                label: u.name,
                                                sublabel: u.role
                                            }))
                                        ]}
                                        value={backupUserId || ''}
                                        onChange={(id) => setBackupUserId(id ? Number(id) : null)}
                                        placeholder="Pesquisar colega do departamento..."
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 mt-1.5">
                                        O colega selecionado será informado sobre a substituição durante o seu período de ausência.
                                    </p>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Observações ou Justificação (Opcional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm resize-none"
                                    placeholder="Ex: Férias de Verão / Consulta médica / Assuntos pessoais..."
                                />
                            </div>
                        </div>

                        {/* Actions footer */}
                        <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCalendarModal(true)}
                                className="w-full sm:w-auto px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <CalendarDays size={18} className="text-brand-600" />
                                <span>Ver Calendário</span>
                            </button>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('overview')}
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto px-5 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl font-bold text-sm transition-colors"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !startDate || !endDate || !selectedLeaveType}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>A submeter...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={18} />
                                            <span>Submeter Pedido</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Team Calendar Modal */}
            <KioskCalendarModal
                isOpen={showCalendarModal}
                onClose={() => setShowCalendarModal(false)}
                user={user}
                leaves={leaves}
                leaveTypes={leaveTypes}
                scheduleTemplates={scheduleTemplates}
            />
        </div>
    );
};

export default EmployeeVacations;
