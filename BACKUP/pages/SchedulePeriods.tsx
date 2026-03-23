import React, { useState } from 'react';
import { SchedulePeriod, SchedulePeriodLine } from '../types';
import { Clock, Plus, Search, Edit2, Trash2, X, Save, Info, ArrowLeft, Trash } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface SchedulePeriodsProps {
    periods: SchedulePeriod[];
    onAddPeriod: (period: SchedulePeriod) => void;
    onUpdatePeriod: (period: SchedulePeriod) => void;
    onDeletePeriod: (id: number) => void;
}

const SchedulePeriods: React.FC<SchedulePeriodsProps> = ({ periods, onAddPeriod, onUpdatePeriod, onDeletePeriod }) => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const { addToast } = useToast();

    const [formData, setFormData] = useState<SchedulePeriod>({
        id: 0,
        name: '',
        typology: 'WORK',
        affectedSchedules: ['all'],
        deductHours: '',
        excelCode: '',
        color: '#d946ef', // Default pinkish
        lines: [
            { id: '1', start: '09:00', end: '18:00', createAnomaly: false }
        ],
        createdAt: new Date().toISOString()
    });

    const handleOpenForm = (period?: SchedulePeriod) => {
        if (period) {
            setEditingId(period.id);
            setFormData(period);
        } else {
            setEditingId(null);
            setFormData({
                id: 0,
                name: '',
                typology: 'WORK',
                affectedSchedules: ['all'],
                deductHours: '',
                excelCode: '',
                color: '#ca8a04', // Default
                lines: [
                    { id: crypto.randomUUID(), start: '09:00', end: '18:00', createAnomaly: false }
                ],
                createdAt: new Date().toISOString()
            });
        }
        setView('form');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            addToast('error', 'O nome do período é obrigatório.');
            return;
        }

        if (editingId) {
            onUpdatePeriod(formData);
            addToast('success', 'Período atualizado com sucesso.');
        } else {
            onAddPeriod({ ...formData, id: Date.now() });
            addToast('success', 'Período criado com sucesso.');
        }
        setView('list');
    };

    const handleAddLine = () => {
        setFormData(prev => ({
            ...prev,
            lines: [...prev.lines, { id: crypto.randomUUID(), start: '', end: '', createAnomaly: false }]
        }));
    };

    const handleRemoveLine = (id: string) => {
        setFormData(prev => ({
            ...prev,
            lines: prev.lines.filter(l => l.id !== id)
        }));
    };

    const updateLine = (id: string, field: keyof SchedulePeriodLine, value: any) => {
        setFormData(prev => ({
            ...prev,
            lines: prev.lines.map(l => l.id === id ? { ...l, [field]: value } : l)
        }));
    };

    const filteredPeriods = periods.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (view === 'form') {
        return (
            <div className="p-6 max-w-7xl mx-auto mb-20 animate-fade-in">
                {/* Header */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {editingId ? 'Editar período de horário' : 'Novo período de horário'}
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setView('list')}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
                        >
                            Guardar
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Form Fields */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-brand-600 font-bold mb-4 border-b border-gray-100 pb-2">Editar período de horário</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Nome <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    placeholder="Ex: 09:00 às 17:30"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Tipologia <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.typology}
                                    onChange={e => setFormData({ ...formData, typology: e.target.value as any })}
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                >
                                    <option value="WORK">Trabalho</option>
                                    <option value="BREAK">Pausa</option>
                                    <option value="OTHER">Outro</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Horários <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    value={formData.affectedSchedules[0]}
                                >
                                    <option value="all">Todos</option>
                                    {/* Future: Map specific schedules */}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">Este período de horário apenas vai ser visualizado nos horários acima.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                    Horas a Descontar <Info size={12} />
                                </label>
                                <input
                                    value={formData.deductHours}
                                    onChange={e => setFormData({ ...formData, deductHours: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                    Código Excel <Info size={12} />
                                </label>
                                <input
                                    value={formData.excelCode}
                                    onChange={e => setFormData({ ...formData, excelCode: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Cor</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        className="w-10 h-10 p-1 rounded cursor-pointer border border-gray-200"
                                    />
                                    <span className="text-xs text-gray-500 uppercase">{formData.color}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Period Lines */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-brand-600 font-bold mb-4 border-b border-gray-100 pb-2">Linhas de período</h2>

                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase py-2 px-4">
                                <div className="col-span-6">Período de trabalho <span className="text-red-500">*</span></div>
                                <div className="col-span-4 text-center">Criar Anomalia</div>
                                <div className="col-span-2"></div>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {formData.lines.map((line) => (
                                    <div key={line.id} className="grid grid-cols-12 items-center p-4 gap-4">
                                        <div className="col-span-6 space-y-2">
                                            <input
                                                type="time"
                                                value={line.start}
                                                onChange={e => updateLine(line.id, 'start', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                                            />
                                            <input
                                                type="time"
                                                value={line.end}
                                                onChange={e => updateLine(line.id, 'end', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                                            />
                                        </div>
                                        <div className="col-span-4 flex justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={line.createAnomaly}
                                                        onChange={e => updateLine(line.id, 'createAnomaly', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                                </label>
                                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Plano Premium</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 flex flex-col items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLine(line.id)}
                                                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleAddLine}
                                    className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="p-6 max-w-7xl mx-auto mb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="text-brand-600" />
                        Todos os períodos de horário
                    </h1>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Novo período
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Procurar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="p-4">Nome</th>
                                <th className="p-4">Tipologia</th>
                                <th className="p-4">Data Registo</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredPeriods.length > 0 ? (
                                filteredPeriods.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color || '#ccc' }}></div>
                                            {item.name}
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {item.typology === 'WORK' ? 'Trabalho' : item.typology === 'BREAK' ? 'Pausa' : 'Outro'}
                                        </td>
                                        <td className="p-4 text-gray-500 text-xs">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-PT').slice(0, 16) : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenForm(item)}
                                                    className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDeletePeriod(item.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                        Nenhum período de horário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>A mostrar de {filteredPeriods.length > 0 ? 1 : 0} a {filteredPeriods.length} num total de {filteredPeriods.length} registos</span>
                    <div className="flex gap-1">
                        <button disabled className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">anterior</button>
                        <button className="px-3 py-1 bg-brand-600 text-white rounded font-bold">1</button>
                        <button disabled className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">próximo</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedulePeriods;
