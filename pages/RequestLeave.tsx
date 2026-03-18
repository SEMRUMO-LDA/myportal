import React, { useState, useMemo } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { Calendar, Save, ArrowLeft, AlertCircle, CheckCircle2, UserCheck, TreePalm } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User, LeaveType, Leave, AbsenceStatus, UserStatus, ScheduleTemplate } from '../types';
import { getEffectiveScheduleDay } from '../utils/scheduleUtils';
import VacationBalanceCard, { calculateVacationBalance } from '../components/VacationBalanceCard';
import { useToast } from '../context/ToastContext';
import KioskCalendarModal from '../components/KioskCalendarModal';

interface RequestLeaveProps {
    user: User;
    users: User[];
    leaveTypes: LeaveType[];
    leaves: Leave[];
    onAddLeave: (leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>) => void;
    scheduleTemplates?: ScheduleTemplate[];
    kioskMode?: boolean;
}

const RequestLeave: React.FC<RequestLeaveProps> = ({ user, users, leaveTypes, leaves, onAddLeave, scheduleTemplates = [], kioskMode = false }) => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [selectedLeaveType, setSelectedLeaveType] = useState<number | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [backupUserId, setBackupUserId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [isLoadingTypes, setIsLoadingTypes] = useState(true);

    // Check if leave types are loaded
    React.useEffect(() => {
        if (leaveTypes && leaveTypes.length > 0) {
            setIsLoadingTypes(false);
        } else {
            // Wait a bit more for data to load
            const timer = setTimeout(() => {
                setIsLoadingTypes(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [leaveTypes]);

    // Calculate days excluding off-days
    const calculateDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        const startD = new Date(start + 'T00:00:00');
        const endD = new Date(end + 'T00:00:00');

        let count = 0;
        const iter = new Date(startD);
        const userTemplate = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);

        while (iter <= endD) {
            const daySchedule = getEffectiveScheduleDay(iter, user, userTemplate);
            const isOff = daySchedule?.isOff ?? (iter.getDay() === 0 || iter.getDay() === 6);
            if (!isOff) count++;
            iter.setDate(iter.getDate() + 1);
        }
        return count;
    };

    const totalDays = useMemo(() => calculateDays(startDate, endDate), [startDate, endDate]);

    // Check for conflicts
    const hasConflict = useMemo(() => {
        if (!startDate || !endDate || !user.department) return false;

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');

        return leaves.some(l => {
            if (l.status === 'REJECTED' || l.userId === user.id) return false;
            const u = users.find(u => u.id === l.userId);
            if (u?.department !== user.department) return false;

            const lStart = new Date(l.startDate + 'T00:00:00');
            const lEnd = new Date(l.endDate + 'T00:00:00');

            return (start <= lEnd && end >= lStart);
        });
    }, [startDate, endDate, leaves, users, user]);

    // Backup users (same department)
    const backupUsers = useMemo(() => {
        return users.filter(u =>
            u.id !== user.id &&
            u.status === UserStatus.ACTIVE &&
            u.department === user.department
        );
    }, [users, user]);

    const handleSubmit = async () => {
        if (!selectedLeaveType || !startDate || !endDate) {
            addToast('error', 'Por favor preencha todos os campos obrigatórios.');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            addToast('error', 'A data de fim deve ser posterior à data de início.');
            return;
        }

        setIsSubmitting(true);

        try {
            onAddLeave({
                userId: user.id,
                leaveTypeId: selectedLeaveType,
                startDate,
                endDate,
                status: AbsenceStatus.PENDING,
                notes: notes || undefined,
                backupUserId: backupUserId || undefined,
            });

            addToast('success', 'Pedido de ausência enviado com sucesso!');

            // Wait a bit before navigating back
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (kioskMode) {
                navigate('/portal');
            } else {
                navigate('/portal/team-calendar');
            }
        } catch (error) {
            console.error('[RequestLeave] Submit error:', error);
            addToast('error', 'Erro ao enviar pedido. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedType = leaveTypes.find(lt => lt.id === selectedLeaveType);

    // Vacation Balance
    const vacationBalance = useMemo(() => {
        return calculateVacationBalance(user, leaves, user.id, leaveTypes, scheduleTemplates);
    }, [user, leaves, leaveTypes, scheduleTemplates]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => kioskMode ? navigate('/portal') : navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 hover:text-brand-600 transition-colors mb-4"
                    >
                        <ArrowLeft size={20} />
                        <span>Voltar</span>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <TreePalm className="text-brand-600" />
                        Registar Ausência
                    </h1>
                    <p className="text-gray-500 mt-2">Preencha os dados abaixo para solicitar uma ausência</p>
                </div>

                {/* Vacation Balance */}
                <div className="mb-6">
                    <VacationBalanceCard balance={vacationBalance} compact />
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="p-6 md:p-8 space-y-6">
                        {/* User Info */}
                        <div className="bg-gradient-to-r from-brand-50 to-blue-50 p-4 rounded-xl border border-brand-100">
                            <div className="flex items-center gap-4">
                                <img
                                    src={user.photoUrl}
                                    alt={user.name}
                                    className="w-16 h-16 rounded-full border-2 border-white shadow-md"
                                />
                                <div>
                                    <div className="font-bold text-lg text-gray-900">{user.name}</div>
                                    <div className="text-sm text-gray-600">{user.department} · {user.role}</div>
                                </div>
                            </div>
                        </div>

                        {/* Leave Type Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Tipo de Ausência <span className="text-red-500">*</span>
                            </label>

                            {isLoadingTypes ? (
                                <div className="flex items-center justify-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
                                    <div className="text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                        <p className="text-sm text-gray-600 font-medium">A carregar tipos de ausência...</p>
                                    </div>
                                </div>
                            ) : leaveTypes.length === 0 ? (
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                                    <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
                                    <p className="text-red-900 font-bold mb-2">Nenhum tipo de ausência disponível</p>
                                    <p className="text-sm text-red-700">
                                        Por favor, contacte o administrador do sistema para configurar os tipos de ausência.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {leaveTypes.map(lt => (
                                    <button
                                        key={lt.id}
                                        type="button"
                                        onClick={() => setSelectedLeaveType(lt.id)}
                                        className={`p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 border-2 ${selectedLeaveType === lt.id
                                            ? 'border-gray-800 ring-4 ring-gray-200 shadow-lg scale-105'
                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                            }`}
                                        style={{
                                            backgroundColor: selectedLeaveType === lt.id ? lt.color + '15' : 'white',
                                            color: selectedLeaveType === lt.id ? lt.color : '#374151'
                                        }}
                                    >
                                        <span
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: lt.color }}
                                        />
                                        <span className="flex-1">{lt.name}</span>
                                        {selectedLeaveType === lt.id && (
                                            <CheckCircle2 size={20} />
                                        )}
                                    </button>
                                ))}
                                </div>
                            )}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Data Início <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        if (!endDate || endDate < e.target.value) {
                                            setEndDate(e.target.value);
                                        }
                                    }}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Data Fim <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                        </div>

                        {/* Days Counter */}
                        {totalDays > 0 && (
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-900">Total de Dias</span>
                                <span className="text-2xl font-bold text-blue-600">{totalDays} {totalDays === 1 ? 'dia' : 'dias'}</span>
                            </div>
                        )}

                        {/* Conflict Warning */}
                        {hasConflict && (
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-amber-900 text-sm">Atenção: Sobreposição Detetada</div>
                                    <div className="text-xs text-amber-700 mt-1">
                                        Existem outros colegas do seu departamento ausentes nestas datas.
                                        O pedido será avaliado pela chefia.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Backup User */}
                        {backupUsers.length > 0 && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <UserCheck size={16} className="text-emerald-600" />
                                    Quem fará a sua cobertura? (Opcional)
                                </label>
                                <SearchableSelect
                                    options={[
                                        { id: '', label: 'Nenhum selecionado' },
                                        ...backupUsers.map(u => ({
                                            id: u.id,
                                            label: u.name,
                                            sublabel: u.role
                                        }))
                                    ]}
                                    value={backupUserId || ''}
                                    onChange={(id) => setBackupUserId(id ? Number(id) : null)}
                                    placeholder="Pesquisar colega..."
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    A pessoa selecionada será notificada sobre a cobertura.
                                </p>
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Observações (Opcional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                                placeholder="Justificação ou informações adicionais..."
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-between gap-3">
                        <button
                            onClick={() => setShowCalendar(true)}
                            className="px-6 py-3 text-brand-700 bg-brand-50 border-2 border-brand-100 hover:bg-brand-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <Calendar size={20} />
                            Ver Calendário
                        </button>
                        <div className="flex flex-col md:flex-row gap-3">
                            <button
                                onClick={() => kioskMode ? navigate('/portal') : navigate(-1)}
                                disabled={isSubmitting}
                                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedLeaveType || !startDate || !endDate || isSubmitting}
                                className={`px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${selectedLeaveType && startDate && endDate && !isSubmitting
                                    ? 'bg-brand-600 hover:bg-brand-700 text-white hover:shadow-xl'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                                        A Enviar...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Enviar Pedido
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <div className="font-bold mb-1">Importante</div>
                            <ul className="list-disc list-inside space-y-1 text-blue-800">
                                <li>O seu pedido será enviado para aprovação</li>
                                <li>Receberá uma notificação quando for aprovado ou rejeitado</li>
                                <li>Pode acompanhar o estado na página "Banco de Horas"</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <KioskCalendarModal
                isOpen={showCalendar}
                onClose={() => setShowCalendar(false)}
                user={user}
                leaves={leaves}
                leaveTypes={leaveTypes}
            />
        </div>
    );
};

export default RequestLeave;
