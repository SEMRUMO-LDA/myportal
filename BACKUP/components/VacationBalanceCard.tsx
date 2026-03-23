import React from 'react';
import { Calendar, Clock, AlertTriangle, TrendingUp, Gift, ArrowRight } from 'lucide-react';
import { VacationBalance, User, Leave, LeaveType, ScheduleTemplate } from '../types';
import { getEffectiveScheduleDay } from '../utils/scheduleUtils';

interface VacationBalanceCardProps {
    balance: VacationBalance;
    userName?: string;
    compact?: boolean;
    onRequestVacation?: () => void;
}

const VacationBalanceCard: React.FC<VacationBalanceCardProps> = ({
    balance,
    userName,
    compact = false,
    onRequestVacation
}) => {
    const hasExpiringDays = balance.expiringDays > 0 && balance.expiryDate;
    const expiryDateFormatted = balance.expiryDate
        ? new Date(balance.expiryDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
        : null;

    // Determine if remaining days are low (less than 5)
    const isLowBalance = balance.remaining <= 5 && balance.remaining > 0;
    const isZeroBalance = balance.remaining <= 0;

    // Progress calculation
    const usedPercentage = balance.total > 0 ? ((balance.used + balance.planned) / balance.total) * 100 : 0;

    if (compact) {
        // Compact version for headers/widgets
        return (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <Calendar className="text-emerald-600" size={20} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Saldo de Férias</p>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-bold ${isZeroBalance ? 'text-red-600' : isLowBalance ? 'text-amber-600' : 'text-emerald-700'}`}>
                                {balance.remaining}
                            </span>
                            <span className="text-sm text-gray-400">/ {balance.total} dias</span>
                        </div>
                    </div>
                </div>
                {hasExpiringDays && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                        <AlertTriangle size={14} />
                        {balance.expiringDays}d expiram {expiryDateFormatted}
                    </div>
                )}
                {onRequestVacation && (
                    <button
                        onClick={onRequestVacation}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        Pedir Férias <ArrowRight size={16} />
                    </button>
                )}
            </div>
        );
    }

    // Full version
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Saldo de Férias</h3>
                            {userName && <p className="text-emerald-100 text-sm">{userName}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-black ${isZeroBalance ? 'text-red-200' : ''}`}>
                            {balance.remaining}
                        </div>
                        <p className="text-emerald-100 text-sm">dias restantes</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                    {/* Used portion */}
                    <div
                        className="absolute left-0 top-0 h-full bg-white/60 transition-all duration-500"
                        style={{ width: `${Math.min((balance.used / balance.total) * 100, 100)}%` }}
                    />
                    {/* Planned portion */}
                    <div
                        className="absolute top-0 h-full bg-white/30 transition-all duration-500"
                        style={{
                            left: `${(balance.used / balance.total) * 100}%`,
                            width: `${Math.min((balance.planned / balance.total) * 100, 100 - (balance.used / balance.total) * 100)}%`
                        }}
                    />
                </div>
                <div className="flex justify-between text-xs text-emerald-100 mt-2">
                    <span>Gozados: {balance.used}d</span>
                    <span>Planeados: {balance.planned}d</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 divide-x divide-gray-100">
                <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Gift size={16} />
                    </div>
                    <p className="text-xl font-bold text-gray-800">{balance.annual}</p>
                    <p className="text-xs text-gray-400">Anuais</p>
                </div>
                <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                        <TrendingUp size={16} />
                    </div>
                    <p className="text-xl font-bold text-gray-800">{balance.carryover}</p>
                    <p className="text-xs text-gray-400">Transitados</p>
                </div>
                <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                        <Clock size={16} />
                    </div>
                    <p className="text-xl font-bold text-gray-800">{balance.used}</p>
                    <p className="text-xs text-gray-400">Gozados</p>
                </div>
                <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                        <Calendar size={16} />
                    </div>
                    <p className="text-xl font-bold text-gray-800">{balance.planned}</p>
                    <p className="text-xs text-gray-400">Planeados</p>
                </div>
            </div>

            {/* Expiring Days Alert */}
            {hasExpiringDays && (
                <div className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertTriangle className="text-amber-600" size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">
                            {balance.expiringDays} dias a expirar!
                        </p>
                        <p className="text-sm text-amber-600">
                            Tens {balance.expiringDays} dias do ano anterior que expiram a {expiryDateFormatted}.
                            Agenda-os agora para não os perderes!
                        </p>
                    </div>
                    {onRequestVacation && (
                        <button
                            onClick={onRequestVacation}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-colors whitespace-nowrap"
                        >
                            Agendar Agora
                        </button>
                    )}
                </div>
            )}

            {/* Adjustments note if any */}
            {balance.adjustments !== 0 && (
                <div className="px-4 pb-4">
                    <p className="text-xs text-gray-400 text-center">
                        Inclui ajuste de {balance.adjustments > 0 ? '+' : ''}{balance.adjustments} dias
                    </p>
                </div>
            )}
        </div>
    );
};

// Helper function to calculate vacation balance from user data and leaves
export const calculateVacationBalance = (
    user: User,
    leaves: Leave[],
    userId: number,
    leaveTypes: LeaveType[],
    scheduleTemplates: ScheduleTemplate[],
    expiryMonth: number = 3, // Default: March 31st
    expiryDay: number = 31
): VacationBalance => {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const annual = user.vacationDaysYearly ?? 22;
    const carryover = user.vacationDaysCarryover ?? 0;
    const adjustments = user.vacationAdjustments ?? 0;
    const total = annual + carryover + adjustments;

    // Get leave types that deduct vacation
    const vacationLeaveTypeIds = leaveTypes
        .filter(lt => lt.deductsVacation)
        .map(lt => lt.id);

    // Filter user's approved leaves that deduct vacation
    const userVacationLeaves = leaves.filter(l =>
        l.userId === userId &&
        l.status === 'APPROVED' &&
        vacationLeaveTypeIds.includes(l.leaveTypeId)
    );

    // Calculate used (past) and planned (future) days
    let used = 0;
    let planned = 0;

    // Find the user's template
    const userTemplate = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);

    userVacationLeaves.forEach(leave => {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);

        // Only count days in current year
        const effectiveStart = startDate.getFullYear() < currentYear
            ? new Date(currentYear, 0, 1)
            : startDate;
        const effectiveEnd = endDate.getFullYear() > currentYear
            ? new Date(currentYear, 11, 31)
            : endDate;

        if (effectiveEnd < effectiveStart) return;

        // Iterate through each day in the range
        const iterDate = new Date(effectiveStart);
        iterDate.setHours(0, 0, 0, 0);
        const limitDate = new Date(effectiveEnd);
        limitDate.setHours(0, 0, 0, 0);

        while (iterDate <= limitDate) {
            // Check if this day is a day off
            const daySchedule = getEffectiveScheduleDay(iterDate, user, userTemplate);
            const isOff = daySchedule?.isOff ?? (iterDate.getDay() === 0 || iterDate.getDay() === 6); // Fallback to weekends if no template

            if (!isOff) {
                if (iterDate < today) {
                    used++;
                } else if (iterDate > today) {
                    planned++;
                } else {
                    // Today
                    used++;
                }
            }

            // Move to next day
            iterDate.setDate(iterDate.getDate() + 1);
        }
    });

    const remaining = Math.max(0, total - used - planned);

    // Calculate expiring days (carryover that expires)
    let expiringDays = 0;
    let expiryDate: string | null = null;

    if (carryover > 0) {
        const expiryDateObj = new Date(currentYear, expiryMonth - 1, expiryDay);
        if (expiryDateObj > today) {
            // Days haven't expired yet
            // Carryover expires if not used by expiry date
            // We consider carryover days as the first to be used
            const unusedCarryover = Math.max(0, carryover - used);
            if (unusedCarryover > 0) {
                expiringDays = unusedCarryover;
                expiryDate = expiryDateObj.toISOString().split('T')[0];
            }
        }
    }

    return {
        annual,
        carryover,
        adjustments,
        total,
        used,
        planned,
        remaining,
        expiringDays,
        expiryDate
    };
};

export default VacationBalanceCard;
