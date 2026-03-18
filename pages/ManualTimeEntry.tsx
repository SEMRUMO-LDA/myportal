
import React, { useState, useEffect } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { User, TimeLog, TimeLogStatus, Location } from '../types';
import { User as UserIcon, MapPin, Clock, Calendar, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

interface ManualTimeEntryProps {
    users: User[];
    locations: Location[];
    onAddLog: (log: TimeLog) => void;
}

const ManualTimeEntry: React.FC<ManualTimeEntryProps> = ({ users, locations, onAddLog }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const { addToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [movement, setMovement] = useState<'IN' | 'OUT' | ''>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState<string>('09:00');

    // Edit Mode State
    const [editCheckIn, setEditCheckIn] = useState<string>('');
    const [editCheckOut, setEditCheckOut] = useState<string>('');
    const [editBreakStart, setEditBreakStart] = useState<string>('');
    const [editBreakEnd, setEditBreakEnd] = useState<string>('');

    useEffect(() => {
        if (editId) {
            fetchLogToEdit(editId);
        }
    }, [editId]);

    const fetchLogToEdit = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('time_logs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error fetching log:", error);
            addToast('error', 'Erro ao carregar registo para edição.');
            navigate('/admin/attendance');
            return;
        }

        if (data) {
            setSelectedUserId(data.user_id);
            setDate(data.date);
            setEditCheckIn(data.check_in || '');
            setEditCheckOut(data.check_out || '');
            setEditBreakStart(data.break_start || '');
            setEditBreakEnd(data.break_end || '');
            // Try to match location from existing data
            const locationName = data.check_in_location || '';
            const matchedLocation = locations.find(l => l.name === locationName);
            if (matchedLocation) setSelectedLocationId(String(matchedLocation.id));
        }
        setLoading(false);
    };

    const getLocationName = (): string => {
        if (selectedLocationId === 'remoto') return 'Remoto';
        if (selectedLocationId) {
            const loc = locations.find(l => String(l.id) === selectedLocationId);
            return loc?.name || 'Manual Entry';
        }
        return 'Manual Entry';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUserId || !date) {
            addToast('warning', 'Por favor preencha todos os campos obrigatórios.');
            return;
        }

        const user = users.find(u => u.id === Number(selectedUserId));
        if (!user) return;

        setSubmitting(true);

        try {
            // --- EDIT MODE SUBMISSION ---
            if (editId) {
                if (!editCheckIn) {
                    addToast('warning', 'A hora de entrada é obrigatória.');
                    setSubmitting(false);
                    return;
                }

                // Calculate Total Hours
                let totalHours = 0;
                if (editCheckIn && editCheckOut) {
                    const [h1, m1] = editCheckIn.split(':').map(Number);
                    const [h2, m2] = editCheckOut.split(':').map(Number);
                    let diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);

                    // Subtract break if present
                    if (editBreakStart && editBreakEnd) {
                        const [bh1, bm1] = editBreakStart.split(':').map(Number);
                        const [bh2, bm2] = editBreakEnd.split(':').map(Number);
                        const breakMins = (bh2 * 60 + bm2) - (bh1 * 60 + bm1);
                        if (breakMins > 0) diffMins -= breakMins;
                    }

                    totalHours = diffMins > 0 ? diffMins / 60 : 0;
                }

                // Determine Status
                let status = TimeLogStatus.ON_TIME;
                if (!editCheckOut) status = TimeLogStatus.INCOMPLETE;

                const locationName = getLocationName();

                const updatePayload: Record<string, any> = {
                    user_id: user.id,
                    date: date,
                    check_in: editCheckIn,
                    check_out: editCheckOut || null,
                    break_start: editBreakStart || null,
                    break_end: editBreakEnd || null,
                    total_hours: totalHours,
                    status: status,
                };

                if (locationName !== 'Manual Entry') {
                    updatePayload.check_in_location = locationName;
                    if (editCheckOut) updatePayload.check_out_location = locationName;
                }

                const { error } = await supabase
                    .from('time_logs')
                    .update(updatePayload)
                    .eq('id', editId);

                if (error) {
                    console.error("Error updating log:", error);
                    addToast('error', 'Erro ao atualizar registo.');
                } else {
                    addToast('success', 'Registo atualizado com sucesso.');
                    navigate('/admin/attendance');
                }
                setSubmitting(false);
                return;
            }

            // --- CREATE MODE SUBMISSION ---
            if (!movement || !time) {
                addToast('warning', 'Selecione o movimento e a hora.');
                setSubmitting(false);
                return;
            }

            const locationName = getLocationName();

            const newLog: TimeLog = {
                id: `manual-${Date.now()}`,
                userId: user.id,
                date: date,
                checkIn: movement === 'IN' ? time : undefined,
                checkOut: movement === 'OUT' ? time : undefined,
                checkInLocation: movement === 'IN' ? locationName : undefined,
                checkOutLocation: movement === 'OUT' ? locationName : undefined,
                status: TimeLogStatus.ON_TIME,
            };

            await onAddLog(newLog);
            navigate('/admin/attendance');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500">A carregar registo...</div>;
    }

    return (
        <div className="p-8 w-full max-w-4xl mx-auto animate-fade-in">
            <button onClick={() => navigate('/admin/attendance')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft size={20} /> Voltar
            </button>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{editId ? 'Editar Registo de Ponto' : 'Nova Picagem Manual'}</h1>
                <p className="text-sm text-gray-500 mt-1">{editId ? 'Corrija ou complete os horários do colaborador.' : 'Registo manual de assiduidade para colaboradores.'}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
                    <div className="bg-brand-600 p-2.5 rounded-lg text-white shadow-sm ring-4 ring-brand-50/50">
                        {editId ? <Clock size={24} /> : <CheckCircle2 size={24} />}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Detalhes do Registo</h2>
                        <p className="text-xs text-gray-500">{editId ? 'Edite as horas de entrada e saída.' : 'Preencha os dados do ponto manual.'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* USER */}
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">
                            Colaborador: <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <SearchableSelect
                                options={[
                                    { id: '', label: 'Nenhum seleccionado' },
                                    ...users.filter(u => u.status === 'ACTIVE').map(u => ({
                                        id: u.id,
                                        label: u.name,
                                        sublabel: u.role
                                    }))
                                ]}
                                value={selectedUserId}
                                onChange={(id) => setSelectedUserId(Number(id))}
                                placeholder="Pesquisar colaborador..."
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* DATE */}
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">
                            Data: <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                disabled={!!editId}
                                className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${editId ? 'bg-gray-100' : ''}`}
                            />
                        </div>
                    </div>

                    {editId ? (
                        /* --- EDIT MODE INPUTS --- */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-brand-50 rounded-xl border border-brand-100">
                            <div>
                                <label className="block text-sm font-bold text-brand-800 mb-2">
                                    Hora de Entrada <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={editCheckIn}
                                    onChange={(e) => setEditCheckIn(e.target.value)}
                                    className="w-full px-4 py-3 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-800 mb-2">
                                    Hora de Saída
                                </label>
                                <input
                                    type="time"
                                    value={editCheckOut}
                                    onChange={(e) => setEditCheckOut(e.target.value)}
                                    className="w-full px-4 py-3 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                                <p className="text-xs text-brand-600 mt-1">Deixe em branco se ainda estiver a trabalhar.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-800 mb-2">
                                    Início Almoço
                                </label>
                                <input
                                    type="time"
                                    value={editBreakStart}
                                    onChange={(e) => setEditBreakStart(e.target.value)}
                                    className="w-full px-4 py-3 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-800 mb-2">
                                    Fim Almoço
                                </label>
                                <input
                                    type="time"
                                    value={editBreakEnd}
                                    onChange={(e) => setEditBreakEnd(e.target.value)}
                                    className="w-full px-4 py-3 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    ) : (
                        /* --- CREATE MODE INPUTS --- */
                        <>
                            {/* LOCATION */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Localização:
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <select
                                        value={selectedLocationId}
                                        onChange={(e) => setSelectedLocationId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    >
                                        <option value="">Nenhum seleccionado</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}{loc.address ? ` - ${loc.address}` : ''}</option>
                                        ))}
                                        <option value="remoto">Remoto</option>
                                    </select>
                                </div>
                            </div>

                            {/* MOVEMENT & TIME */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">
                                        Movimento: <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <select
                                            required
                                            value={movement}
                                            onChange={(e) => setMovement(e.target.value as 'IN' | 'OUT')}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        >
                                            <option value="">Nenhum seleccionado</option>
                                            <option value="IN">Entrada</option>
                                            <option value="OUT">Saída</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">
                                        Hora: <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="time"
                                            required
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="pt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/attendance')}
                            disabled={submitting}
                            className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            {editId ? 'Atualizar Registo' : 'Guardar'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default ManualTimeEntry;
