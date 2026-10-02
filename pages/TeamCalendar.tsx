import React, { useState, useMemo, useCallback } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { CalendarDays, ChevronLeft, ChevronRight, X, Save, Users, MapPin, Building2, CheckCircle, XCircle, AlertTriangle, Clock, UserCheck, LayoutGrid, List, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { getEffectiveScheduleDay } from '../utils/scheduleUtils';
import QuorumAnalyzer from '../components/QuorumAnalyzer';
import Header from '../components/Header';
import { User, Leave, LeaveType, ScheduleTemplate, Location, Department, UserStatus, AbsenceStatus, Holiday } from '../types';
import { checkIsHoliday } from '../utils/holidayUtils';
import { supabase } from '../services/supabaseClient';
import { useOutletContext } from 'react-router-dom';

interface TeamCalendarProps {
    users: User[];
    leaves: Leave[];
    leaveTypes: LeaveType[];
    scheduleTemplates: ScheduleTemplate[];
    locations: Location[];
    departments: Department[];
    holidays?: Holiday[];
    onAddLeave: (leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean | void> | void;
    onUpdateLeave?: (leave: Leave) => Promise<boolean | void> | void;
    currentUser: User | null;
    kioskMode?: boolean;
}

const TeamCalendar: React.FC<TeamCalendarProps> = ({ users, leaves, leaveTypes, scheduleTemplates, locations, departments, holidays = [], onAddLeave, onUpdateLeave, currentUser, kioskMode = false }) => {
    const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'TIMELINE' | 'MONTH'>('TIMELINE');
    const [filterLocation, setFilterLocation] = useState<number | null>(null);
    const [filterDepartment, setFilterDepartment] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLeaveDetailModal, setShowLeaveDetailModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedDates, setSelectedDates] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [selectedLeaveType, setSelectedLeaveType] = useState<number | null>(null);
    const [leaveNotes, setLeaveNotes] = useState('');
    const [selectedBackupUserId, setSelectedBackupUserId] = useState<number | null>(null);

    // PERMISSIONS
    const managedDepartments = React.useMemo(() => {
        if (!currentUser) return [];
        return departments.filter(d => d.managerId === currentUser.id).map(d => d.name);
    }, [departments, currentUser]);


    // Roles that can see all details
    const fullAccessRoles = ['ADMIN', 'CEO', 'RH', 'Responsável de Departamento', 'Diretor de Unidade'];
    const isPrivileged = currentUser?.role ? fullAccessRoles.includes(currentUser.role) : false;

    // Calendar sharing consent
    const [sharingDecision, setSharingDecision] = useState<boolean | undefined>(
        currentUser?.attendanceConfig?.hideAbsences
    );
    const hasDecided = sharingDecision !== undefined;
    const currentUserHidden = sharingDecision === true && !isPrivileged;
    const needsConsent = !hasDecided && !isPrivileged;

    const handleSharingDecision = useCallback(async (share: boolean) => {
        setSharingDecision(!share); // hideAbsences = !share (share=true → hide=false)
        if (currentUser) {
            const newConfig = { ...currentUser.attendanceConfig, hideAbsences: !share };
            await supabase.from('users').update({ attendance_config: newConfig }).eq('id', currentUser.id);
        }
    }, [currentUser]);

    // Stats
    const pendingCount = leaves.filter(l => l.status === AbsenceStatus.PENDING).length;


    // Conflict detection: dates with multiple absences in same department
    const conflictDates = useMemo(() => {
        const dateMap: Record<string, { dept: string; count: number }[]> = {};
        leaves.filter(l => l.status !== AbsenceStatus.REJECTED).forEach(leave => {
            const user = users.find(u => u.id === leave.userId);
            if (!user) return;

            // Privileged users see global conflicts, others see only their scope/relevant ones
            // But since we want to show availability, we calculate conflicts globally but maybe only highlight relevant ones?
            // For now, let's keep it simple: calculate all, but maybe filter visibility later if needed.
            // keeping original logic essentially but removing the strict 'canSeeAll' filter on the *users* list below helps conflict calculation be accurate

            const start = new Date(leave.startDate + 'T00:00:00');
            const end = new Date(leave.endDate + 'T00:00:00');
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (!dateMap[key]) dateMap[key] = [];
                const existing = dateMap[key].find(x => x.dept === user.department);
                if (existing) existing.count++;
                else dateMap[key].push({ dept: user.department, count: 1 });
            }
        });
        // Return dates where 2+ from same dept are absent
        return Object.entries(dateMap)
            .filter(([_, depts]) => depts.some(d => d.count >= 2))
            .map(([date]) => date);
    }, [leaves, users]); // removed dependency on canSeeAll/managedDepts for calculation

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentDate.toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

    const filteredUsers = useMemo(() => {
        // If current user has privacy mode ON, show empty list (they can't see others)
        if (currentUserHidden) return [];

        return users.filter(u => {
            // Hide users who have hideAbsences enabled (unless viewer is privileged)
            if (!isPrivileged && u.attendanceConfig?.hideAbsences && u.id !== currentUser?.id) return false;

            const matchesLocation = filterLocation ? u.locationId === filterLocation : true;
            const matchesDepartment = filterDepartment ? u.department === filterDepartment : true;
            return matchesLocation && matchesDepartment && u.status === UserStatus.ACTIVE;
        });
    }, [users, filterLocation, filterDepartment, currentUserHidden, isPrivileged, currentUser]);

    const getLeaveForUserOnDate = (userId: number, dateStr: string): Leave | undefined => {
        return leaves.find(l => {
            if (l.userId !== userId) return false;
            return dateStr >= l.startDate && dateStr <= l.endDate;
        });
    };

    const getLeaveTypeById = (id: number): LeaveType | undefined => {
        return leaveTypes.find(lt => lt.id === id);
    };

    const getScheduleDetails = (user: User, date: Date): { isOff: boolean; label: string | null } => {
        if (!user.scheduleTemplateId) return { isOff: false, label: null };
        const template = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);
        if (!template) return { isOff: false, label: null };

        const dayPattern = getEffectiveScheduleDay(date, user, template);

        if (!dayPattern) return { isOff: false, label: null };

        if (dayPattern.isOff) return { isOff: true, label: 'FOLGA' };

        return {
            isOff: false,
            label: `${dayPattern.start?.slice(0, 5) || ''}-${dayPattern.end?.slice(0, 5) || ''}`
        };
    };

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleCellClick = (user: User, day: number) => {
        // Only allow adding leaves if:
        // 1. It's the current user
        // 2. Or the user is a manager of that department
        // 3. Or the user is Admin/HR
        const isMyOwn = user.id === currentUser?.id;
        const isManaged = managedDepartments.includes(user.department || '');
        const canEdit = !kioskMode && (isPrivileged || isMyOwn || isManaged);

        if (!canEdit) return;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedUser(user);
        setSelectedDates({ start: dateStr, end: dateStr });
        setSelectedLeaveType(null);
        setLeaveNotes('');
        setSelectedBackupUserId(null);
        setShowAddModal(true);
    };

    const handleLeaveClick = (leave: Leave, user: User, canViewDetails: boolean) => {
        if (!canViewDetails) return; // Prevent viewing details if not allowed
        setSelectedLeave(leave);
        setSelectedUser(user);
        setShowLeaveDetailModal(true);
    };

    const handleApproveLeave = () => {
        if (!selectedLeave || !onUpdateLeave) return;
        onUpdateLeave({ ...selectedLeave, status: AbsenceStatus.APPROVED, approvedAt: new Date().toISOString() });
        setShowLeaveDetailModal(false);
        setSelectedLeave(null);
    };

    const handleRejectLeave = () => {
        if (!selectedLeave || !onUpdateLeave) return;
        onUpdateLeave({ ...selectedLeave, status: AbsenceStatus.REJECTED, approvedAt: new Date().toISOString() });
        setShowLeaveDetailModal(false);
        setSelectedLeave(null);
    };

    const handleSaveLeave = async () => {
        if (!selectedUser || !selectedLeaveType || !selectedDates.start) return;
        const res = await onAddLeave({
            userId: selectedUser.id,
            leaveTypeId: selectedLeaveType,
            startDate: selectedDates.start,
            endDate: selectedDates.end || selectedDates.start,
            status: AbsenceStatus.PENDING,
            notes: leaveNotes,
            backupUserId: selectedBackupUserId || undefined,
        });
        if (res !== false) {
            setShowAddModal(false);
        }
    };

    // Calculate vacation balance for a user
    const getVacationDaysUsed = (userId: number): number => {
        const currentYear = new Date().getFullYear();
        return leaves
            .filter(l => Number(l.userId) === Number(userId) && l.status === AbsenceStatus.APPROVED)
            .filter(l => {
                const lt = leaveTypes.find(t => t.id === l.leaveTypeId);
                return lt?.deductsVacation;
            })
            .reduce((sum, l) => {
                const start = new Date(l.startDate);
                const end = new Date(l.endDate);
                if (start.getFullYear() !== currentYear) return sum;
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                return sum + days;
            }, 0);
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6 pb-20 md:pb-8">
            {/* Header Padrão */}
            <Header
                title="Calendário de Equipa"
                subtitle="Visualize e gira as ausências da equipa."
                onMenuClick={toggleSidebar}
            />

            {/* Filtros e Controlos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3 flex-wrap justify-between">
                    {/* Location Filter */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                        <MapPin size={16} className="text-gray-400" />
                        <select
                            value={filterLocation || ''}
                            onChange={(e) => setFilterLocation(e.target.value ? Number(e.target.value) : null)}
                            className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                        >
                            <option value="">Todos os Locais</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    {/* Department Filter */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                        <Building2 size={16} className="text-gray-400" />
                        <select
                            value={filterDepartment}
                            onChange={(e) => setFilterDepartment(e.target.value)}
                            className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                        >
                            <option value="">Todos os Deps.</option>
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>

                    {/* View Toggle */}
                    <div className="bg-white border border-gray-200 rounded-xl p-1 flex items-center">
                        <button
                            onClick={() => setViewMode('TIMELINE')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'TIMELINE' ? 'bg-gray-100 text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Vista Timeline (Linhas)"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('MONTH')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'MONTH' ? 'bg-gray-100 text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Vista Mensal (Calendário)"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    {/* Request Leave Button - Always visible for employees */}
                    {!kioskMode && currentUser && (
                        <button
                            onClick={() => {
                                setSelectedUser(currentUser);
                                const today = new Date();
                                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                setSelectedDates({ start: dateStr, end: dateStr });
                                setSelectedLeaveType(null);
                                setLeaveNotes('');
                                setSelectedBackupUserId(null);
                                setShowAddModal(true);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <CalendarDays size={18} />
                            Registar Ausência
                        </button>
                    )}
                </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-3 mb-4 shadow-sm">
                <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft size={20} /></button>
                <h2 className="text-lg font-bold text-gray-800 capitalize">{monthName}</h2>
                <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight size={20} /></button>
            </div>

            {/* Consent Prompt — shown when user hasn't decided yet */}
            {needsConsent && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 mb-6">
                    <div className="max-w-lg mx-auto text-center">
                        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck size={32} className="text-brand-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Partilhar o seu calendário?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Para ver as ausências dos seus colegas, precisa de partilhar também o seu calendário.
                            Esta é uma partilha bidirecional — se aceitar, os colegas verão quando estiver ausente e vice-versa.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => handleSharingDecision(false)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                            >
                                <EyeOff size={18} />
                                Não partilhar
                            </button>
                            <button
                                onClick={() => handleSharingDecision(true)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg transition-colors"
                            >
                                <Eye size={18} />
                                Sim, partilhar
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-4">Pode alterar esta opção mais tarde junto do seu administrador.</p>
                    </div>
                </div>
            )}

            {/* Privacy Notice — shown when user explicitly declined */}
            {currentUserHidden && !needsConsent && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800">Modo Privado Ativo</p>
                        <p className="text-xs text-amber-600">As suas ausências não são visíveis para colegas. Como consequência, também não tem acesso às ausências dos outros.</p>
                    </div>
                    <button
                        onClick={() => handleSharingDecision(true)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded-lg text-xs font-bold transition-colors"
                    >
                        <Eye size={14} /> Ativar partilha
                    </button>
                </div>
            )}

            {/* Calendar Grid */}
            {viewMode === 'TIMELINE' && !needsConsent ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left text-sm font-bold text-gray-600 w-48 border-r border-gray-200">Colaborador</th>
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const d = new Date(year, month, i + 1);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    const holidayInfo = checkIsHoliday(d, holidays);

                                    return (
                                        <th
                                            key={i}
                                            title={holidayInfo.isHoliday ? `${i + 1} - ${holidayInfo.name} (Feriado)` : undefined}
                                            className={`px-1 py-2 text-center text-xs font-medium w-10 transition-colors ${
                                                holidayInfo.isHoliday
                                                    ? 'bg-amber-100 text-amber-900 border-b-2 border-b-amber-500 font-extrabold'
                                                    : isWeekend
                                                    ? 'bg-gray-100 text-gray-400'
                                                    : 'text-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center gap-0.5">
                                                {holidayInfo.isHoliday && <span className="text-[9px]">🎉</span>}
                                                <span>{i + 1}</span>
                                            </div>
                                            <div className="text-[10px] uppercase font-bold">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()]}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={daysInMonth + 1} className="text-center py-16 text-gray-400">
                                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                                        Nenhum colaborador encontrado.
                                    </td>
                                </tr>
                            )}
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50/50">
                                    <td className="sticky left-0 bg-white z-10 px-4 py-2 border-r border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <img src={user.photoUrl || 'https://picsum.photos/40/40'} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            <div>
                                                <div className="font-medium text-gray-900 text-sm truncate max-w-[120px]">{user.name}</div>
                                                <div className="text-xs text-gray-400 truncate max-w-[120px]">{user.department}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const d = new Date(year, month, day);
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        const holidayInfo = checkIsHoliday(d, holidays, user.locationId);

                                        // KIOSK MODE LOGIC:
                                        // 1. Ignore leaves (set to null)
                                        // 2. Fetch detailed schedule (checking for explicit OFF)
                                        const leave = kioskMode ? null : getLeaveForUserOnDate(user.id, dateStr);
                                        const leaveType = leave ? getLeaveTypeById(leave.leaveTypeId) : null;
                                        const scheduleDetails = getScheduleDetails(user, d);
                                        const hasConflict = !kioskMode && conflictDates.includes(dateStr);

                                        // PRIVACY CHECK
                                        const isMyOwn = user.id === currentUser?.id;
                                        const isManaged = managedDepartments.includes(user.department || '');
                                        const canViewDetails = !kioskMode && (isPrivileged || isMyOwn || isManaged);

                                        return (
                                            <td
                                                key={i}
                                                onClick={() => leave ? handleLeaveClick(leave, user, canViewDetails) : (!kioskMode && handleCellClick(user, day))}
                                                className={`px-1 py-1 text-center cursor-pointer transition-colors relative ${
                                                    holidayInfo.isHoliday
                                                        ? 'bg-amber-50/60'
                                                        : isWeekend
                                                        ? 'bg-gray-50'
                                                        : ''
                                                } ${!leave ? 'hover:bg-brand-50' : canViewDetails ? 'hover:opacity-80' : ''} ${hasConflict ? 'ring-1 ring-inset ring-orange-400' : ''}`}
                                            >
                                                {hasConflict && !leave && (
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-orange-400 rounded-full" title="Conflito: múltiplas ausências"></div>
                                                )}

                                                {/* RENDER LOGIC */}
                                                {scheduleDetails.isOff ? (
                                                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">FOLGA</span>
                                                ) : leave && leaveType ? (
                                                    <div
                                                        className={`w-full h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white truncate ${leave.status === AbsenceStatus.PENDING ? 'ring-2 ring-offset-1 ring-yellow-400' : ''}`}
                                                        style={{
                                                            backgroundColor: canViewDetails ? leaveType.color : '#EF4444',
                                                            opacity: leave.status === AbsenceStatus.REJECTED ? 0.4 : 1
                                                        }}
                                                        title={canViewDetails ? `${leaveType.name}: ${leave.startDate} - ${leave.endDate} (${leave.status})` : 'Indisponível'}
                                                    >
                                                        {canViewDetails && leave.status === AbsenceStatus.PENDING && <Clock size={12} />}
                                                        {canViewDetails && leave.status === AbsenceStatus.APPROVED && <CheckCircle size={10} />}
                                                        {canViewDetails && leave.status === AbsenceStatus.REJECTED && <XCircle size={10} />}

                                                        {!canViewDetails && <span className="text-[9px]">AUSENTE</span>}
                                                    </div>
                                                ) : holidayInfo.isHoliday ? (
                                                    <span
                                                        className="text-[9px] font-extrabold text-amber-900 bg-amber-100 px-1 py-0.5 rounded border border-amber-300 block truncate"
                                                        title={`Feriado: ${holidayInfo.name}`}
                                                    >
                                                        FERIADO
                                                    </span>
                                                ) : scheduleDetails.label ? (
                                                    <span className="text-[10px] text-gray-400">{scheduleDetails.label}</span>
                                                ) : isWeekend ? (
                                                    <span className="text-[10px] text-gray-300">-</span>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : !needsConsent ? (
                /* MONTH VIEW GRID */
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, i) => (
                            <div key={day} className={`py-3 text-center text-xs font-bold uppercase ${i === 0 || i === 6 ? 'text-gray-400 bg-gray-100' : 'text-gray-600'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {(() => {
                            const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0-6
                            const matrix = [];

                            // Padding days from prev month
                            for (let i = 0; i < firstDayOfMonth; i++) {
                                matrix.push(<div key={`pad-${i}`} className="min-h-[120px] bg-gray-50/50 border-b border-r border-gray-100"></div>);
                            }

                            // Actual days
                            for (let i = 1; i <= daysInMonth; i++) {
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                                const d = new Date(year, month, i);
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                const holidayInfo = checkIsHoliday(d, holidays);

                                // Find absences for this day
                                const dayAbsences = filteredUsers.map(u => {
                                    const leave = getLeaveForUserOnDate(u.id, dateStr);
                                    if (!leave) return null;
                                    const type = getLeaveTypeById(leave.leaveTypeId);
                                    return { user: u, leave, type };
                                }).filter((item): item is { user: User, leave: Leave, type: LeaveType | undefined } => item !== null && item.type !== undefined);

                                matrix.push(
                                    <div key={i} className={`min-h-[120px] border-b border-r border-gray-100 p-2 relative group hover:bg-gray-50 transition-colors ${holidayInfo.isHoliday ? 'bg-amber-50/40' : isWeekend ? 'bg-gray-50/30' : ''}`}>
                                        <div className={`text-right text-sm font-bold mb-1 flex items-center ${holidayInfo.isHoliday ? 'justify-between' : 'justify-end'} ${holidayInfo.isHoliday ? 'text-amber-800' : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {holidayInfo.isHoliday && (
                                                <span className="text-[9px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 truncate max-w-[80%]" title={holidayInfo.name}>
                                                    🎉 {holidayInfo.name}
                                                </span>
                                            )}
                                            <span>{i}</span>
                                        </div>

                                        <div className="space-y-1">
                                            {dayAbsences.map(({ user, leave, type }) => {
                                                const lastName = user.name.split(' ').pop() || user.name;
                                                const canViewDetails = !kioskMode && (isPrivileged || user.id === currentUser?.id || managedDepartments.includes(user.department || ''));

                                                return (
                                                    <div
                                                        key={`${user.id}-${leave.id}`}
                                                        onClick={(e) => { e.stopPropagation(); if (canViewDetails) handleLeaveClick(leave, user, true); }}
                                                        className={`text-[10px] px-2 py-0.5 rounded truncate font-medium cursor-pointer transition-opacity hover:opacity-80 flex items-center gap-1 ${!canViewDetails ? 'cursor-default' : ''}`}
                                                        style={{ backgroundColor: type?.color || '#ccc', color: '#fff' }}
                                                        title={`${user.name} - ${type?.name} (${leave.status})`}
                                                    >
                                                        {leave.status === AbsenceStatus.PENDING && <Clock size={10} className="shrink-0" />}
                                                        <span className="truncate w-full">{lastName}</span>
                                                    </div>
                                                );
                                            })}
                                            {dayAbsences.length > 4 && (
                                                <div className="text-[10px] text-gray-400 text-center italic leading-tight">
                                                    + {dayAbsences.length - 4} outros
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            // Padding end of month (optional, to complete row)
                            const totalCells = firstDayOfMonth + daysInMonth;
                            const remaining = 7 - (totalCells % 7);
                            if (remaining < 7) {
                                for (let i = 0; i < remaining; i++) {
                                    matrix.push(<div key={`pad-end-${i}`} className="min-h-[120px] bg-gray-50/50 border-b border-r border-gray-100"></div>);
                                }
                            }

                            return matrix;
                        })()}
                    </div>
                </div>
            ) : null}

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 flex-wrap text-xs text-gray-500">
                <span className="font-medium">Legenda:</span>
                {leaveTypes.map(lt => (
                    <div key={lt.id} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: lt.color }}></span>
                        <span>{lt.name}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm ring-2 ring-yellow-400 bg-gray-200"></div>
                    <span>Pendente</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <span>Conflito Dept.</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-400"></div>
                    <span>Feriado</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300"></div>
                    <span>Folga</span>
                </div>
            </div>

            {/* Stats Panel */}
            {!kioskMode && pendingCount > 0 && (
                <div className="mt-4 flex items-center gap-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <AlertTriangle size={20} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                        <strong>{pendingCount}</strong> pedido{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''} de aprovação
                    </span>
                </div>
            )}

            {!kioskMode && conflictDates.length > 0 && (
                <div className="mt-2 flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <AlertTriangle size={20} className="text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                        {conflictDates.length} dia{conflictDates.length > 1 ? 's' : ''} com múltiplas ausências no mesmo departamento
                    </span>
                </div>
            )}

            {/* Leave Detail Modal */}
            {showLeaveDetailModal && selectedLeave && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Detalhes da Ausência</h2>
                            <button onClick={() => { setShowLeaveDetailModal(false); setSelectedLeave(null); }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* User */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <img src={selectedUser.photoUrl || 'https://picsum.photos/40/40'} alt="" className="w-12 h-12 rounded-full" />
                                <div>
                                    <div className="font-bold text-gray-900">{selectedUser.name}</div>
                                    <div className="text-sm text-gray-500">{selectedUser.department} • {selectedUser.company}</div>
                                </div>
                            </div>

                            {/* Leave Type */}
                            {(() => {
                                const lt = getLeaveTypeById(selectedLeave.leaveTypeId);
                                return lt ? (
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: lt.color }}></span>
                                        <span className="font-bold text-gray-800">{lt.name}</span>
                                    </div>
                                ) : null;
                            })()}

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Início:</span>
                                    <p className="font-bold text-gray-800">{new Date(selectedLeave.startDate).toLocaleDateString('pt-PT')}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Fim:</span>
                                    <p className="font-bold text-gray-800">{new Date(selectedLeave.endDate).toLocaleDateString('pt-PT')}</p>
                                </div>
                            </div>

                            {/* Days Count */}
                            <div className="text-sm">
                                <span className="text-gray-500">Duração:</span>
                                <p className="font-bold text-gray-800">
                                    {Math.ceil((new Date(selectedLeave.endDate).getTime() - new Date(selectedLeave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
                                </p>
                            </div>

                            {/* Vacation Balance */}
                            <div className="text-sm p-3 bg-blue-50 rounded-lg">
                                <span className="text-blue-600">Saldo de Férias:</span>
                                <p className="font-bold text-blue-800">
                                    {(selectedUser.vacationDaysYearly || 22) - getVacationDaysUsed(selectedUser.id)} dias restantes de {selectedUser.vacationDaysYearly || 22}
                                </p>
                            </div>

                            {/* Notes */}
                            {selectedLeave.notes && (
                                <div className="text-sm">
                                    <span className="text-gray-500">Notas:</span>
                                    <p className="text-gray-800 italic">"{selectedLeave.notes}"</p>
                                </div>
                            )}

                            {/* Status Badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${selectedLeave.status === AbsenceStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                selectedLeave.status === AbsenceStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {selectedLeave.status === AbsenceStatus.PENDING && <Clock size={14} />}
                                {selectedLeave.status === AbsenceStatus.APPROVED && <CheckCircle size={14} />}
                                {selectedLeave.status === AbsenceStatus.REJECTED && <XCircle size={14} />}
                                {selectedLeave.status}
                            </div>
                        </div>

                        {/* Actions */}
                        {selectedLeave.status === AbsenceStatus.PENDING && onUpdateLeave && (
                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    onClick={handleRejectLeave}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-50 transition-colors"
                                >
                                    <XCircle size={18} /> Rejeitar
                                </button>
                                <button
                                    onClick={handleApproveLeave}
                                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-colors"
                                >
                                    <CheckCircle size={18} /> Aprovar
                                </button>
                            </div>
                        )}

                        {selectedLeave.status !== AbsenceStatus.PENDING && (
                            <div className="p-6 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => { setShowLeaveDetailModal(false); setSelectedLeave(null); }}
                                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Leave Modal */}
            {showAddModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Adicionar Ausência</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* User */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Colaborador</label>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <img src={selectedUser.photoUrl || 'https://picsum.photos/40/40'} alt="" className="w-10 h-10 rounded-full" />
                                    <div>
                                        <div className="font-medium text-gray-900">{selectedUser.name}</div>
                                        <div className="text-xs text-gray-500">{selectedUser.department}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Leave Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Ausência</label>
                                <div className="flex flex-wrap gap-2">
                                    {leaveTypes.map(lt => (
                                        <button
                                            key={lt.id}
                                            type="button"
                                            onClick={() => setSelectedLeaveType(lt.id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2 ${selectedLeaveType === lt.id ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400 opacity-100 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                            style={{ backgroundColor: lt.color + '20', color: lt.color }}
                                        >
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color }}></span>
                                            {lt.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Início</label>
                                    <input
                                        type="date"
                                        value={selectedDates.start}
                                        onChange={(e) => setSelectedDates(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Fim</label>
                                    <input
                                        type="date"
                                        value={selectedDates.end}
                                        onChange={(e) => setSelectedDates(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Quorum Analysis (real-time) */}
                            {selectedUser?.department && selectedDates.start && (
                                <QuorumAnalyzer
                                    departmentName={selectedUser.department}
                                    startDate={selectedDates.start}
                                    endDate={selectedDates.end || selectedDates.start}
                                    users={users}
                                    leaves={leaves}
                                    leaveTypes={leaveTypes}
                                    departments={departments}
                                    excludeUserId={selectedUser.id}
                                    minQuorumPercentage={70}
                                    compact={false}
                                    showAbsentList={true}
                                />
                            )}

                            {/* Backup User Selection */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                    <UserCheck size={16} className="text-emerald-600" />
                                    Back-up (quem fará cobertura)
                                </label>
                                <SearchableSelect
                                    options={[
                                        { id: '', label: 'Nenhum selecionado' },
                                        ...users
                                            .filter(u =>
                                                u.id !== selectedUser?.id &&
                                                u.status === UserStatus.ACTIVE &&
                                                u.department === selectedUser?.department
                                            )
                                            .map(u => ({
                                                id: u.id,
                                                label: u.name,
                                                sublabel: u.role
                                            }))
                                    ]}
                                    value={selectedBackupUserId || ''}
                                    onChange={(id) => setSelectedBackupUserId(id ? Number(id) : null)}
                                    placeholder="Pesquisar back-up..."
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    O back-up será notificado sobre a cobertura durante a sua ausência.
                                </p>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Notas (Opcional)</label>
                                <textarea
                                    value={leaveNotes}
                                    onChange={(e) => setLeaveNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 resize-none"
                                    placeholder="Justificação ou observações..."
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                            <button onClick={handleSaveLeave} disabled={!selectedLeaveType} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-colors ${selectedLeaveType ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                <Save size={18} /> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamCalendar;
