import React, { useState } from 'react';
import { Tag, Plus, Save, Trash2, Edit2, X, Palette, Check } from 'lucide-react';
import { LeaveType } from '../types';

interface LeaveTypesManagementProps {
    leaveTypes: LeaveType[];
    onAdd: (type: LeaveType) => void;
    onUpdate: (type: LeaveType) => void;
    onDelete: (id: number) => void;
}

const COLOR_PRESETS = [
    '#10B981', // Green (Vacation)
    '#EF4444', // Red (Sick)
    '#8B5CF6', // Purple (Parental)
    '#F59E0B', // Amber (Justified)
    '#6B7280', // Gray (Day Off)
    '#3B82F6', // Blue (Remote)
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
];

const LeaveTypesManagement: React.FC<LeaveTypesManagementProps> = ({ leaveTypes, onAdd, onUpdate, onDelete }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Omit<LeaveType, 'id' | 'createdAt'>>({
        name: '',
        color: '#3B82F6',
        deductsVacation: false,
        requiresApproval: true,
    });

    const handleOpenForm = (type?: LeaveType) => {
        if (type) {
            setEditingId(type.id);
            setFormData({
                name: type.name,
                color: type.color,
                deductsVacation: type.deductsVacation,
                requiresApproval: type.requiresApproval,
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', color: '#3B82F6', deductsVacation: false, requiresApproval: true });
        }
        setShowForm(true);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;

        if (editingId !== null) {
            onUpdate({ id: editingId, ...formData } as LeaveType);
        } else {
            onAdd({ id: Date.now(), ...formData } as LeaveType);
        }
        setShowForm(false);
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Tag className="text-brand-600" /> Tipos de Ausência
                    </h1>
                    <p className="text-gray-500 mt-1">Defina os tipos de ausência e suas regras.</p>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
                >
                    <Plus size={18} /> Novo Tipo
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {leaveTypes.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                        <Tag size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhum tipo de ausência definido.</p>
                    </div>
                )}
                <div className="divide-y divide-gray-100">
                    {leaveTypes.map(type => (
                        <div key={type.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: type.color + '20' }}>
                                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: type.color }}></div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">{type.name}</h4>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                        {type.deductsVacation && (
                                            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                                                Desconta Férias
                                            </span>
                                        )}
                                        {type.requiresApproval && (
                                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                                                Requer Aprovação
                                            </span>
                                        )}
                                        {!type.requiresApproval && (
                                            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                                                Auto-Aprovado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenForm(type)} className="p-2 rounded-lg bg-gray-100 hover:bg-brand-100 text-gray-600 hover:text-brand-600"><Edit2 size={16} /></button>
                                <button onClick={() => onDelete(type.id)} className="p-2 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Tipo' : 'Novo Tipo de Ausência'}</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Férias, Doença, Folga..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Palette size={16} /> Cor do Calendário
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PRESETS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${formData.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: c }}
                                        >
                                            {formData.color === c && <Check size={16} className="text-white drop-shadow-md" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.deductsVacation}
                                        onChange={(e) => setFormData(prev => ({ ...prev, deductsVacation: e.target.checked }))}
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-5 h-5"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-800">Desconta no Saldo de Férias</span>
                                        <p className="text-xs text-gray-500">Se ativo, este tipo de ausência reduz os dias de férias disponíveis.</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.requiresApproval}
                                        onChange={(e) => setFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))}
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-5 h-5"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-800">Requer Aprovação</span>
                                        <p className="text-xs text-gray-500">Se ativo, o pedido fica pendente até ser aprovado.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg">
                                <Save size={18} /> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveTypesManagement;
