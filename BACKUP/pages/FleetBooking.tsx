import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { fetchVehicles, fetchBookings, createBooking, checkAvailability } from '../services/fleetService';
import { Vehicle, User, VehicleBooking } from '../types';
import { useToast } from '../context/ToastContext';
import { Car, Clock, CalendarIcon, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface FleetBookingProps {
    user: User;
}

const FleetBooking: React.FC<FleetBookingProps> = ({ user }) => {
    const { addToast } = useToast();
    const calendarRef = useRef<FullCalendar>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [bookings, setBookings] = useState<VehicleBooking[]>([]);
    const [loading, setLoading] = useState(true);

    // Booking Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

    const [formData, setFormData] = useState({
        vehicleId: '',
        startDate: '',
        startTime: '09:00',
        endDate: '',
        endTime: '18:00',
        purpose: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get all vehicles
            const vData = await fetchVehicles();
            setVehicles(vData.filter(v => v.status !== 'INACTIVE'));

            // Get bookings from 1 month ago to 3 months in future
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const end = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString();

            const bData = await fetchBookings(start, end);
            setBookings(bData);
        } catch (error) {
            console.error('Error loading fleet data:', error);
            addToast('error', 'Erro ao carregar dados da frota.');
        } finally {
            setLoading(false);
        }
    };

    // Calendar Handlers
    const handleDateSelect = (selectInfo: any) => {
        // Automatically populate form dates when user clicks/drags on calendar
        const start = selectInfo.start;
        const end = selectInfo.end;
        const resourceId = selectInfo.resource?.id;

        // Format dates to YYYY-MM-DD
        const startDateStr = start.toISOString().split('T')[0];
        // FullCalendar selection end is exclusive, subtract 1 min to get inclusive date if dragging across days
        const endDateObj = new Date(end.getTime() - 60000);
        const endDateStr = endDateObj.toISOString().split('T')[0];

        // Format times to HH:mm
        const startTimeStr = start.toTimeString().substring(0, 5);
        const endTimeStr = end.toTimeString().substring(0, 5);

        setFormData(prev => ({
            ...prev,
            vehicleId: resourceId || prev.vehicleId,
            startDate: startDateStr,
            startTime: startTimeStr,
            endDate: endDateStr,
            endTime: endTimeStr === '00:00' ? '23:59' : endTimeStr
        }));

        setIsAvailable(null);
        setIsFormOpen(true);
    };

    const handleEventClick = (clickInfo: any) => {
        // Show details of existing booking
        const bId = clickInfo.event.id;
        const b = bookings.find(x => x.id?.toString() === bId);
        if (b) {
            addToast('info', `Reserva de ${b.user?.name || 'Colega'}: ${b.purpose}`);
        }
    };

    // Form Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsAvailable(null); // Reset availability check when params change
    };

    const checkSlotAvailability = async () => {
        if (!formData.vehicleId || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
            addToast('warning', 'Preencha todos os campos de data e hora.');
            return;
        }

        const start = `${formData.startDate}T${formData.startTime}:00`;
        const end = `${formData.endDate}T${formData.endTime}:00`;

        if (new Date(start) >= new Date(end)) {
            addToast('warning', 'A data de fim deve ser posterior à data de início.');
            return;
        }

        setIsChecking(true);
        try {
            const available = await checkAvailability(formData.vehicleId, start, end);
            setIsAvailable(available);
            if (!available) {
                addToast('error', 'Viatura indisponível para este período.');
            } else {
                addToast('success', 'Viatura disponível!');
            }
        } catch (error) {
            console.error('Error checking availability:', error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const start = `${formData.startDate}T${formData.startTime}:00`;
        const end = `${formData.endDate}T${formData.endTime}:00`;

        if (new Date(start) >= new Date(end)) {
            addToast('error', 'A data de fim deve ser posterior à data de início.');
            return;
        }

        setIsSubmitting(true);
        try {
            const bookingPayload = {
                vehicleId: formData.vehicleId,
                userId: user.id,
                startTime: start,
                endTime: end,
                purpose: formData.purpose,
                notes: formData.notes
            };

            const newBooking = await createBooking(bookingPayload);
            if (newBooking) {
                setBookings(prev => [...prev, newBooking]);
                addToast('success', 'Reserva de viatura criada com sucesso!');
                setIsFormOpen(false);
                setFormData({
                    vehicleId: '',
                    startDate: '',
                    startTime: '09:00',
                    endDate: '',
                    endTime: '18:00',
                    purpose: '',
                    notes: ''
                });
                setIsAvailable(null);
            }
        } catch (error: any) {
            console.error('Error creating booking:', error);
            addToast('error', error.message || 'Erro ao criar reserva. A viatura poderá já estar ocupada.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Prepare Calendar Data
    const calendarResources = vehicles.map(v => ({
        id: v.id,
        title: `${v.brand} ${v.model} - ${v.plate} `,
        company: v.company
    }));

    const calendarEvents = bookings.map(b => ({
        id: b.id?.toString(),
        resourceId: b.vehicleId,
        title: `${b.user?.name?.split(' ')[0]} - ${b.purpose} `,
        start: b.startTime,
        end: b.endTime,
        backgroundColor: b.userId === user.id ? '#3b82f6' : '#64748b', // Blue for me, Gray for others
        borderColor: b.userId === user.id ? '#2563eb' : '#475569',
        extendedProps: { booking: b }
    }));

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-64">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-4" />
                <p className="text-gray-500">A carregar frota e reservas...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 h-[calc(100vh-theme(spacing.24))] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Car className="text-blue-600" /> Reservas de Frota
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Consulta a disponibilidade e faz o agendamento da viatura
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                        title="Atualizar"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                    >
                        {isFormOpen ? 'Esconder Formulário' : '+ Nova Reserva'}
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 flex gap-6 min-h-0">

                {/* Calendar View */}
                <div className={`flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col ${isFormOpen ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 text-xs flex gap-4 text-gray-500 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded px-1"></span> Minhas Reservas</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-500 rounded px-1"></span> Outros Colegas</div>
                        <div className="ml-auto">Clica e arrasta no calendário para selecionar uma data/viatura</div>
                    </div>

                    <div className="flex-1 p-4 overflow-auto booking-calendar-container">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[resourceTimelinePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="resourceTimelineWeek"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'resourceTimelineDay,resourceTimelineWeek,dayGridMonth'
                            }}
                            resources={calendarResources}
                            events={calendarEvents}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            resourceAreaWidth="250px"
                            resourceAreaHeaderContent="Viaturas"
                            slotMinTime="07:00:00"
                            slotMaxTime="22:00:00"
                            height="100%"
                            locale="pt"
                            buttonText={{
                                today: 'Hoje',
                                month: 'Mês',
                                week: 'Semana',
                                day: 'Dia'
                            }}
                            select={handleDateSelect}
                            eventClick={handleEventClick}
                            eventOverlap={false}
                        />
                    </div>
                </div>

                {/* Booking Form Sidebar */}
                {isFormOpen && (
                    <div className="w-full lg:w-96 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full animate-fade-in shrink-0 overflow-y-auto">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                            <h2 className="font-bold text-gray-900 text-lg">Nova Marcação</h2>
                            <p className="text-xs text-gray-500">Preenche os dados para reservar uma viatura</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Viatura *</label>
                                <select
                                    name="vehicleId"
                                    value={formData.vehicleId}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                >
                                    <option value="">Selecione uma viatura...</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.plate} - {v.brand} {v.model}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data Início *</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                        <input
                                            type="date"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="relative mt-2">
                                        <Clock className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                        <input
                                            type="time"
                                            name="startTime"
                                            value={formData.startTime}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data Fim *</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                        <input
                                            type="date"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="relative mt-2">
                                        <Clock className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-start">
                                <button
                                    type="button"
                                    onClick={checkSlotAvailability}
                                    disabled={isChecking || !formData.vehicleId || !formData.startDate || !formData.endDate}
                                    className="text-sm font-medium flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
                                >
                                    {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Verificar Disponibilidade
                                </button>
                            </div>

                            {isAvailable === true && (
                                <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
                                    <CheckCircle2 size={16} /> Disponível neste horário.
                                </div>
                            )}

                            {isAvailable === false && (
                                <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                    <AlertCircle size={16} /> Horário indisponível ou viatura já ocupada.
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Finalidade *</label>
                                <input
                                    type="text"
                                    name="purpose"
                                    value={formData.purpose}
                                    onChange={handleChange}
                                    placeholder="Ex: Visita a cliente Lisbo..."
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Notas Opcionais</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex gap-3 mt-auto sticky bottom-0 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isAvailable === false}
                                    className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300 transition-colors flex justify-center items-center"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Custom Styles for FullCalendar Timeline View inside Tailwind */}
            <style>{`
                .booking-calendar-container .fc {
                    font-family: inherit;
                    font-size: 0.875rem;
                }
                .booking-calendar-container .fc-theme-standard th, 
                .booking-calendar-container .fc-theme-standard td, 
                .booking-calendar-container .fc-theme-standard .fc-scrollgrid {
                    border-color: #f1f5f9;
                }
                .booking-calendar-container .fc .fc-toolbar-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                .booking-calendar-container .fc .fc-button-primary {
                    background-color: #f8fafc;
                    border-color: #e2e8f0;
                    color: #475569;
                    text-transform: capitalize;
                }
                .booking-calendar-container .fc .fc-button-primary:not(:disabled):active, 
                .booking-calendar-container .fc .fc-button-primary:not(:disabled).fc-button-active {
                    background-color: #e2e8f0;
                    border-color: #cbd5e1;
                    color: #0f172a;
                }
                .booking-calendar-container .fc .fc-button-primary:hover {
                    background-color: #f1f5f9;
                }
                .booking-calendar-container .fc-event {
                    cursor: pointer;
                    border-radius: 4px;
                    padding: 2px 4px;
                }
                .booking-calendar-container .fc-timeline-slot-label {
                    color: #64748b;
                }
            `}</style>
        </div>
    );
};

export default FleetBooking;
