import React, { useState, useEffect } from 'react';
import { Vehicle, User, VehicleBooking } from '../types';
import { createBooking, checkAvailability, fetchVehicles } from '../services/fleetService';
import { X, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VehicleBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    preSelectedVehicleId?: string;
    darkMode?: boolean;
}

const VehicleBookingModal: React.FC<VehicleBookingModalProps> = ({
    isOpen, onClose, onSuccess, currentUser, preSelectedVehicleId, darkMode = false
}) => {
    // ... (state hooks remain same)
    const { addToast: showToast } = useToast();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

    const [formData, setFormData] = useState({
        vehicleId: preSelectedVehicleId || '',
        startDate: '',
        startTime: '09:00',
        endDate: '',
        endTime: '18:00',
        purpose: '',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadVehicles();
            setFormData(prev => ({
                ...prev,
                vehicleId: preSelectedVehicleId || prev.vehicleId
            }));
        }
    }, [isOpen, preSelectedVehicleId]);

    const loadVehicles = async () => {
        try {
            const data = await fetchVehicles();
            setVehicles(data.filter(v => v.status !== 'INACTIVE'));
        } catch (error) {
            console.error('Error loading vehicles:', error);
            showToast('Erro ao carregar viaturas.', 'error');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsAvailable(null);
    };

    const checkSlotAvailability = async () => {
        if (!formData.vehicleId || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
            showToast('Preencha todos os campos de data e hora.', 'warning');
            return;
        }

        const start = `${formData.startDate}T${formData.startTime}:00`;
        const end = `${formData.endDate}T${formData.endTime}:00`;

        if (new Date(start) >= new Date(end)) {
            showToast('A data de fim deve ser posterior à data de início.', 'warning');
            return;
        }

        setIsChecking(true);
        try {
            const available = await checkAvailability(formData.vehicleId, start, end);
            setIsAvailable(available);
            if (!available) {
                showToast('Viatura indisponível para este período.', 'error');
            } else {
                showToast('Viatura disponível!', 'success');
            }
        } catch (error) {
            console.error('Error checking availability:', error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser) {
            showToast('Erro: Utilizador não identificado.', 'error');
            return;
        }

        const start = `${formData.startDate}T${formData.startTime}:00`;
        const end = `${formData.endDate}T${formData.endTime}:00`;

        if (new Date(start) >= new Date(end)) {
            showToast('A data de fim deve ser posterior à data de início.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const bookingPayload = {
                vehicleId: formData.vehicleId,
                userId: currentUser.id,
                startTime: start,
                endTime: end,
                purpose: formData.purpose,
                notes: formData.notes
            };

            await createBooking(bookingPayload);

            showToast('Reserva criada com sucesso!', 'success');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating booking:', error);
            showToast(error.message || 'Erro ao criar reserva.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Theme Classes
    const bgClass = darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white';
    const textClass = darkMode ? 'text-white' : 'text-gray-800';
    const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-700';
    const inputBgClass = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900';
    const borderClass = darkMode ? 'border-gray-800' : 'border-gray-100';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`${bgClass} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in transition-colors duration-200`}>
                <div className={`flex justify-between items-center p-6 border-b ${borderClass}`}>
                    <h2 className={`text-xl font-bold ${textClass}`}>Nova Reserva de Viatura</h2>
                    <button onClick={onClose} className={`hover:bg-white/10 p-2 rounded-full transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${subTextClass}`}>Viatura</label>
                        <select
                            name="vehicleId"
                            value={formData.vehicleId}
                            onChange={handleChange}
                            required
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${inputBgClass}`}
                        >
                            <option value="">Selecione uma viatura...</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-800' : ''}>
                                    {v.plate} - {v.brand} {v.model}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${subTextClass}`}>Início</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBgClass}`}
                                />
                            </div>
                            <div className="relative mt-2">
                                <input
                                    type="time"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBgClass}`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${subTextClass}`}>Fim</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBgClass}`}
                                />
                            </div>
                            <div className="relative mt-2">
                                <input
                                    type="time"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBgClass}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={checkSlotAvailability}
                            disabled={isChecking || !formData.vehicleId || !formData.startDate}
                            className={`text-sm font-medium flex items-center gap-1 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-brand-600 hover:text-brand-700'}`}
                        >
                            {isChecking ? 'A verificar...' : 'Verificar Disponibilidade'}
                        </button>
                    </div>

                    {isAvailable === true && (
                        <div className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${darkMode ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-green-50 text-green-700'}`}>
                            <CheckCircle2 size={16} /> Viatura disponível para este período.
                        </div>
                    )}

                    {isAvailable === false && (
                        <div className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${darkMode ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-700'}`}>
                            <AlertCircle size={16} /> Viatura indisponível. Escolha outro horário.
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${subTextClass}`}>Finalidade</label>
                        <input
                            type="text"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            placeholder="Ex: Visita a cliente, Reunião em Lisboa..."
                            required
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${inputBgClass}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${subTextClass}`}>Notas (Opcional)</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none ${inputBgClass}`}
                        />
                    </div>

                    <div className={`flex gap-3 pt-4 border-t ${borderClass}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || isAvailable === false}
                            className={`flex-1 px-4 py-2 rounded-lg transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
                        >
                            {isLoading ? 'A gravar...' : 'Confirmar Reserva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleBookingModal;
