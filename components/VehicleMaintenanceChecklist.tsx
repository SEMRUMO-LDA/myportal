import React, { useState } from 'react';
import { X, Save, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import {
    Vehicle,
    MaintenanceCheckItem,
    MaintenanceCheckStatus,
    MaintenanceCheckItemData,
    MaintenanceChecklist,
    MAINTENANCE_CHECK_ITEMS
} from '../types';
import { useToast } from '../context/ToastContext';

interface VehicleMaintenanceChecklistProps {
    vehicle: Vehicle;
    userId: number;
    onClose: () => void;
    onSave: (checklist: Omit<MaintenanceChecklist, 'id' | 'created_at'>) => Promise<void>;
}

const STATUS_OPTIONS: { value: MaintenanceCheckStatus; label: string; color: string; icon: React.ReactNode }[] = [
    { value: 'OK', label: 'OK', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 size={14} /> },
    { value: 'WARNING', label: 'Atenção', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertTriangle size={14} /> },
    { value: 'CRITICAL', label: 'Crítico', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle size={14} /> },
    { value: 'NOT_CHECKED', label: 'N/V', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: <HelpCircle size={14} /> }
];

const VehicleMaintenanceChecklist: React.FC<VehicleMaintenanceChecklistProps> = ({
    vehicle,
    userId,
    onClose,
    onSave
}) => {
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [generalNotes, setGeneralNotes] = useState('');

    // Initialize all items as NOT_CHECKED
    const initialItems: Record<MaintenanceCheckItem, MaintenanceCheckItemData> = {} as any;
    MAINTENANCE_CHECK_ITEMS.forEach(item => {
        initialItems[item.key] = { status: 'NOT_CHECKED', notes: '' };
    });

    const [items, setItems] = useState<Record<MaintenanceCheckItem, MaintenanceCheckItemData>>(initialItems);

    const handleStatusChange = (key: MaintenanceCheckItem, status: MaintenanceCheckStatus) => {
        setItems(prev => ({
            ...prev,
            [key]: { ...prev[key], status }
        }));
    };

    const handleNotesChange = (key: MaintenanceCheckItem, notes: string) => {
        setItems(prev => ({
            ...prev,
            [key]: { ...prev[key], notes }
        }));
    };

    const handleSubmit = async () => {
        // Check if at least some items were checked
        const checkedItems = Object.values(items).filter((i: MaintenanceCheckItemData) => i.status !== 'NOT_CHECKED').length;
        if (checkedItems === 0) {
            addToast('warning', 'Por favor verifique pelo menos um item.');
            return;
        }

        setSubmitting(true);
        try {
            await onSave({
                vehicleId: vehicle.id,
                userId,
                date: new Date().toISOString(),
                items,
                generalNotes: generalNotes || undefined
            });
            addToast('success', 'Checklist de manutenção guardado com sucesso!');
            onClose();
        } catch (error) {
            console.error('Error saving checklist:', error);
            addToast('error', 'Erro ao guardar checklist. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusButton = (itemKey: MaintenanceCheckItem, status: MaintenanceCheckStatus, option: typeof STATUS_OPTIONS[0]) => (
        <button
            key={option.value}
            type="button"
            onClick={() => handleStatusChange(itemKey, option.value)}
            className={`
                flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all border
                ${status === option.value
                    ? `${option.color} ring-2 ring-offset-1 ring-current`
                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                }
            `}
        >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Verificação de Manutenção</h2>
                        <p className="text-sm text-gray-500">{vehicle.plate} - {vehicle.brand} {vehicle.model}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Checklist Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {MAINTENANCE_CHECK_ITEMS.map((item, index) => (
                        <div
                            key={item.key}
                            className="bg-gray-50 rounded-xl p-4 space-y-3"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-800">{item.label}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    {STATUS_OPTIONS.map(option =>
                                        getStatusButton(item.key, items[item.key].status, option)
                                    )}
                                </div>
                            </div>

                            {/* Notes field - always visible but subtle */}
                            <input
                                type="text"
                                value={items[item.key].notes || ''}
                                onChange={(e) => handleNotesChange(item.key, e.target.value)}
                                placeholder="Observações..."
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                    ))}

                    {/* General Notes */}
                    <div className="bg-indigo-50 rounded-xl p-4 mt-4">
                        <label className="block text-sm font-bold text-indigo-700 mb-2">
                            Observações Gerais
                        </label>
                        <textarea
                            value={generalNotes}
                            onChange={(e) => setGeneralNotes(e.target.value)}
                            placeholder="Notas adicionais sobre o estado geral da viatura..."
                            rows={3}
                            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        <span>Guardar Checklist</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VehicleMaintenanceChecklist;
