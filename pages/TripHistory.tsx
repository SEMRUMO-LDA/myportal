import React, { useState, useEffect, useMemo } from 'react';
import {
    Route,
    Search,
    Filter,
    Calendar,
    ArrowRight,
    UserCircle,
    Car,
    MapPin,
    CheckCircle2,
    Clock,
    AlertCircle,
    Download,
    X,
    Navigation,
    FileText
} from 'lucide-react';
import { Trip, User, Vehicle, TripStatus } from '../types';
import { fetchTrips, fetchVehicles } from '../services/fleetService';

interface TripHistoryProps {
    users: User[];
}

const TripHistory: React.FC<TripHistoryProps> = ({ users }) => {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, ACTIVE, COMPLETED
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [tripsData, vehiclesData] = await Promise.all([
            fetchTrips(),
            fetchVehicles()
        ]);
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setLoading(false);
    };

    // Derived State and Filtering
    const filteredTrips = useMemo(() => {
        return trips.filter(trip => {
            const vehicle = trip.vehicle || vehicles.find(v => v.id === trip.vehicleId);
            const user = trip.user || users.find(u => u.id === trip.userId);

            const searchString = `${vehicle?.plate || ''} ${vehicle?.brand || ''} ${user?.name || ''} ${trip.destination || ''}`.toLowerCase();
            const matchesSearch = searchString.includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;

            let matchesDate = true;
            if (startDateFilter) {
                matchesDate = matchesDate && new Date(trip.startDate) >= new Date(startDateFilter);
            }
            if (endDateFilter) {
                // Add 1 day to include the end date fully
                const end = new Date(endDateFilter);
                end.setDate(end.getDate() + 1);
                matchesDate = matchesDate && new Date(trip.startDate) < end;
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [trips, vehicles, users, searchTerm, statusFilter, startDateFilter, endDateFilter]);

    const stats = useMemo(() => {
        const totalTrips = filteredTrips.length;
        const totalKm = filteredTrips.reduce((acc, t) => {
            if (t.endKm && t.startKm) return acc + (t.endKm - t.startKm);
            return acc;
        }, 0);
        const activeTrips = filteredTrips.filter(t => t.status === 'ACTIVE').length;

        // Find most frequent driver
        const drivers: Record<string, number> = {};
        filteredTrips.forEach(t => {
            const name = t.user?.name || users.find(u => u.id === t.userId)?.name || 'Unknown';
            drivers[name] = (drivers[name] || 0) + 1;
        });
        const topDriver = Object.entries(drivers).sort((a, b) => b[1] - a[1])[0];

        return { totalTrips, totalKm, activeTrips, topDriver };
    }, [filteredTrips, users]);

    const openTripDetail = (trip: Trip) => {
        const vehicle = trip.vehicle || vehicles.find(v => v.id === trip.vehicleId);
        const user = trip.user || users.find(u => u.id === trip.userId);
        setSelectedTrip({ ...trip, vehicle, user });
    };


    const exportToCSV = () => {
        const headers = ['Data', 'Início', 'Fim', 'Colaborador', 'Viatura', 'Destino', 'Motivo', 'Km Inicial', 'Km Final', 'Distância', 'Estado'];
        const rows = filteredTrips.map(trip => {
            const vehicle = trip.vehicle || vehicles.find(v => v.id === trip.vehicleId);
            const user = trip.user || users.find(u => u.id === trip.userId);
            const distance = trip.endKm && trip.startKm ? trip.endKm - trip.startKm : 0;

            return [
                new Date(trip.startDate).toLocaleDateString('pt-PT'),
                new Date(trip.startDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                trip.endDate ? new Date(trip.endDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '-',
                user?.name || `User #${trip.userId}`,
                vehicle?.plate || trip.vehicleId,
                trip.destination || '-',
                trip.purpose || '-',
                String(trip.startKm),
                trip.endKm ? String(trip.endKm) : '-',
                String(distance),
                trip.status === 'ACTIVE' ? 'Em Curso' : 'Concluída'
            ];
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historico_viagens_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios de Viagem</h1>
                    <p className="text-sm text-gray-500 -gray-400">
                        Registo completo de utilização da frota
                    </p>
                </div>
                <button
                    onClick={exportToCSV}
                    disabled={filteredTrips.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={18} />
                    <span>Exportar CSV</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                            <Route className="text-brand-600 dark:text-brand-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTrips}</p>
                            <p className="text-xs text-gray-500">Viagens Realizadas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Car className="text-green-600 dark:text-green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalKm.toLocaleString('pt-PT')} km</p>
                            <p className="text-xs text-gray-500">Total Percorrido</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Clock className="text-purple-600 dark:text-purple-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeTrips}</p>
                            <p className="text-xs text-gray-500">Viagens Ativas Agora</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <UserCircle className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                                {stats.topDriver ? stats.topDriver[0] : '-'}
                            </p>
                            <p className="text-xs text-gray-500">Condutor Mais Frequente</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar por colaborador, matrícula ou destino..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                >
                    <option value="ALL">Todos os Estados</option>
                    <option value="ACTIVE">Em Curso</option>
                    <option value="COMPLETED">Concluídas</option>
                </select>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                        placeholder="Data Início"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                        placeholder="Data Fim"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Colaborador</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Viatura</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Localização</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalhes KM</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredTrips.map((trip) => {
                                const vehicle = trip.vehicle || vehicles.find(v => v.id === trip.vehicleId);
                                const user = trip.user || users.find(u => u.id === trip.userId);
                                const distance = trip.endKm && trip.startKm ? trip.endKm - trip.startKm : 0;

                                return (
                                    <tr
                                        key={trip.id}
                                        onClick={() => openTripDetail(trip)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-gray-400" />
                                                <span className="text-sm text-gray-700 -gray-300">
                                                    {new Date(trip.startDate).toLocaleDateString('pt-PT')}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 ml-6">
                                                {new Date(trip.startDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <UserCircle size={16} className="text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {user?.name || `User #${trip.userId}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Car size={16} className="text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{vehicle?.plate || trip.vehicleId}</p>
                                                    <p className="text-xs text-gray-500">{vehicle?.brand} {vehicle?.model}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2" title="Origem">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                    <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                                        {trip.startLocation || 'S/ Registo'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2" title="Destino">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                    <span className="text-xs text-gray-900 dark:text-white font-medium truncate max-w-[150px]">
                                                        {trip.destination || trip.endLocation || 'S/ Destino'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-mono">{trip.startKm}</span>
                                                <ArrowRight size={14} />
                                                <span className="font-mono">{trip.endKm || '...'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {trip.status === 'COMPLETED' ? (
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {distance} km
                                                </span>
                                            ) : (
                                                <span className="text-xs text-brand-500 font-medium">--</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {trip.status === 'ACTIVE' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                    </span>
                                                    EM CURSO
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                    <CheckCircle2 size={12} />
                                                    CONCLUÍDA
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTrips.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        <Route size={48} className="mx-auto mb-4 opacity-30" />
                                        <p className="font-medium">Sem viagens encontradas</p>
                                        <p className="text-sm">Tente ajustar os filtros de pesquisa</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer (Placeholder) */}
                <div className="bg-gray-50 -gray-900/50 px-4 py-3 border-t border-gray-100 -gray-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        A mostrar {filteredTrips.length} resultados
                    </span>
                    {/* Add pagination controls later if needed */}
                </div>
            </div>

            {/* Trip Detail Modal */}
            {selectedTrip && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white relative">
                            <button
                                onClick={() => setSelectedTrip(null)}
                                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl">
                                    <Car size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedTrip.vehicle?.plate}</h2>
                                    <p className="text-white/80 text-sm">{selectedTrip.vehicle?.brand} {selectedTrip.vehicle?.model}</p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                {selectedTrip.status === 'ACTIVE' ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-400 text-green-900">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-700"></span>
                                        </span>
                                        EM CURSO
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                                        <CheckCircle2 size={12} />
                                        CONCLUÍDA
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Driver */}
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <UserCircle className="text-orange-600" size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Condutor</p>
                                    <p className="text-gray-900 font-medium">{selectedTrip.user?.name || `User #${selectedTrip.userId}`}</p>
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Calendar className="text-blue-600" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Início</p>
                                        <p className="text-gray-900 font-medium">
                                            {new Date(selectedTrip.startDate).toLocaleDateString('pt-PT')}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(selectedTrip.startDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                {selectedTrip.endDate && (
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CheckCircle2 className="text-green-600" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Fim</p>
                                            <p className="text-gray-900 font-medium">
                                                {new Date(selectedTrip.endDate).toLocaleDateString('pt-PT')}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(selectedTrip.endDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Destination */}
                            {selectedTrip.destination && (
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <MapPin className="text-purple-600" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Destino</p>
                                        <p className="text-gray-900 font-medium">{selectedTrip.destination}</p>
                                    </div>
                                </div>
                            )}

                            {/* Kilometers */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Quilometragem</p>
                                <div className="flex items-center justify-between">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-gray-900">{selectedTrip.startKm.toLocaleString('pt-PT')}</p>
                                        <p className="text-xs text-gray-500">Km Inicial</p>
                                    </div>
                                    <ArrowRight className="text-gray-400" size={24} />
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-gray-900">
                                            {selectedTrip.endKm ? selectedTrip.endKm.toLocaleString('pt-PT') : '---'}
                                        </p>
                                        <p className="text-xs text-gray-500">Km Final</p>
                                    </div>
                                    <div className="text-center px-4 py-2 bg-brand-100 rounded-lg">
                                        <p className="text-2xl font-bold text-brand-600">
                                            {selectedTrip.endKm ? (selectedTrip.endKm - selectedTrip.startKm).toLocaleString('pt-PT') : '---'}
                                        </p>
                                        <p className="text-xs text-brand-600 font-semibold">TOTAL</p>
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            {selectedTrip.startLocation && (
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-teal-100 rounded-lg">
                                        <Navigation className="text-teal-600" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Localização GPS (Início)</p>
                                        <p className="text-gray-700 text-sm font-mono">{selectedTrip.startLocation}</p>
                                    </div>
                                </div>
                            )}

                            {/* Purpose/Notes */}
                            {selectedTrip.purpose && (
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <FileText className="text-indigo-600" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Motivo / Notas</p>
                                        <p className="text-gray-700">{selectedTrip.purpose}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <button
                                onClick={() => setSelectedTrip(null)}
                                className="w-full py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TripHistory;

