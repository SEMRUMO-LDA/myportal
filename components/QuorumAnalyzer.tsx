import React, { useMemo } from 'react';
import { Users, AlertTriangle, CheckCircle, XCircle, UserMinus, Calendar } from 'lucide-react';
import { User, Leave, LeaveType, Department, QuorumAnalysis, AbsentUserInfo, QuorumAlertLevel } from '../types';

interface QuorumAnalyzerProps {
    departmentId?: number;
    departmentName?: string;
    startDate: string;
    endDate: string;
    users: User[];
    leaves: Leave[];
    leaveTypes: LeaveType[];
    departments: Department[];
    excludeUserId?: number; // Exclude the requesting user from calculations
    minQuorumPercentage?: number; // Default 70%
    compact?: boolean;
    showAbsentList?: boolean;
}

// Calculate quorum analysis for a department on specific dates
export const calculateQuorum = (
    departmentName: string,
    startDate: string,
    endDate: string,
    users: User[],
    leaves: Leave[],
    leaveTypes: LeaveType[],
    excludeUserId?: number,
    minQuorumPercentage: number = 70
): QuorumAnalysis => {
    // Get all active users in the department
    const departmentUsers = users.filter(u =>
        u.department === departmentName &&
        u.status === 'ACTIVE' &&
        u.id !== excludeUserId
    );

    const totalTeamSize = departmentUsers.length;

    // Get leaves that overlap with the date range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const overlappingLeaves = leaves.filter(leave => {
        if (leave.status === 'REJECTED') return false;

        const user = users.find(u => u.id === leave.userId);
        if (!user || user.department !== departmentName) return false;
        if (leave.userId === excludeUserId) return false;

        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);

        // Check if date ranges overlap
        return leaveStart <= endDateObj && leaveEnd >= startDateObj;
    });

    // Build absent users info
    const absentUsers: AbsentUserInfo[] = overlappingLeaves.map(leave => {
        const user = users.find(u => u.id === leave.userId);
        const leaveType = leaveTypes.find(lt => lt.id === leave.leaveTypeId);

        return {
            id: leave.userId,
            name: user?.name || 'Desconhecido',
            leaveType: leaveType?.name || 'Ausência',
            leaveTypeColor: leaveType?.color || '#9CA3AF',
            startDate: leave.startDate,
            endDate: leave.endDate
        };
    });

    // Remove duplicates (same user with multiple leaves)
    const uniqueAbsentUserIds = new Set(absentUsers.map(u => u.id));
    const availableCount = totalTeamSize - uniqueAbsentUserIds.size;
    const percentAvailable = totalTeamSize > 0
        ? Math.round((availableCount / totalTeamSize) * 100)
        : 100;

    // Determine alert level
    let alertLevel: QuorumAlertLevel = 'ok';
    if (percentAvailable < minQuorumPercentage) {
        alertLevel = 'critical';
    } else if (percentAvailable < minQuorumPercentage + 15) {
        alertLevel = 'warning';
    }

    return {
        totalTeamSize,
        availableCount,
        percentAvailable,
        absentUsers,
        alertLevel,
        minQuorumPercentage
    };
};

