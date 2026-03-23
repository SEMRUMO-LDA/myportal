import React, { useState, useEffect, useMemo } from 'react';
import {
    Car,
    Calendar,
    Download,
    ChevronLeft,
    ChevronRight,
    Filter,
    User as UserIcon,
    Route,
    FileSpreadsheet
} from 'lucide-react';
import { Trip, Vehicle, Company } from '../types';
import { fetchTripsForMonth } from '../services/fleetService';

const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MonthlyTripReport: React.FC = () => {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [companyFilter, setCompanyFilter] = useState<string>('ALL');

    useEffect(() => {
        loadTrips();
    }, [year, month]);

    const loadTrips = async () => {
        setLoading(true);
        const data = await fetchTripsForMonth(year, month);
        setTrips(data);
        setLoading(false);
    };

    const filteredTrips = useMemo(() => {
        if (companyFilter === 'ALL') return trips;
        return trips.filter(t => t.vehicle?.company === companyFilter);
    }, [trips, companyFilter]);

    // Group trips by vehicle
    const tripsByVehicle = useMemo(() => {
        const grouped: Record<string, { vehicle: Vehicle; trips: Trip[]; totalKm: number }> = {};

        filteredTrips.forEach(trip => {
            if (!trip.vehicle) return;
            const vehicleId = trip.vehicleId;

            if (!grouped[vehicleId]) {
                grouped[vehicleId] = {
                    vehicle: trip.vehicle,
                    trips: [],
                    totalKm: 0
                };
            }

            grouped[vehicleId].trips.push(trip);
            if (trip.endKm && trip.startKm) {
                grouped[vehicleId].totalKm += trip.endKm - trip.startKm;
            }
        });

        return Object.values(grouped).sort((a, b) =>
            a.vehicle.plate.localeCompare(b.vehicle.plate)
        );
    }, [filteredTrips]);

    const totalKmAll = useMemo(() =>
        tripsByVehicle.reduce((sum, group) => sum + group.totalKm, 0)
        , [tripsByVehicle]);

    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    const exportToCSV = () => {
        const headers = ['Viatura', 'Data', 'Condutor', 'Destino', 'Km Inicial', 'Km Final', 'Km Viagem'];
        const rows: string[][] = [];

        tripsByVehicle.forEach(group => {
            group.trips.forEach(trip => {
                rows.push([
                    group.vehicle.plate,
                    new Date(trip.startDate).toLocaleDateString('pt-PT'),
                    trip.user?.name || 'Desconhecido',
                    trip.destination || '-',
                    String(trip.startKm),
                    trip.endKm ? String(trip.endKm) : '-',
                    trip.endKm ? String(trip.endKm - trip.startKm) : '-'
                ]);
            });
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_viagens_${MONTHS_PT[month - 1]}_${year}.csv`;
        link.click();
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Relatório Mensal de Viagens</h1>
                    <p className="text-sm text-gray-500">Listagem de todas as viagens por viatura</p>
                </div>
                <button
                    onClick={exportToCSV}
                    disabled={filteredTrips.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={18} />
                    <span>Exportar CSV</span>
                </button>
            </div>

            {/* Month Selector */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronLeft size={20} className="text-gray-600" />
                </button>

                <div className="flex items-center gap-4">
                    <Calendar className="text-brand-600" size={24} />
                    <span className="text-xl font-bold text-gray-900">
                        {MONTHS_PT[month - 1]} {year}
                    </span>
                </div>

                <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronRight size={20} className="text-gray-600" />
                </button>
            </div>

            {/* Filters & Summary */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                >
                    <option value="ALL">Todas as Empresas</option>
                    <option value={Company.SEMRUMO}>SEMRUMO</option>
                    <option value={Company.AORUBRO}>AORUBRO</option>
                    <option value={Company.HAKURA}>HAKURA</option>
                </select>

                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <Car className="text-gray-400" size={18} />
                        <span className="text-gray-600">{tripsByVehicle.length} viaturas</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Route className="text-gray-400" size={18} />
                        <span className="text-gray-600">{filteredTrips.length} viagens</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-brand-600">
                        <FileSpreadsheet size={18} />
                        <span>{totalKmAll.toLocaleString('pt-PT')} km total</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
            ) : tripsByVehicle.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Car size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">Sem viagens registadas neste mês</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {tripsByVehicle.map(group => (
                        <div key={group.vehicle.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            {/* Vehicle Header */}
                            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-brand-100 rounded-lg">
                                        <Car className="text-brand-600" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{group.vehicle.plate}</h3>
                                        <p className="text-xs text-gray-500">{group.vehicle.brand} {group.vehicle.model}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-brand-600">{group.totalKm.toLocaleString('pt-PT')} km</p>
                                    <p className="text-xs text-gray-500">{group.trips.length} viagens</p>
                                </div>
                            </div>

                            {/* Trips Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Condutor</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Destino</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Km Inicial</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Km Final</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Km Viagem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {group.trips.map(trip => (
                                            <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 text-sm text-gray-900">
                                                    {new Date(trip.startDate).toLocaleDateString('pt-PT')}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <UserIcon size={14} className="text-gray-400" />
                                                        <span className="text-sm text-gray-700">{trip.user?.name || 'Desconhecido'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600">{trip.destination || '-'}</td>
                                                <td className="px-6 py-3 text-sm text-gray-600 text-right font-mono">
                                                    {trip.startKm.toLocaleString('pt-PT')}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600 text-right font-mono">
                                                    {trip.endKm ? trip.endKm.toLocaleString('pt-PT') : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-sm font-bold text-brand-600 text-right">
                                                    {trip.endKm ? `${(trip.endKm - trip.startKm).toLocaleString('pt-PT')} km` : 'Em curso'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MonthlyTripReport;
