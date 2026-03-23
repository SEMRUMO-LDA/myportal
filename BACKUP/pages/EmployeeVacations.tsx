import React, { useMemo } from 'react';
import { Calendar, Download, ExternalLink, Mail } from 'lucide-react';
import Header from '../components/Header';
import VacationBalanceCard, { calculateVacationBalance } from '../components/VacationBalanceCard';
import { User, Leave, LeaveType, ScheduleTemplate } from '../types';
import { downloadICS as downloadICSService, addToGoogleCalendar, addToOutlookCalendar } from '../services/calendarIntegration';

interface EmployeeVacationsProps {
    user: User;
    leaves: Leave[];
    leaveTypes: LeaveType[];
    scheduleTemplates?: ScheduleTemplate[];
    onRequestVacation?: () => void;
}

const EmployeeVacations: React.FC<EmployeeVacationsProps> = ({
    user,
    leaves,
    leaveTypes,
    scheduleTemplates = [],
    onRequestVacation
}) => {
    const currentYear = new Date().getFullYear();

    // Filter user's leaves
    const myLeaves = useMemo(() => {
        return leaves
            .filter(l => l.userId === user.id)
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [leaves, user.id]);

    // Approved leaves for this year
    const approvedThisYear = useMemo(() => {
        return myLeaves.filter(l =>
            l.status === 'APPROVED' &&
            new Date(l.startDate).getFullYear() === currentYear
        );
    }, [myLeaves, currentYear]);

    // Pending leaves
    const pendingLeaves = useMemo(() => {
        return myLeaves.filter(l => l.status === 'PENDING');
    }, [myLeaves]);

    // Calculate vacation balance using the new helper
    const vacationBalance = useMemo(() => {
        return calculateVacationBalance(
            user,
            leaves,
            user.id,
            leaveTypes,
            scheduleTemplates
        );
    }, [user, leaves, leaveTypes, scheduleTemplates]);

    // Get leave type info
    const getLeaveType = (leaveTypeId: number) => {
        return leaveTypes.find(lt => lt.id === leaveTypeId);
    };

    // Format date helper
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Calculate days for a leave
    const calculateDays = (startDate: string, endDate: string) => {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    // Export handlers using the new calendar service
    const handleDownloadICS = () => {
        downloadICSService(approvedThisYear, user, leaveTypes);
    };

    const handleAddToGoogle = (leave: Leave) => {
        addToGoogleCalendar(leave, user, leaveTypes);
    };

    const handleAddToOutlook = (leave: Leave) => {
        addToOutlookCalendar(leave, user, leaveTypes);
    };

    return (
        <div className="p-8 w-full max-w-4xl mx-auto pb-20">
            <Header
                title="Minhas Férias"
                subtitle="Visualize e gira o seu calendário de férias"
            />

            {/* Vacation Balance Card (Full Version) */}
            <div className="mb-8">
                <VacationBalanceCard
                    balance={vacationBalance}
                    userName={user.name}
                    onRequestVacation={onRequestVacation}
                />
            </div>

            {/* Pending Leaves Alert */}
            {pendingLeaves.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                        <span className="animate-pulse">⏳</span>
                        {pendingLeaves.length} Pedido{pendingLeaves.length > 1 ? 's' : ''} Pendente{pendingLeaves.length > 1 ? 's' : ''}
                    </h4>
                    <div className="space-y-2">
                        {pendingLeaves.map(leave => {
                            const lt = getLeaveType(leave.leaveTypeId);
                            const days = calculateDays(leave.startDate, leave.endDate);
                            return (
                                <div key={leave.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-100">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: lt?.color || '#9CA3AF' }}
                                        />
                                        <span className="font-medium text-gray-800">{lt?.name || 'Ausência'}</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-sm text-gray-600">
                                            {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                                        </span>
                                        <span className="text-xs text-gray-400">({days} dias)</span>
                                    </div>
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                                        Aguarda Aprovação
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Export Buttons */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-brand-600" />
                    Exportar para Calendário
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Sincronize as suas férias aprovadas com o seu calendário pessoal para receber lembretes automáticos.
                </p>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleDownloadICS}
                        disabled={approvedThisYear.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={16} /> Download iCal (.ics)
                    </button>
                    <button
                        onClick={() => approvedThisYear.length > 0 && handleAddToGoogle(approvedThisYear[0])}
                        disabled={approvedThisYear.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ExternalLink size={16} /> Google Calendar
                    </button>
                    <button
                        onClick={() => approvedThisYear.length > 0 && handleAddToOutlook(approvedThisYear[0])}
                        disabled={approvedThisYear.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Mail size={16} /> Outlook
                    </button>
                </div>
            </div>

            {/* Approved Leaves List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4">
                    Férias Aprovadas de {currentYear}
                </h3>

                {approvedThisYear.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-400 italic">Ainda não tem férias aprovadas para este ano.</p>
                        {onRequestVacation && (
                            <button
                                onClick={onRequestVacation}
                                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                            >
                                Pedir Férias Agora
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {approvedThisYear.map(leave => {
                            const lt = getLeaveType(leave.leaveTypeId);
                            const days = calculateDays(leave.startDate, leave.endDate);
                            const isPast = new Date(leave.endDate) < new Date();

                            return (
                                <div
                                    key={leave.id}
                                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${isPast
                                        ? 'bg-gray-50 border-gray-100 opacity-70'
                                        : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`p-2 rounded-lg ${isPast ? 'bg-gray-200 text-gray-500' : 'bg-emerald-100 text-emerald-600'}`}
                                        >
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-800">
                                                    {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                                                </p>
                                                <span
                                                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                    style={{
                                                        backgroundColor: (lt?.color || '#9CA3AF') + '20',
                                                        color: lt?.color || '#9CA3AF'
                                                    }}
                                                >
                                                    {lt?.name || 'Ausência'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {days} dia{days > 1 ? 's' : ''}
                                                {leave.notes && <span className="italic ml-2">— "{leave.notes}"</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isPast ? (
                                            <span className="text-xs text-gray-400 font-medium">Concluído</span>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleAddToGoogle(leave)}
                                                    className="text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-emerald-100"
                                                    title="Adicionar ao Google Calendar"
                                                >
                                                    <ExternalLink size={14} /> Google
                                                </button>
                                                <button
                                                    onClick={() => handleAddToOutlook(leave)}
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-100"
                                                    title="Adicionar ao Outlook"
                                                >
                                                    <Mail size={14} /> Outlook
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeVacations;
