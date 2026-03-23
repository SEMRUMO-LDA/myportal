import React, { useState } from 'react';
import { Anomaly, User } from '../types';
import { AlertTriangle, CheckCircle, XCircle, ArrowUpCircle, Clock } from 'lucide-react';
import { normalizeRoleName, isAdminRole } from '../utils/authUtils';

interface AnomaliesWidgetProps {
    anomalies: Anomaly[];
    users: User[];
    currentUser: User | null;
    onUpdateAnomaly: (anomaly: Anomaly) => void;
}

const AnomaliesWidget: React.FC<AnomaliesWidgetProps> = ({ anomalies, users, currentUser, onUpdateAnomaly }) => {
    const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
    const [note, setNote] = useState('');

    // Filter Logic
    const filteredAnomalies = React.useMemo(() => {
        if (!currentUser) return [];

        const pending = anomalies.filter(a => a.status === 'PENDING' || a.status === 'ESCALATED_HR' || a.status === 'AWAITING_JUSTIFICATION' || a.status === 'JUSTIFIED_PENDING_REVIEW');

        if (isAdminRole(normalizeRoleName(currentUser.role || ''))) return pending;

        // Manager: Show anomalies for my department(s)
        // Assuming Manager Role check or Department Manager check
        // We can detect managed departments from the users list? No, from departments list?
        // But here we rely on the fact that App passes *all* anomalies, but RLS restricts them?
        // Or we filter manually.

        // Use RLS logic assumption: App.tsx fetches anomalies.
        // If RLS is active, `anomalies` prop already only contains what I can see.
        // So I just show them.
        return pending;
    }, [anomalies, currentUser]);

    const handleAction = (status: Anomaly['status']) => {
        if (!selectedAnomaly) return;
        onUpdateAnomaly({
            ...selectedAnomaly,
            status,
            managerId: currentUser?.id,
            managerNotes: note
        });
        setSelectedAnomaly(null);
        setNote('');
    };

    if (filteredAnomalies.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Anomalias Pendentes
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">{filteredAnomalies.length}</span>
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredAnomalies.map(anomaly => {
                    const user = users.find(u => u.id === anomaly.userId);
                    return (
                        <div key={anomaly.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-start gap-4 hover:border-gray-300 transition-all">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm text-gray-800">{user?.name}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">{new Date(anomaly.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded font-medium ${anomaly.type === 'LATE_ENTRY' ? 'bg-orange-100 text-orange-700' :
                                        anomaly.type === 'EARLY_EXIT' ? 'bg-red-100 text-red-700' :
                                            anomaly.type === 'HOURS_DEFICIT' ? 'bg-amber-100 text-amber-700' :
                                                anomaly.type === 'HOURS_SURPLUS' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-200 text-gray-700'
                                        }`}>
                                        {anomaly.type === 'LATE_ENTRY' ? 'Atraso' :
                                            anomaly.type === 'EARLY_EXIT' ? 'Saída Antecipada' :
                                                anomaly.type === 'HOURS_DEFICIT' ? 'Défice de Horas' :
                                                    anomaly.type === 'HOURS_SURPLUS' ? 'Excedente de Horas' : anomaly.type}
                                    </span>
                                    <span className="font-bold text-gray-700">{anomaly.minutes} min</span>
                                </div>
                                {anomaly.status === 'JUSTIFIED_PENDING_REVIEW' && anomaly.employeeJustification && (
                                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Justificação do Colaborador:</p>
                                        <p className="text-xs text-gray-700 italic">"{anomaly.employeeJustification}"</p>
                                    </div>
                                )}
                                {anomaly.status === 'AWAITING_JUSTIFICATION' && (
                                    <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-700 font-medium">
                                        ⏳ A aguardar justificação do colaborador
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {selectedAnomaly?.id === anomaly.id ? (
                                    <div className="flex flex-col gap-2 bg-white p-2 rounded shadow-lg absolute right-10 z-10 border border-gray-100 min-w-[200px]">
                                        <textarea
                                            className="w-full text-xs border border-gray-300 rounded p-1"
                                            placeholder="Nota (opcional)..."
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                        />
                                        <div className="flex gap-1 justify-end">
                                            <button
                                                onClick={() => handleAction('JUSTIFIED_MANAGER')}
                                                className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 flex items-center gap-1"
                                                title="Justificar"
                                            >
                                                <CheckCircle size={14} /> Justificar
                                            </button>
                                            <button
                                                onClick={() => handleAction('ESCALATED_HR')}
                                                className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 flex items-center gap-1"
                                                title="Escalar RH"
                                            >
                                                <ArrowUpCircle size={14} /> RH
                                            </button>
                                            <button
                                                onClick={() => handleAction('REJECTED')}
                                                className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 flex items-center gap-1"
                                                title="Não Justificar"
                                            >
                                                <XCircle size={14} /> Rejeitar
                                            </button>
                                        </div>
                                        <button onClick={() => setSelectedAnomaly(null)} className="text-xs text-gray-400 text-center mt-1 hover:text-gray-600">Cancelar</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setSelectedAnomaly(anomaly); setNote(''); }}
                                        className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
                                    >
                                        Gerir
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AnomaliesWidget;
