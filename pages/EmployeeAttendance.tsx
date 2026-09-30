
import React, { useState, useMemo } from 'react';
import { User as UserType, TimeLog, TimeLogStatus, Leave, LeaveType, ScheduleTemplate } from '../types';
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Minus, TrendingUp, Coffee, TreePalm, Download } from 'lucide-react';
import Header from '../components/Header';
import { calculateVacationBalance } from '../components/VacationBalanceCard';
import { format, parseISO } from 'date-fns';
import { getEffectiveScheduleDay } from '../utils/scheduleUtils';

interface EmployeeAttendanceProps {
    user: UserType | null;
    logs: TimeLog[];
    leaves?: Leave[];
    leaveTypes?: LeaveType[];
    scheduleTemplates?: ScheduleTemplate[];
}

const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({ user, logs, leaves = [], leaveTypes = [], scheduleTemplates = [] }) => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Filter logs for current user and selected month
    const userLogs = useMemo(() => {
        if (!user) return [];
        return logs.filter(log => {
            if (Number(log.userId) !== Number(user.id)) return false;
            const [y, m] = (log.date || '').split('-').map(Number);
            return y === selectedYear && (m - 1) === selectedMonth;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [logs, user, selectedMonth, selectedYear]);

    // Filter leaves for current user and selected month
    const userLeaves = useMemo(() => {
        if (!user) return [];
        const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const monthEnd = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        return leaves.filter(leave => {
            if (Number(leave.userId) !== Number(user.id) || leave.status !== 'APPROVED') return false;
            return leave.startDate <= monthEnd && leave.endDate >= monthStart;
        });
    }, [leaves, user, selectedMonth, selectedYear]);

    // Calculate statistics
    const stats = useMemo(() => {
        const daysWorked = new Set(userLogs.map(l => l.date)).size;
        const totalHours = userLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
        const lateEntries = userLogs.filter(l => l.status === TimeLogStatus.LATE).length;
        const incompleteDays = userLogs.filter(l => !l.checkOut).length;

        return { daysWorked, totalHours, lateEntries, incompleteDays };
    }, [userLogs]);

    const vacationBalance = useMemo(() => {
        if (!user) return null;
        return calculateVacationBalance(user, leaves, user.id, leaveTypes, scheduleTemplates);
    }, [user, leaves, leaveTypes, scheduleTemplates]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const firstDay = new Date(selectedYear, selectedMonth, 1);
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days: { date: Date | null; log: TimeLog | undefined }[] = [];

        // Add empty slots for days before the 1st
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ date: null, log: undefined });
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const date = new Date(selectedYear, selectedMonth, day, 12, 0, 0);
            const log = userLogs.find(l => l.date === dateStr);
            const leave = userLeaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate);

            // Resolve day off status
            const userTemplate = scheduleTemplates.find(t => t.id === user?.scheduleTemplateId);
            const scheduleDay = getEffectiveScheduleDay(date, user!, userTemplate);
            const isOff = scheduleDay?.isOff ?? (date.getDay() === 0 || date.getDay() === 6);

            days.push({
                date,
                log,
                isOff,
                leave: leave ? {
                    ...leave,
                    typeInfo: leaveTypes.find(t => t.id === leave.leaveTypeId)
                } : undefined
            } as any);
        }

        return days;
    }, [selectedMonth, selectedYear, userLogs, userLeaves, leaveTypes]);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const goToPreviousMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const goToNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const getStatusColor = (item: any, date: Date | null) => {
        if (!date) return '';
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isFuture = date > today;
        const { log, leave } = item;

        if (leave) {
            // Use leave color with low opacity for background
            return `bg-[${leave.typeInfo?.color || '#10b981'}]/10 text-gray-900 border-2 border-[${leave.typeInfo?.color || '#10b981'}]/30`;
        }

        if (isFuture) return 'bg-gray-50 text-gray-300';
        if (isWeekend && !log) return 'bg-gray-50 text-gray-400';
        if (!log) return 'bg-red-50 text-red-600'; // No log = absent
        if (log.status === TimeLogStatus.LATE) return 'bg-orange-50 text-orange-600';
        if (!log.checkOut) return 'bg-yellow-50 text-yellow-600'; // Incomplete
        return 'bg-green-50 text-green-600'; // Complete
    };

    const getStatusIcon = (item: any, date: Date | null) => {
        if (!date) return null;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isFuture = date > today;
        const { log, leave } = item;

        if (leave) {
            return <TreePalm size={14} style={{ color: leave.typeInfo?.color || '#10b981' }} />;
        }

        if (isFuture) return <Minus size={14} className="text-gray-300" />;
        if (isWeekend && !log) return <Minus size={14} className="text-gray-400" />;
        if (!log) return <XCircle size={14} className="text-red-500" />;
        if (log.status === TimeLogStatus.LATE) return <AlertCircle size={14} className="text-orange-500" />;
        if (!log.checkOut) return <Clock size={14} className="text-yellow-500" />;
        return <CheckCircle size={14} className="text-green-500" />;
    };

    const formatHours = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    const handleExportICal = () => {
        if (!user) return;

        // Use all approved leaves for export, not just current month
        const approvedLeaves = leaves.filter(l => Number(l.userId) === Number(user.id) && l.status === 'APPROVED');

        const icsEvents = approvedLeaves.map(l => {
            const start = parseISO(l.startDate);
            const end = l.endDate ? parseISO(l.endDate) : start;
            const type = leaveTypes.find(t => t.id === l.leaveTypeId)?.name || 'Ausência';

            const formatDate = (date: Date) => format(date, "yyyyMMdd");

            return [
                'BEGIN:VEVENT',
                `SUMMARY:${type} - ${user.name}`,
                `DTSTART;VALUE=DATE:${formatDate(start)}`,
                `DTEND;VALUE=DATE:${formatDate(new Date(end.getTime() + 86400000))}`,
                'STATUS:CONFIRMED',
                'END:VEVENT'
            ].join('\n');
        }).join('\n');

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Sem Rumo//My Portal//PT',
            'CALSCALE:GREGORIAN',
            icsEvents,
            'END:VCALENDAR'
        ].join('\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `calendario_pessoal_${user.name.replace(/\s+/g, '_').toLowerCase()}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!user) {
        return <div className="p-8 text-center text-gray-500">A carregar...</div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <Header
                title="Calendário Pessoal"
                subtitle="Histórico de picagens e assiduidade"
                hideControls
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-brand-600 mb-2">
                        <Calendar size={18} />
                        <span className="text-xs font-bold uppercase">Dias Trabalhados</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.daysWorked}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Clock size={18} />
                        <span className="text-xs font-bold uppercase">Horas Totais</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatHours(stats.totalHours)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <AlertCircle size={18} />
                        <span className="text-xs font-bold uppercase">Atrasos</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.lateEntries}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <TrendingUp size={18} />
                        <span className="text-xs font-bold uppercase">Incompletos</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.incompleteDays}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                        <TreePalm size={18} />
                        <span className="text-xs font-bold uppercase">Férias</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{vacationBalance?.remaining || 0} dias</p>
                </div>
            </div>

            {/* Month Navigation & View Toggle */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold text-gray-800 min-w-[140px] text-center">
                            {monthNames[selectedMonth]} {selectedYear}
                        </h3>
                        <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportICal}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                        >
                            <Download size={16} /> Exportar iCal
                        </button>

                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Calendário
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Lista
                            </button>
                        </div>
                    </div>
                </div>

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <div className="p-4">
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map(day => (
                                <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-center transition-all ${item.date ? getStatusColor(item, item.date) : ''} ${item.date && (item as any).leave ? 'shadow-sm' : ''}`}
                                >
                                    {item.date && (
                                        <>
                                            <span className="text-sm font-bold">{item.date.getDate()}</span>
                                            <div className="mt-0.5 flex flex-col items-center">
                                                {getStatusIcon(item, item.date)}
                                                {(item as any).leave && (
                                                    <span className="text-[7px] font-black uppercase tracking-tighter text-center leading-none mt-0.5 truncate w-full px-0.5">
                                                        {(item as any).isOff ? 'FOLGA' : ((item as any).leave.typeInfo?.name || 'Ausência')}
                                                    </span>
                                                )}
                                                {item.log && (
                                                    <>
                                                        <span className="text-[9px] mt-0.5 font-medium">
                                                            {item.log.checkIn}
                                                        </span>
                                                        {item.log.breakStart && item.log.breakEnd && (
                                                            <span className="text-[8px] mt-0.5 text-blue-500 flex items-center gap-0.5" title={`Pausa: ${item.log.breakStart}–${item.log.breakEnd}`}>
                                                                <Coffee size={8} /> {item.log.breakStart}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100 text-xs">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle size={14} className="text-green-500" />
                                <span className="text-gray-600">Completo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <AlertCircle size={14} className="text-orange-500" />
                                <span className="text-gray-600">Atraso</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} className="text-yellow-500" />
                                <span className="text-gray-600">Incompleto</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <XCircle size={14} className="text-red-500" />
                                <span className="text-gray-600">Ausência</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <TreePalm size={14} className="text-emerald-500" />
                                <span className="text-gray-600 font-bold">Férias / Ausências</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="divide-y divide-gray-100">
                        {userLogs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Sem registos para este mês.</p>
                            </div>
                        ) : (
                            userLogs.map(log => (
                                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${log.status === TimeLogStatus.LATE ? 'bg-orange-100 text-orange-600' :
                                            !log.checkOut ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-green-100 text-green-600'
                                            }`}>
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {new Date((log.date || '') + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {log.checkInLocation || 'Localização não registada'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                            <span className="text-green-600">{log.checkIn}</span>
                                            <span className="text-gray-400">→</span>
                                            <span className={log.checkOut ? 'text-red-600' : 'text-gray-300'}>
                                                {log.checkOut || '--:--'}
                                            </span>
                                        </div>
                                        {log.totalHours && log.totalHours > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Total: {formatHours(log.totalHours)}
                                            </p>
                                        )}
                                        {log.breakStart && log.breakEnd && (
                                            <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                                                <Coffee size={11} /> {log.breakStart}–{log.breakEnd}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeAttendance;