const QuorumAnalyzer: React.FC<QuorumAnalyzerProps> = ({
    departmentId,
    departmentName,
    startDate,
    endDate,
    users,
    leaves,
    leaveTypes,
    departments,
    excludeUserId,
    minQuorumPercentage = 70,
    compact = false,
    showAbsentList = true
}) => {
    // Get department name from ID if not provided
    const deptName = useMemo(() => {
        if (departmentName) return departmentName;
        const dept = departments.find(d => d.id === departmentId);
        return dept?.name || '';
    }, [departmentName, departmentId, departments]);

    // Calculate quorum
    const analysis = useMemo(() => {
        if (!deptName || !startDate || !endDate) return null;
        return calculateQuorum(
            deptName,
            startDate,
            endDate,
            users,
            leaves,
            leaveTypes,
            excludeUserId,
            minQuorumPercentage
        );
    }, [deptName, startDate, endDate, users, leaves, leaveTypes, excludeUserId, minQuorumPercentage]);

    if (!analysis || analysis.totalTeamSize === 0) {
        return null;
    }

    const alertColors = {
        ok: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle },
        warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
        critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle }
    };

    const colors = alertColors[analysis.alertLevel];
    const AlertIcon = colors.icon;

    // Format date range
    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        if (start === end) {
            return s.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
        }
        return `${s.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} - ${e.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`;
    };

    if (compact) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                <AlertIcon size={16} className={colors.text} />
                <span className={`text-sm font-medium ${colors.text}`}>
                    {analysis.percentAvailable}% equipa disponível
                </span>
                {analysis.absentUsers.length > 0 && (
                    <span className="text-xs text-gray-500">
                        ({analysis.absentUsers.length} ausente{analysis.absentUsers.length > 1 ? 's' : ''})
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${analysis.alertLevel === 'ok' ? 'bg-green-100' : analysis.alertLevel === 'warning' ? 'bg-amber-100' : 'bg-red-100'}`}>
                        <Users size={20} className={colors.text} />
                    </div>
                    <div>
                        <h4 className={`font-bold ${colors.text}`}>
                            Análise de Quórum - {deptName}
                        </h4>
                        <p className="text-sm text-gray-500">
                            {formatDateRange(startDate, endDate)}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-black ${colors.text}`}>
                        {analysis.percentAvailable}%
                    </div>
                    <p className="text-xs text-gray-500">disponível</p>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="px-4 pb-3">
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-gray-600">{analysis.totalTeamSize} na equipa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="text-gray-600">{analysis.availableCount} disponíveis</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <UserMinus size={14} className="text-red-500" />
                        <span className="text-gray-600">{analysis.absentUsers.length} ausentes</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 pb-4">
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`absolute left-0 top-0 h-full transition-all duration-300 ${analysis.alertLevel === 'ok' ? 'bg-green-500' :
                            analysis.alertLevel === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                        style={{ width: `${analysis.percentAvailable}%` }}
                    />
                    {/* Minimum line */}
                    <div
                        className="absolute top-0 h-full w-0.5 bg-gray-600"
                        style={{ left: `${analysis.minQuorumPercentage}%` }}
                        title={`Mínimo: ${analysis.minQuorumPercentage}%`}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span style={{ marginLeft: `${analysis.minQuorumPercentage - 10}%` }} className="text-gray-600 font-medium">
                        Mín: {analysis.minQuorumPercentage}%
                    </span>
                    <span>100%</span>
                </div>
            </div>

            {/* Alert Message */}
            {analysis.alertLevel !== 'ok' && (
                <div className={`mx-4 mb-4 p-3 rounded-lg ${analysis.alertLevel === 'warning' ? 'bg-amber-100' : 'bg-red-100'}`}>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className={colors.text} />
                        <p className={`text-sm font-medium ${colors.text}`}>
                            {analysis.alertLevel === 'critical'
                                ? `Atenção: Apenas ${analysis.percentAvailable}% da equipa disponível neste período!`
                                : `Aviso: Equipa com disponibilidade reduzida (${analysis.percentAvailable}%)`
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Absent Users List */}
            {showAbsentList && analysis.absentUsers.length > 0 && (
                <div className="border-t border-gray-200 bg-white">
                    <div className="p-3 border-b border-gray-100">
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Colaboradores Ausentes no Período
                        </h5>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto">
                        {analysis.absentUsers.map((user, idx) => (
                            <div key={`${user.id}-${idx}`} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: user.leaveTypeColor }}
                                    />
                                    <span className="font-medium text-gray-800 text-sm">{user.name}</span>
                                    <span
                                        className="text-xs px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: user.leaveTypeColor + '20',
                                            color: user.leaveTypeColor
                                        }}
                                    >
                                        {user.leaveType}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar size={12} />
                                    {formatDateRange(user.startDate, user.endDate)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuorumAnalyzer;
