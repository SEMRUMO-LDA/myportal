import React, { useState, useEffect } from 'react';
import { VehicleBooking, Vehicle } from '../types';
import { fetchBookings, fetchVehicles } from '../services/fleetService';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, getHours, getMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';

interface VehicleBookingCalendarProps {
    onBookingClick?: (booking: VehicleBooking) => void;
    refreshTrigger?: number; // To trigger data reload
}

const VehicleBookingCalendar: React.FC<VehicleBookingCalendarProps> = ({ onBookingClick, refreshTrigger }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState<VehicleBooking[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

    useEffect(() => {
        loadData();
    }, [currentDate, viewMode, refreshTrigger]);

    const loadData = async () => {
        try {
            const [vehiclesData, bookingsData] = await Promise.all([
                fetchVehicles(),
                fetchBookings(
                    startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString(),
                    addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 7).toISOString()
                )
            ]);
            setVehicles(vehiclesData.filter(v => v.status !== 'INACTIVE'));
            setBookings(bookingsData);
        } catch (error) {
            console.error('Error loading calendar data:', error);
        }
    };

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00 to 19:00

    const getBookingsForCell = (vehicleId: string, day: Date, hour: number) => {
        return bookings.filter(booking => {
            const start = parseISO(booking.startTime);
            const end = parseISO(booking.endTime);
            const bookingDate = start;

            // Simplified check: if booking overlaps with this hour slot
            // This is a basic grid implementation, ideally creating absolute positioned blocks is better for time accuracy
            const isSameDate = isSameDay(day, bookingDate);
            if (!isSameDate) return false;

            const startHour = getHours(start);
            const endHour = getHours(end);

            return booking.vehicleId === vehicleId && (hour >= startHour && hour <= endHour);
        });
    };

    // Helper to calculate position and width for a booking bar
    const getBookingStyle = (booking: VehicleBooking, dayStart: Date) => {
        const start = parseISO(booking.startTime);
        const end = parseISO(booking.endTime);

        // Calculate minutes from start of day (00:00)
        const startMinutes = getHours(start) * 60 + getMinutes(start);
        const endMinutes = getHours(end) * 60 + getMinutes(end);

        // Grid starts at 07:00 (420 mins) and ends at 20:00 (1200 mins) -> 780 mins total logic height
        // But for week view we might want just a list or simple blocks.
        // Let's stick to a simpler Day/Vehicle matrix for Week View.
        return {};
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <CalendarIcon size={20} className="text-brand-600" />
                        {format(currentDate, 'MMMM yyyy', { locale: pt })}
                    </h2>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setCurrentDate(addDays(currentDate, -7))}
                            className="p-1 hover:bg-white rounded-md shadow-sm transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-2 text-xs font-medium hover:bg-white rounded-md transition-all"
                        >
                            Hoje
                        </button>
                        <button
                            onClick={() => setCurrentDate(addDays(currentDate, 7))}
                            className="p-1 hover:bg-white rounded-md shadow-sm transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 border-b bg-gray-50 font-semibold text-gray-600 w-40 min-w-[160px] sticky left-0 z-10">Viatura</th>
                            {weekDays.map(day => (
                                <th key={day.toString()} className={`p-3 border-b border-l bg-gray-50 font-semibold text-gray-600 min-w-[120px] ${isSameDay(day, new Date()) ? 'bg-blue-50 text-blue-700' : ''}`}>
                                    <div className="flex flex-col items-center">
                                        <span className="uppercase text-[10px] tracking-wider">{format(day, 'EEE', { locale: pt })}</span>
                                        <span className="text-lg">{format(day, 'd')}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map(vehicle => (
                            <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 border-b font-medium text-gray-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900">{vehicle.plate}</span>
                                        <span className="text-[10px] text-gray-500">{vehicle.brand} {vehicle.model}</span>
                                    </div>
                                </td>
                                {weekDays.map(day => {
                                    // Find bookings for this vehicle on this day
                                    const dayBookings = bookings.filter(b =>
                                        b.vehicleId === vehicle.id &&
                                        isSameDay(parseISO(b.startTime), day) &&
                                        b.status !== 'CANCELLED'
                                    );

                                    return (
                                        <td key={`${vehicle.id}-${day}`} className="p-2 border-b border-l align-top h-24 relative">
                                            <div className="flex flex-col gap-1">
                                                {dayBookings.map(booking => (
                                                    <button
                                                        key={booking.id}
                                                        onClick={() => onBookingClick && onBookingClick(booking)}
                                                        className="text-left bg-blue-100 hover:bg-blue-200 text-blue-800 p-1.5 rounded-md text-[10px] border border-blue-200 transition-all flex flex-col gap-0.5"
                                                    >
                                                        <div className="font-bold flex justify-between">
                                                            <span>{format(parseISO(booking.startTime), 'HH:mm')} - {format(parseISO(booking.endTime), 'HH:mm')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 truncate">
                                                            <User size={8} />
                                                            <span className="truncate">{booking.user?.name.split(' ')[0]}</span>
                                                        </div>
                                                        {booking.purpose && (
                                                            <span className="truncate opacity-70 italic">{booking.purpose}</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VehicleBookingCalendar;
