import React, { useMemo, useState } from 'react';
import { TimeLog, Leave, Anomaly, LeaveType } from '../types';
import {
    Clock, Calendar, AlertTriangle, CheckCircle2, XCircle,
    ChevronDown, Filter
} from 'lucide-react';

interface TimelineEvent {
    id: string;
    date: string;
    type: 'timelog' | 'leave' | 'anomaly';
    title: string;
    description: string;
    status: 'positive' | 'neutral' | 'warning' | 'negative';
    icon: React.ReactNode;
    meta?: string;
}

interface EmployeeTimelineProps {
    userId: number;
    timeLogs: TimeLog[];
    leaves: Leave[];
    anomalies: Anomaly[];
    leaveTypes: LeaveType[];
}

const statusColors = {
    positive: 'bg-green-100 text-green-700 border-green-200',
    neutral: 'bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    negative: 'bg-red-100 text-red-700 border-red-200'
};

const dotColors = {
    positive: 'bg-green-500',
    neutral: 'bg-blue-500',
    warning: 'bg-amber-500',
    negative: 'bg-red-500'
};

const EmployeeTimeline: React.FC<EmployeeTimelineProps> = ({
    userId, timeLogs, leaves, anomalies, leaveTypes
}) => {
    const [filterType, setFilterType] = useState<'all' | 'timelog' | 'leave' | 'anomaly'>('all');
    const [showCount, setShowCount] = useState(20);

    const events = useMemo<TimelineEvent[]>(() => {
        const items: TimelineEvent[] = [];

        // Time logs
        timeLogs
            .filter(l => l.userId === userId)
            .forEach(log => {
                const isLate = log.status === 'LATE';
                const isIncomplete = log.status === 'INCOMPLETE';
                items.push({
                    id: `tl-${log.id}`,
                    date: log.date,
                    type: 'timelog',
                    title: isLate ? 'Entrada com atraso' : isIncomplete ? 'Registo incompleto' : 'Dia trabalhado',
                    description: `${log.checkIn || '--:--'} → ${log.checkOut || '--:--'}${log.totalHours ? ` (${log.totalHours.toFixed(1)}h)` : ''}`,
                    status: isLate ? 'warning' : isIncomplete ? 'negative' : 'positive',
                    icon: <Clock size={14} />,
                    meta: log.checkInLocation?.split(',')[0]
                });
            });

        // Leaves
        leaves
            .filter(l => l.userId === userId)
            .forEach(leave => {
                const lt = leaveTypes.find(t => t.id === leave.leaveTypeId);
                const isApproved = leave.status === 'APPROVED';
                const isRejected = leave.status === 'REJECTED';
                items.push({
                    id: `lv-${leave.id}`,
                    date: leave.startDate,
                    type: 'leave',
                    title: lt?.name || 'Ausência',
                    description: `${leave.startDate} → ${leave.endDate}${leave.notes ? ` — "${leave.notes}"` : ''}`,
                    status: isRejected ? 'negative' : isApproved ? 'positive' : 'neutral',
                    icon: isRejected ? <XCircle size={14} /> : isApproved ? <CheckCircle2 size={14} /> : <Calendar size={14} />,
                    meta: leave.status === 'PENDING' ? 'Pendente' : leave.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'
                });
            });

        // Anomalies
        anomalies
            .filter(a => a.userId === userId)
            .forEach(anomaly => {
                const typeLabels: Record<string, string> = {
                    LATE_ENTRY: 'Atraso',
                    EARLY_EXIT: 'Saída antecipada',
                    MISSING_CLOCK_IN: 'Falta picagem entrada',
                    MISSING_CLOCK_OUT: 'Falta picagem saída',
                    HOURS_DEFICIT: 'Défice de horas',
                    HOURS_SURPLUS: 'Excedente de horas'
                };
                const statusLabels: Record<string, string> = {
                    PENDING: 'Pendente',
                    AWAITING_JUSTIFICATION: 'Aguarda justificação',
                    JUSTIFIED_PENDING_REVIEW: 'Justificado (em revisão)',
                    JUSTIFIED_MANAGER: 'Justificado pelo gestor',
                    ESCALATED_HR: 'Escalado para RH',
                    REJECTED: 'Rejeitado'
                };
                items.push({
                    id: `an-${anomaly.id}`,
                    date: anomaly.createdAt.split('T')[0],
                    type: 'anomaly',
                    title: typeLabels[anomaly.type] || anomaly.type,
                    description: `${anomaly.minutes} min${anomaly.employeeJustification ? ` — "${anomaly.employeeJustification}"` : ''}`,
                    status: anomaly.status === 'JUSTIFIED_MANAGER' ? 'positive' : anomaly.status === 'REJECTED' ? 'negative' : 'warning',
                    icon: <AlertTriangle size={14} />,
                    meta: statusLabels[anomaly.status] || anomaly.status
                });
            });

        // Sort by date descending
        items.sort((a, b) => b.date.localeCompare(a.date));
        return items;
    }, [userId, timeLogs, leaves, anomalies, leaveTypes]);

    const filtered = filterType === 'all' ? events : events.filter(e => e.type === filterType);
    const visible = filtered.slice(0, showCount);

    // Group by month
    const grouped = useMemo(() => {
        const map = new Map<string, TimelineEvent[]>();
        visible.forEach(e => {
            const d = new Date(e.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(e);
        });
        return Array.from(map.entries());
    }, [visible]);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={14} className="text-gray-400" />
                {[
                    { key: 'all' as const, label: 'Tudo' },
                    { key: 'timelog' as const, label: 'Presenças' },
                    { key: 'leave' as const, label: 'Ausências' },
                    { key: 'anomaly' as const, label: 'Anomalias' }
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilterType(f.key)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${filterType === f.key
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
                <span className="ml-auto text-xs text-gray-400">{filtered.length} eventos</span>
            </div>

            {/* Timeline */}
            {grouped.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                    Sem eventos para mostrar.
                </div>
            ) : (
                grouped.map(([monthKey, items]) => {
                    const d = new Date(monthKey + '-01');
                    const label = d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
                    return (
                        <div key={monthKey} className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest sticky top-0 bg-gray-50 py-1 px-1 capitalize">
                                {label}
                            </h4>
                            <div className="relative pl-6 border-l-2 border-gray-200 space-y-3">
                                {items.map(event => (
                                    <div key={event.id} className="relative group">
                                        {/* Dot */}
                                        <div className={`absolute -left-[calc(1.5rem+5px)] w-2.5 h-2.5 rounded-full ${dotColors[event.status]} ring-2 ring-white`} />

                                        <div className={`p-3 rounded-lg border transition-all hover:shadow-sm ${statusColors[event.status]}`}>
                                            <div className="flex items-start gap-2">
                                                <span className="mt-0.5 shrink-0">{event.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold">{event.title}</span>
                                                        {event.meta && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/50">
                                                                {event.meta}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs mt-0.5 opacity-75">{event.description}</p>
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-500 shrink-0">
                                                    {new Date(event.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Load More */}
            {filtered.length > showCount && (
                <button
                    onClick={() => setShowCount(prev => prev + 20)}
                    className="w-full py-2 text-sm text-brand-600 font-bold hover:bg-brand-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <ChevronDown size={16} /> Mostrar mais ({filtered.length - showCount} restantes)
                </button>
            )}
        </div>
    );
};

export default EmployeeTimeline;
