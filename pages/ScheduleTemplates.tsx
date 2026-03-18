import React, { useState } from 'react';
import { Calendar, Plus, Save, Trash2, Edit2, Clock, X, ChevronRight, RotateCw, CalendarDays } from 'lucide-react';
import { ScheduleTemplate, ScheduleTemplateDay } from '../types';

interface ScheduleTemplatesProps {
    templates: ScheduleTemplate[];
    onAdd: (template: ScheduleTemplate) => void;
    onUpdate: (template: ScheduleTemplate) => void;
    onDelete: (id: number) => void;
}

const DEFAULT_WEEK: ScheduleTemplateDay[] = [
    { day: 0, start: '', end: '', isOff: true }, // Sunday
    { day: 1, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    { day: 2, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    { day: 3, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    { day: 4, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    { day: 5, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    { day: 6, start: '', end: '', isOff: true }, // Saturday
];

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ScheduleTemplates: React.FC<ScheduleTemplatesProps> = ({ templates, onAdd, onUpdate, onDelete }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [mode, setMode] = useState<'WEEKLY' | 'CYCLICAL'>('WEEKLY');

    // Cyclical State
    const [cycleDays, setCycleDays] = useState(4);

    const [formData, setFormData] = useState<Omit<ScheduleTemplate, 'id' | 'createdAt'>>({
        name: '',
        weeklyPattern: [...DEFAULT_WEEK],
        totalWeeklyHours: 40,
        cycleDays: undefined,
        cyclePattern: [],
    });

    const handleOpenForm = (template?: ScheduleTemplate) => {
        if (template) {
            setEditingId(template.id);
            setMode(template.cycleDays ? 'CYCLICAL' : 'WEEKLY');
            setCycleDays(template.cycleDays || 4);
            setFormData({
                name: template.name,
                weeklyPattern: template.weeklyPattern.length > 0 ? template.weeklyPattern : [...DEFAULT_WEEK],
                totalWeeklyHours: template.totalWeeklyHours || 40,
                cycleDays: template.cycleDays,
                cyclePattern: template.cyclePattern || [],
            });
        } else {
            setEditingId(null);
            setMode('WEEKLY');
            setCycleDays(4);
            setFormData({
                name: '',
                weeklyPattern: [...DEFAULT_WEEK],
                totalWeeklyHours: 40,
                cycleDays: undefined,
                cyclePattern: [],
            });
        }
        setShowForm(true);
    };

    const handleDayChange = (dayIndex: number, field: keyof ScheduleTemplateDay, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            weeklyPattern: prev.weeklyPattern.map((d, i) =>
                i === dayIndex ? { ...d, [field]: value } : d
            ),
        }));
    };

    // --- CYCLICAL LOGIC ---
    const updateCycleLength = (days: number) => {
        setCycleDays(days);
        // Regenerate pattern
        const newPattern = Array.from({ length: days }).map((_, i) => {
            // Preserve existing if possible
            const existing = formData.cyclePattern?.[i];
            if (existing) return existing;

            // Default: Work
            return {
                dayIndex: i + 1,
                start: '09:00', end: '18:00',
                breakStart: '13:00', breakEnd: '14:00',
                isOff: false
            };
        });
        setFormData(prev => ({ ...prev, cyclePattern: newPattern }));
    };

    const handleCycleDayChange = (index: number, field: string, value: any) => {
        setFormData(prev => {
            if (!prev.cyclePattern) return prev;
            const newCycle = [...prev.cyclePattern];
            newCycle[index] = { ...newCycle[index], [field]: value };
            return { ...prev, cyclePattern: newCycle };
        });
    };

    const calculateTotalHours = (): number => {
        if (mode === 'CYCLICAL') {
            if (!formData.cyclePattern) return 0;
            // Average weekly hours = (Total Cycle Hours / Cycle Days) * 7
            const totalCycleHours = formData.cyclePattern.reduce((total, day) => {
                if (day.isOff || !day.start || !day.end) return total;
                const [sh, sm] = day.start.split(':').map(Number);
                const [eh, em] = day.end.split(':').map(Number);
                const [bsh, bsm] = (day.breakStart || '00:00').split(':').map(Number);
                const [beh, bem] = (day.breakEnd || '00:00').split(':').map(Number);

                const workHours = (eh + em / 60) - (sh + sm / 60);
                const breakHours = day.breakStart && day.breakEnd ? (beh + bem / 60) - (bsh + bsm / 60) : 0;
                return total + (workHours - breakHours);
            }, 0);
            return (totalCycleHours / (formData.cyclePattern.length || 1)) * 7;
        }

        return formData.weeklyPattern.reduce((total, day) => {
            if (day.isOff || !day.start || !day.end) return total;
            const [sh, sm] = day.start.split(':').map(Number);
            const [eh, em] = day.end.split(':').map(Number);
            const [bsh, bsm] = (day.breakStart || '00:00').split(':').map(Number);
            const [beh, bem] = (day.breakEnd || '00:00').split(':').map(Number);

            const workHours = (eh + em / 60) - (sh + sm / 60);
            const breakHours = day.breakStart && day.breakEnd ? (beh + bem / 60) - (bsh + bsm / 60) : 0;
            return total + workHours - breakHours;
        }, 0);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;

        const totalHours = calculateTotalHours();

        // Prepare data based on mode
        let finalData: any = { ...formData, totalWeeklyHours: totalHours };

        if (mode === 'CYCLICAL') {
            // Ensure cycle data is set and weekly is ignored/default
            finalData.cycleDays = cycleDays;
            if (!finalData.cyclePattern || finalData.cyclePattern.length !== cycleDays) {
                // Init pattern if empty
                updateCycleLength(cycleDays);
                // Need to re-read state? No, updateCycleLength is async in React state, careful.
                // Actually updateCycleLength sets state. We rely on user interaction.
                // If user just switched mode and clicked save immediately, state might be partial.
                // Let's ensure consistency:
                if (!finalData.cyclePattern || finalData.cyclePattern.length === 0) {
                    const pattern = Array.from({ length: cycleDays }).map((_, i) => ({
                        dayIndex: i + 1,
                        start: '09:00', end: '18:00',
                        breakStart: '13:00', breakEnd: '14:00',
                        isOff: false
                    }));
                    finalData.cyclePattern = pattern;
                }
            }
        } else {
            // Weekly mode: clear cycle data
            finalData.cycleDays = undefined; // or null if DB allows
            finalData.cyclePattern = []; // clear
            // But we must send undefined to remove from DB object? 
            // supabase .update() ignores undefined? No.
            // We'll filter before passing to onAdd/onUpdate if needed, 
            // but Parent handles Supabase. We just pass object.
            // Ideally we set them to null/undefined.
            finalData.cycleDays = null;
            finalData.cyclePattern = null;
        }

        if (editingId !== null) {
            onUpdate({ id: editingId, ...finalData } as ScheduleTemplate);
        } else {
            onAdd({ id: Date.now(), ...finalData } as ScheduleTemplate);
        }
        setShowForm(false);
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Calendar className="text-brand-600" /> Modelos de Horário
                    </h1>
                    <p className="text-gray-500 mt-1">Defina os templates de horário para os colaboradores.</p>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
                >
                    <Plus size={18} /> Novo Modelo
                </button>
            </div>

            {/* Templates List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 text-center py-16 text-gray-400">
                        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhum modelo de horário definido.</p>
                        <button onClick={() => handleOpenForm()} className="text-brand-600 font-medium mt-2 hover:underline">
                            Criar o primeiro modelo
                        </button>
                    </div>
                )}
                {templates.map(template => (
                    <div key={template.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                    {template.name}
                                    {template.cycleDays && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Rotativo</span>}
                                </h3>
                                <p className="text-sm text-gray-500">{template.totalWeeklyHours?.toFixed(1) || '—'}h / semana (méd)</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenForm(template)} className="p-2 rounded-lg bg-gray-100 hover:bg-brand-100 text-gray-600 hover:text-brand-600"><Edit2 size={16} /></button>
                                <button onClick={() => onDelete(template.id)} className="p-2 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>

                        {/* Preview */}
                        {template.cycleDays ? (
                            <div className="mt-4">
                                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Ciclo de {template.cycleDays} dias</p>
                                <div className="flex flex-wrap gap-1">
                                    {template.cyclePattern?.slice(0, 8).map((d, i) => (
                                        <div key={i} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold ${d.isOff ? 'bg-gray-100 text-gray-400' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                            {d.isOff ? 'F' : 'T'}
                                        </div>
                                    ))}
                                    {(template.cyclePattern?.length || 0) > 8 && <div className="text-xs text-gray-400 flex items-center">...</div>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-1 mt-4">
                                {template.weeklyPattern.map((day, i) => (
                                    <div key={i} className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium ${day.isOff ? 'bg-gray-100 text-gray-400' : 'bg-brand-50 text-brand-700'}`}>
                                        {DAY_SHORT[day.day]}
                                        {!day.isOff && <div className="text-[10px] font-normal">{day.start?.slice(0, 5)}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Modelo' : 'Novo Modelo de Horário'}</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Modelo</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Turno Rotativo 4x2"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>

                            {/* Mode Toggle */}
                            <div className="flex p-1 bg-gray-100 rounded-xl">
                                <button
                                    onClick={() => setMode('WEEKLY')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'WEEKLY' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <CalendarDays size={16} /> Semanal (Fixo)
                                </button>
                                <button
                                    onClick={() => {
                                        setMode('CYCLICAL');
                                        if ((!formData.cyclePattern || formData.cyclePattern.length === 0)) {
                                            updateCycleLength(cycleDays);
                                        }
                                    }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'CYCLICAL' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <RotateCw size={16} /> Rotativo (Cíclico)
                                </button>
                            </div>

                            {/* WEEKLY UI */}
                            {mode === 'WEEKLY' && (
                                <div className="animate-in fade-in zoom-in duration-200">
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Padrão Semanal</label>
                                    <div className="space-y-2">
                                        {formData.weeklyPattern.map((day, i) => (
                                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${day.isOff ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                                                <div className="w-20 font-medium text-gray-700">{DAY_NAMES[day.day]}</div>
                                                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={day.isOff}
                                                        onChange={(e) => handleDayChange(i, 'isOff', e.target.checked)}
                                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                    />
                                                    Folga
                                                </label>
                                                {!day.isOff && (
                                                    <>
                                                        <div className="flex items-center gap-1 ml-auto">
                                                            <Clock size={14} className="text-gray-400" />
                                                            <input type="time" value={day.start} onChange={(e) => handleDayChange(i, 'start', e.target.value)} className="px-2 py-1 border border-gray-200 rounded-lg text-sm w-24" />
                                                            <span className="text-gray-400">-</span>
                                                            <input type="time" value={day.end} onChange={(e) => handleDayChange(i, 'end', e.target.value)} className="px-2 py-1 border border-gray-200 rounded-lg text-sm w-24" />
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                                            Almoço:
                                                            <input type="time" value={day.breakStart || ''} onChange={(e) => handleDayChange(i, 'breakStart', e.target.value)} className="px-1 py-0.5 border border-gray-100 rounded text-xs w-20" />
                                                            <span>-</span>
                                                            <input type="time" value={day.breakEnd || ''} onChange={(e) => handleDayChange(i, 'breakEnd', e.target.value)} className="px-1 py-0.5 border border-gray-100 rounded text-xs w-20" />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* CYCLICAL UI */}
                            {mode === 'CYCLICAL' && (
                                <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                        <label className="block text-sm font-bold text-purple-900 mb-2">Duração do Ciclo</label>
                                        <div className="flex flex-col gap-3">
                                            {/* Presets */}
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4].map(weeks => (
                                                    <button
                                                        key={weeks}
                                                        onClick={() => updateCycleLength(weeks * 7)}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${cycleDays === weeks * 7
                                                                ? 'bg-purple-600 text-white border-purple-600'
                                                                : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100'
                                                            }`}
                                                    >
                                                        {weeks} {weeks === 1 ? 'Semana' : 'Semanas'}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-purple-700 font-medium">Personalizado:</span>
                                                <input
                                                    type="number"
                                                    min={2}
                                                    max={60}
                                                    value={cycleDays}
                                                    onChange={e => updateCycleLength(parseInt(e.target.value) || 2)}
                                                    className="w-20 px-3 py-1.5 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                                />
                                                <span className="text-sm text-purple-700">dias totais</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {/* Chunk days into weeks (groups of 7) */}
                                        {Array.from({ length: Math.ceil((formData.cyclePattern?.length || 0) / 7) }).map((_, weekIdx) => {
                                            const startIdx = weekIdx * 7;
                                            const weekDaysChunk = formData.cyclePattern?.slice(startIdx, startIdx + 7) || [];

                                            return (
                                                <div key={weekIdx} className="bg-gray-50/50 rounded-xl border border-gray-100 p-1">
                                                    <div className="px-2 py-1.5 mb-2 border-b border-gray-100 flex items-center justify-between">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                            {cycleDays % 7 === 0 ? `Semana ${weekIdx + 1}` : `Grupo ${weekIdx + 1}`}
                                                        </h4>
                                                        <span className="text-[10px] text-gray-400">Dias {startIdx + 1} a {startIdx + weekDaysChunk.length}</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {weekDaysChunk.map((day, chunkI) => {
                                                            const i = startIdx + chunkI; // global index
                                                            return (
                                                                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${day.isOff ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 shadow-sm'}`}>
                                                                    <div className="w-20 font-bold text-gray-700 flex items-center gap-2">
                                                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs border ${day.isOff ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-brand-50 text-brand-700 border-brand-100'}`}>
                                                                            {day.dayIndex}
                                                                        </div>
                                                                        <span className="text-xs font-normal text-gray-500">
                                                                            {/* Try to guess weekday name IF it's a perfect weekly cycle (7, 14, 21...) */}
                                                                            {cycleDays % 7 === 0 ? DAY_SHORT[(i % 7) + 1 === 7 ? 0 : (i % 7) + 1] : 'Dia'}
                                                                        </span>
                                                                    </div>

                                                                    <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={day.isOff}
                                                                            onChange={(e) => handleCycleDayChange(i, 'isOff', e.target.checked)}
                                                                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                                        />
                                                                        <span className={day.isOff ? 'font-normal' : 'font-medium'}>Folga</span>
                                                                    </label>

                                                                    {!day.isOff && (
                                                                        <>
                                                                            <div className="flex items-center gap-1 ml-auto">
                                                                                <Clock size={14} className="text-gray-400" />
                                                                                <input type="time" value={day.start} onChange={(e) => handleCycleDayChange(i, 'start', e.target.value)} className="px-2 py-1 border border-gray-200 rounded-lg text-sm w-24 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                                                                                <span className="text-gray-400">-</span>
                                                                                <input type="time" value={day.end} onChange={(e) => handleCycleDayChange(i, 'end', e.target.value)} className="px-2 py-1 border border-gray-200 rounded-lg text-sm w-24 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-xs text-gray-400 hidden sm:flex">
                                                                                <span className="mx-1 text-gray-300">|</span>
                                                                                Almoço:
                                                                                <input type="time" value={day.breakStart || ''} onChange={(e) => handleCycleDayChange(i, 'breakStart', e.target.value)} className="px-1 py-0.5 border border-gray-100 rounded text-xs w-16" />
                                                                                <span>-</span>
                                                                                <input type="time" value={day.breakEnd || ''} onChange={(e) => handleCycleDayChange(i, 'breakEnd', e.target.value)} className="px-1 py-0.5 border border-gray-100 rounded text-xs w-16" />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Total Hours */}
                            <div className="bg-brand-50 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <span className="font-medium text-brand-800">Total Semanal Médio:</span>
                                    {mode === 'CYCLICAL' && <p className="text-xs text-brand-600 mt-1">(Baseado na média do ciclo)</p>}
                                </div>
                                <span className="text-xl font-bold text-brand-600">{calculateTotalHours().toFixed(1)}h</span>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
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

export default ScheduleTemplates;
