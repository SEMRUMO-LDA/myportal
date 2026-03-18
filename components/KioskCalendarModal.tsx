import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, LayoutGrid, Info, Download, TreePalm, Calendar as CalendarIcon } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addYears,
    subYears,
    startOfYear,
    endOfYear,
    eachMonthOfInterval,
    isToday,
    parseISO
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { User, Leave, LeaveType, ScheduleTemplate } from '../types';
import { getEffectiveScheduleDay } from '../utils/scheduleUtils';

interface KioskCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    leaves: Leave[];
    leaveTypes: LeaveType[];
    scheduleTemplates?: ScheduleTemplate[];
}

const KioskCalendarModal: React.FC<KioskCalendarModalProps> = ({ isOpen, onClose, user, leaves, leaveTypes, scheduleTemplates = [] }) => {
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
    const [currentDate, setCurrentDate] = useState(new Date());

    const userLeaves = useMemo(() => {
        return leaves.filter(l => l.userId === user.id);
    }, [leaves, user.id]);

    const getLeaveForDate = (date: Date) => {
        return userLeaves.find(l => {
            const start = parseISO(l.startDate);
            const end = l.endDate ? parseISO(l.endDate) : start;
            return isSameDay(date, start) || (date >= start && date <= end);
        });
    };

    const getLeaveTypeColor = (leaveTypeId: number) => {
        const type = leaveTypes.find(t => t.id === leaveTypeId);
        if (!type) return 'bg-gray-400';

        const lowerName = type.name.toLowerCase();
        if (lowerName.includes('férias') || lowerName.includes('vacation')) return 'bg-emerald-500';
        if (lowerName.includes('médica') || lowerName.includes('doença')) return 'bg-rose-500';
        if (lowerName.includes('folga')) return 'bg-blue-500';
        if (lowerName.includes('formação')) return 'bg-indigo-500';
        return 'bg-amber-500';
    };

    const handleExportICal = () => {
        const icsEvents = userLeaves.map(l => {
            const start = parseISO(l.startDate);
            const end = l.endDate ? parseISO(l.endDate) : start;
            const type = leaveTypes.find(t => t.id === l.leaveTypeId)?.name || 'Ausência';

            // Format for iCal: YYYYMMDD
            const formatDate = (date: Date) => format(date, "yyyyMMdd");

            return [
                'BEGIN:VEVENT',
                `SUMMARY:${type} - ${user.name}`,
                `DTSTART;VALUE=DATE:${formatDate(start)}`,
                `DTEND;VALUE=DATE:${formatDate(new Date(end.getTime() + 86400000))}`, // End is exclusive in iCal
                'STATUS:' + (l.status === 'APPROVED' ? 'CONFIRMED' : 'TENTATIVE'),
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
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `calendario_ferias_${user.name.replace(/\s+/g, '_').toLowerCase()}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    const renderMonthlyView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
        const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

        return (
            <div className="flex flex-col h-full animate-in fade-in zoom-in duration-300">
                <div className="grid grid-cols-7 gap-1 md:gap-4 mb-2 md:mb-4">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest py-2">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-4 flex-1">
                    {calendarDays.map((day, idx) => {
                        const leave = getLeaveForDate(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isDayToday = isToday(day);

                        return (
                            <div
                                key={day.toString()}
                                className={`relative aspect-square md:aspect-auto md:h-24 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center border-2 transition-all shadow-sm ${isCurrentMonth ? 'bg-white border-gray-100 hover:border-gray-200' : 'bg-gray-50/50 border-transparent opacity-20 pointer-events-none'
                                    } ${isDayToday ? 'border-brand-500 ring-4 ring-brand-50' : ''}`}
                            >
                                <span className={`text-xl md:text-2xl font-black ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'} ${isDayToday ? 'text-brand-600' : ''}`}>
                                    {format(day, 'd')}
                                </span>

                                {leave && isCurrentMonth && (
                                    <div className={`mt-1 md:mt-2 w-1.5 h-1.5 md:w-10 md:h-1.5 rounded-full ${getLeaveTypeColor(leave.leaveTypeId)} ${leave.status === 'PENDING' ? 'animate-pulse opacity-50' : ''}`}></div>
                                )}

                                {leave && isCurrentMonth && (
                                    <div className="hidden md:block mt-2">
                                        <span className={`text-[10px] font-black uppercase tracking-tighter truncate max-w-full px-2 ${leave.status === 'PENDING' ? 'text-amber-600' : 'text-gray-500'}`}>
                                            {(() => {
                                                const userTemplate = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);
                                                const scheduleDay = getEffectiveScheduleDay(day, user, userTemplate);
                                                const isOff = scheduleDay?.isOff ?? (day.getDay() === 0 || day.getDay() === 6);
                                                return isOff ? 'FOLGA' : (leaveTypes.find(t => t.id === leave.leaveTypeId)?.name || 'Ausência');
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderYearlyView = () => {
        const yearStart = startOfYear(currentDate);
        const months = eachMonthOfInterval({
            start: yearStart,
            end: endOfYear(yearStart)
        });

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 h-full overflow-y-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {months.map((month) => {
                    const monthStart = startOfMonth(month);
                    const monthEnd = endOfMonth(monthStart);
                    const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) });

                    return (
                        <div key={month.toString()} className="bg-white rounded-[2rem] p-4 md:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 text-center">
                                {format(month, 'MMMM', { locale: pt })}
                            </h3>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day) => {
                                    const leave = getLeaveForDate(day);
                                    const isCurrentMonth = isSameMonth(day, month);
                                    if (!isCurrentMonth) return <div key={day.toString()} className="w-full aspect-square"></div>;

                                    return (
                                        <div
                                            key={day.toString()}
                                            className={`w-full aspect-square rounded-full flex items-center justify-center text-[8px] font-black transition-colors ${leave ? `${getLeaveTypeColor(leave.leaveTypeId)} text-white` : 'text-gray-500 hover:bg-gray-50'
                                                } ${isToday(day) && !leave ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : ''}`}
                                        >
                                            {format(day, 'd')}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-[#0B2147]/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-0 md:p-6 lg:p-12 animate-in fade-in duration-300">

            <div className="w-full h-full max-w-7xl bg-white md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/20">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center transition-all z-20 group"
                >
                    <X size={24} className="text-gray-600 group-hover:rotate-90 transition-transform" />
                </button>

                {/* Header Section */}
                <header className="p-6 md:p-12 pb-4 md:pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 shadow-sm">
                                <CalendarIcon size={28} />
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">Calendário</h2>
                        </div>
                        <p className="text-gray-500 font-bold ml-1 text-lg">Visualize e planeie as suas ausências.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={handleExportICal}
                            className="px-6 py-3 bg-gray-900 text-white hover:bg-black rounded-2xl font-black text-sm transition-all flex items-center gap-2 shadow-xl shadow-gray-200 active:scale-95"
                        >
                            <Download size={18} /> Exportar iCal
                        </button>

                        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <LayoutGrid size={16} /> Mensal
                            </button>
                            <button
                                onClick={() => setViewMode('yearly')}
                                className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${viewMode === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Info size={16} /> Anual
                            </button>
                        </div>
                    </div>
                </header>

                {/* Controls Section */}
                <div className="px-6 md:px-12 flex items-center justify-between mb-6 md:mb-10">
                    <div className="flex items-center gap-6">
                        <h3 className="text-2xl md:text-4xl font-black text-gray-900 min-w-[240px] tracking-tighter">
                            {viewMode === 'monthly'
                                ? format(currentDate, 'MMMM yyyy', { locale: pt }).charAt(0).toUpperCase() + format(currentDate, 'MMMM yyyy', { locale: pt }).slice(1)
                                : format(currentDate, 'yyyy')
                            }
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => viewMode === 'monthly' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subYears(currentDate, 1))}
                                className="w-10 h-10 md:w-14 md:h-14 border-2 border-gray-100 hover:border-gray-200 rounded-2xl flex items-center justify-center transition-all hover:bg-gray-50 active:scale-90"
                            >
                                <ChevronLeft size={24} className="text-gray-400" />
                            </button>
                            <button
                                onClick={() => setCurrentDate(new Date())}
                                className="px-6 h-10 md:h-14 border-2 border-gray-100 hover:border-gray-200 rounded-2xl flex items-center justify-center transition-all hover:bg-gray-50 text-xs font-black uppercase text-gray-400 active:scale-90"
                            >
                                Hoje
                            </button>
                            <button
                                onClick={() => viewMode === 'monthly' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addYears(currentDate, 1))}
                                className="w-10 h-10 md:w-14 md:h-14 border-2 border-gray-100 hover:border-gray-200 rounded-2xl flex items-center justify-center transition-all hover:bg-gray-50 active:scale-90"
                            >
                                <ChevronRight size={24} className="text-gray-400" />
                            </button>
                        </div>
                    </div>

                    <div className="hidden xl:flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Férias</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-rose-500 shadow-lg shadow-rose-200"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Doença</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-amber-500 shadow-lg shadow-amber-200"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Outros</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 opacity-50 animate-pulse shadow-lg shadow-emerald-200"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pendente</span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 px-6 md:px-12 pb-12 overflow-hidden overflow-y-auto">
                    {viewMode === 'monthly' ? renderMonthlyView() : renderYearlyView()}
                </div>

                {/* Legend for Mobile */}
                <div className="xl:hidden p-6 bg-gray-50 flex items-center gap-6 overflow-x-auto whitespace-nowrap border-t border-gray-100">
                    <div className="flex items-center gap-2 min-w-max">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Férias</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-max">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Médica</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-max">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Outros</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KioskCalendarModal;
