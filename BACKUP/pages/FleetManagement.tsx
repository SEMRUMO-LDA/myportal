import React, { useState, useEffect, useMemo } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import {
    Car,
    Plus,
    Search,
    Filter,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Wrench,
    MapPin,
    Calendar,
    ChevronRight,
    X,
    Save,
    Trash2,
    UserCircle,
    Fuel,
    Route
} from 'lucide-react';
import {
    Vehicle,
    VehicleStatus,
    VehicleStatusLabels,
    User,
    Company,
    MaintenanceRecord,
    Trip
} from '../types';
import {
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    fetchTrips,
    fetchMaintenanceRecords,
    getInspectionStatus
} from '../services/fleetService';
import VehicleBookingCalendar from '../components/VehicleBookingCalendar';
import VehicleBookingModal from '../components/VehicleBookingModal';

interface FleetManagementProps {
    users: User[];
    currentUser?: User;
    currentCompany?: Company | string;
    addToast?: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const FleetManagement: React.FC<FleetManagementProps> = ({ users, currentUser, currentCompany, addToast }) => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [companyFilter, setCompanyFilter] = useState<string>(currentCompany || 'ALL');
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'vehicles' | 'bookings'>('vehicles');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [vehicleData, tripData, maintenanceData] = await Promise.all([
                fetchVehicles(),
                fetchTrips(),
                fetchMaintenanceRecords()
            ]);
            setVehicles(vehicleData);
            setTrips(tripData);
            setMaintenanceRecords(maintenanceData);
        } catch (err: any) {
            console.error('Failed to load fleet data:', err);
            setError(err.message || 'Erro ao carregar dados da frota');
        } finally {
            setLoading(false);
        }
    };

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const matchesSearch =
                v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.model.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
            const matchesCompany = companyFilter === 'ALL' || v.company === companyFilter;
            return matchesSearch && matchesStatus && matchesCompany;
        });
    }, [vehicles, searchTerm, statusFilter, companyFilter]);

    const getMaintenanceStatus = (vehicle: Vehicle, records: MaintenanceRecord[]) => {
        // Find latest maintenance record with a nextDueKm
        const vehicleRecords = records
            .filter(r => r.vehicleId === vehicle.id && r.nextDueKm)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (vehicleRecords.length === 0) return 'OK';

        const lastRecord = vehicleRecords[0];
        if (!lastRecord.nextDueKm) return 'OK';

        const kmDiff = lastRecord.nextDueKm - vehicle.currentKm;

        if (kmDiff < 0) return 'OVERDUE';
        if (kmDiff < 1000) return 'DUE_SOON';
        return 'OK';
    };

    const stats = useMemo(() => {
        const total = vehicles.length;
        const inUse = vehicles.filter(v => v.status === VehicleStatus.IN_USE).length;
        const available = vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length;
        const maintenance = vehicles.filter(v => v.status === VehicleStatus.MAINTENANCE).length;
        const expiredInspections = vehicles.filter(v => getInspectionStatus(v.nextInspection) === 'EXPIRED').length;
        const upcomingInspections = vehicles.filter(v => getInspectionStatus(v.nextInspection) === 'UPCOMING').length;

        // New Maintenance Stats
        const maintenanceOverdue = vehicles.filter(v => getMaintenanceStatus(v, maintenanceRecords) === 'OVERDUE').length;
        const maintenanceDueSoon = vehicles.filter(v => getMaintenanceStatus(v, maintenanceRecords) === 'DUE_SOON').length;

        return { total, inUse, available, maintenance, expiredInspections, upcomingInspections, maintenanceOverdue, maintenanceDueSoon };
    }, [vehicles, maintenanceRecords]);

    const getStatusBadge = (status: VehicleStatus) => {
        const styles: Record<VehicleStatus, string> = {
            [VehicleStatus.AVAILABLE]: 'bg-green-100 text-green-700 -green-900/30 -green-400',
            [VehicleStatus.IN_USE]: 'bg-blue-100 text-blue-700 -blue-900/30 -blue-400',
            [VehicleStatus.MAINTENANCE]: 'bg-orange-100 text-orange-700 -orange-900/30 -orange-400',
            [VehicleStatus.INACTIVE]: 'bg-gray-100 text-gray-700 -gray-700 -gray-400'
        };

        const labels: Record<VehicleStatus, string> = {
            [VehicleStatus.AVAILABLE]: 'Disponível',
            [VehicleStatus.IN_USE]: 'Em Uso',
            [VehicleStatus.MAINTENANCE]: 'Manutenção',
            [VehicleStatus.INACTIVE]: 'Inativo'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                {labels[status] || status}
            </span>
        );
    };

    const getInspectionBadge = (nextInspection?: string) => {
        const status = getInspectionStatus(nextInspection);
        if (!status) return <span className="text-xs text-gray-400">Não definida</span>;

        const styles = {
            OK: 'bg-green-100 text-green-700 -green-900/30 -green-400',
            UPCOMING: 'bg-yellow-100 text-yellow-700 -yellow-900/30 -yellow-400',
            EXPIRED: 'bg-red-100 text-red-700 -red-900/30 -red-400'
        };
        const labels = { OK: 'OK', UPCOMING: 'Próxima', EXPIRED: 'Expirada' };
        const icons = {
            OK: <CheckCircle2 size={12} />,
            UPCOMING: <Clock size={12} />,
            EXPIRED: <AlertTriangle size={12} />
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                {icons[status]}
                {labels[status]}
                {nextInspection && <span className="ml-1 opacity-75">({new Date(nextInspection).toLocaleDateString('pt-PT')})</span>}
            </span>
        );
    };

    const getMaintenanceAlertBadge = (vehicle: Vehicle) => {
        const status = getMaintenanceStatus(vehicle, maintenanceRecords);
        if (status === 'OK') return null;

        if (status === 'OVERDUE') {
            return (
                <div className="flex items-center gap-1 text-red-600 -red-400 text-xs font-bold bg-red-50 -red-900/20 px-2 py-0.5 rounded-full border border-red-100 -red-900/30 mt-1 w-fit">
                    <AlertTriangle size={10} />
                    <span>Revisão Atrasada</span>
                </div>
            );
        }
        if (status === 'DUE_SOON') {
            return (
                <div className="flex items-center gap-1 text-orange-600 -orange-400 text-xs font-bold bg-orange-50 -orange-900/20 px-2 py-0.5 rounded-full border border-orange-100 -orange-900/30 mt-1 w-fit">
                    <Clock size={10} />
                    <span>Revisão Breve</span>
                </div>
            );
        }
    };

    const handleOpenVehicleModal = (vehicle?: Vehicle) => {
        setSelectedVehicle(vehicle || null);
        setShowVehicleModal(true);
    };

    const handleViewDetails = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setShowDetailModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                Erro ao carregar dados: <span className="font-bold">{error}</span>
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                                Verifique a consola para mais detalhes ou contacte o suporte.
                            </p>
                            <button
                                onClick={() => loadData()}
                                className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-600"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 -white">Gestão de Frota</h1>
                    <p className="text-sm text-gray-500 -gray-400">
                        Controlo de viaturas, viagens e manutenções
                    </p>
                </div>
                <button
                    onClick={() => handleOpenVehicleModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm"
                >
                    <Plus size={18} />
                    <span>Nova Viatura</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 -gray-700 rounded-lg">
                            <Car className="text-gray-600 -gray-300" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 -white">{stats.total}</p>
                            <p className="text-xs text-gray-500">Total</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 -green-900/30 rounded-lg">
                            <CheckCircle2 className="text-green-600 -green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600 -green-400">{stats.available}</p>
                            <p className="text-xs text-gray-500">Disponíveis</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 -blue-900/30 rounded-lg">
                            <Route className="text-blue-600 -blue-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600 -blue-400">{stats.inUse}</p>
                            <p className="text-xs text-gray-500">Em Viagem</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 -orange-900/30 rounded-lg">
                            <Wrench className="text-orange-600 -orange-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-600 -orange-400">{stats.maintenance}</p>
                            <p className="text-xs text-gray-500">Manutenção</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 -red-900/30 rounded-lg">
                            <AlertTriangle className="text-red-600 -red-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600 -red-400">{stats.expiredInspections}</p>
                            <p className="text-xs text-gray-500">Insp. Expiradas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 -yellow-900/30 rounded-lg">
                            <Clock className="text-yellow-600 -yellow-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-600 -yellow-400">{stats.upcomingInspections}</p>
                            <p className="text-xs text-gray-500">Insp. Próximas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 -purple-900/30 rounded-lg">
                            <Wrench className="text-purple-600 -purple-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 -white">
                                {stats.maintenanceOverdue + stats.maintenanceDueSoon}
                            </p>
                            <p className="text-xs text-gray-500">Alertas Mecânicos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-4 border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('vehicles')}
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'vehicles' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Viaturas
                </button>
                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'bookings' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Reservas
                </button>
            </div>

            {/* CONTENT */}
            {activeTab === 'vehicles' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Pesquisar por matrícula, marca ou modelo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="ALL">Todos os Estados</option>
                            <option value={VehicleStatus.AVAILABLE}>Disponível</option>
                            <option value={VehicleStatus.IN_USE}>Em Uso</option>
                            <option value={VehicleStatus.MAINTENANCE}>Manutenção</option>
                            <option value={VehicleStatus.INACTIVE}>Inativo</option>
                        </select>
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
                    </div>

                    {/* Vehicles Table */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Matrícula</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Modelo</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quilometragem</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Inspeção</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Atribuído</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredVehicles.map((vehicle) => {
                                        const statusBadge = getStatusBadge(vehicle.status);
                                        const statusLabel = VehicleStatusLabels[vehicle.status] || vehicle.status;

                                        return (
                                            <tr
                                                key={vehicle.id}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => handleViewDetails(vehicle)}
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${statusBadge.bg} ${statusBadge.text}`}>
                                                            <Car size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900">{vehicle.plate}</p>
                                                            <p className="text-xs text-gray-500">{vehicle.company}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-sm text-gray-900">{vehicle.brand}</p>
                                                    <p className="text-xs text-gray-500">{vehicle.model}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {vehicle.currentKm.toLocaleString('pt-PT')} <span className="text-xs text-gray-500">km</span>
                                                    </p>
                                                    {getMaintenanceAlertBadge(vehicle)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {getInspectionBadge(vehicle.nextInspection)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {(() => {
                                                        const activeTrip = trips.find(t => t.vehicleId === vehicle.id && t.status === 'ACTIVE');

                                                        if (vehicle.status === VehicleStatus.IN_USE && activeTrip) {
                                                            const driverName = activeTrip.user?.name || users.find(u => u.id === activeTrip.userId)?.name || 'Desconhecido';
                                                            return (
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                                                                        <div className="relative flex h-2 w-2">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                                        </div>
                                                                        <span className="text-sm truncate max-w-[150px]">{driverName}</span>
                                                                    </div>
                                                                    <span className="text-xs text-blue-500 pl-4">Em viagem</span>
                                                                </div>
                                                            );
                                                        }

                                                        if (vehicle.assignedUser) {
                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <UserCircle size={16} className="text-gray-400" />
                                                                    <span className="text-sm text-gray-700">{vehicle.assignedUser.name}</span>
                                                                </div>
                                                            );
                                                        }

                                                        return <span className="text-xs text-gray-400">Não atribuído (Pool)</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDetails(vehicle);
                                                            }}
                                                            title="Ver Detalhes"
                                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Search size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenVehicleModal(vehicle);
                                                            }}
                                                            title="Editar Viatura"
                                                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        >
                                                            <Wrench size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredVehicles.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                                <Car size={48} className="mx-auto mb-4 opacity-30" />
                                                <p className="font-medium">Sem viaturas encontradas</p>
                                                <p className="text-sm">Ajuste os filtros ou adicione uma nova viatura</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'bookings' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowBookingModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm"
                        >
                            <Plus size={18} />
                            <span>Nova Reserva</span>
                        </button>
                    </div>
                    <VehicleBookingCalendar
                        refreshTrigger={refreshTrigger}
                        onBookingClick={(booking) => {
                            // Can show details later
                            // console.log removed('Clicked booking', booking);
                        }}
                    />
                </div>
            )}

            {/* Vehicle Modal (Create/Edit) */}
            {
                showVehicleModal && (
                    <VehicleFormModal
                        vehicle={selectedVehicle}
                        users={users}
                        onClose={() => setShowVehicleModal(false)}
                        onSave={async (data) => {
                            try {
                                if (selectedVehicle) {
                                    await updateVehicle(selectedVehicle.id, data);
                                    addToast?.('success', 'Viatura atualizada com sucesso!');
                                } else {
                                    await createVehicle(data as any);
                                    addToast?.('success', 'Viatura criada com sucesso!');
                                }
                                loadData();
                                setShowVehicleModal(false);
                            } catch (err: any) {
                                console.error('Failed to save vehicle:', err);
                                addToast?.('error', `Erro ao guardar: ${err.message || 'Verifique os dados'}`);
                            }
                        }}
                        onDelete={async () => {
                            if (selectedVehicle) {
                                if (confirm('Tem a certeza que deseja eliminar esta viatura? Esta ação não pode ser desfeita.')) {
                                    try {
                                        await deleteVehicle(selectedVehicle.id);
                                        addToast?.('success', 'Viatura eliminada com sucesso!');
                                        loadData();
                                        setShowVehicleModal(false);
                                    } catch (err: any) {
                                        console.error('Failed to delete vehicle:', err);
                                        addToast?.('error', `Erro ao eliminar: ${err.message || 'Tente novamente'}`);
                                    }
                                }
                            }
                        }}
                    />
                )
            }

            {/* Vehicle Detail Modal */}
            {
                showDetailModal && selectedVehicle && (
                    <VehicleDetailModal
                        vehicle={selectedVehicle}
                        trips={trips.filter(t => t.vehicleId === selectedVehicle.id)}
                        maintenanceRecords={maintenanceRecords.filter(m => m.vehicleId === selectedVehicle.id)}
                        onClose={() => setShowDetailModal(false)}
                        onEdit={() => {
                            setShowDetailModal(false);
                            handleOpenVehicleModal(selectedVehicle);
                        }}
                    />
                )
            }

            {/* Booking Modal */}
            <VehicleBookingModal
                isOpen={showBookingModal}
                onClose={() => setShowBookingModal(false)}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
                currentUser={currentUser || users[0]}
            />
        </div >
    );
};

// Vehicle Form Modal Component
interface VehicleFormModalProps {
    vehicle: Vehicle | null;
    users: User[];
    onClose: () => void;
    onSave: (data: Partial<Vehicle>) => void;
    onDelete: () => void;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({ vehicle, users, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        plate: vehicle?.plate || '',
        brand: vehicle?.brand || '',
        model: vehicle?.model || '',
        year: vehicle?.year || new Date().getFullYear(),
        company: vehicle?.company || Company.SEMRUMO,
        status: vehicle?.status || VehicleStatus.AVAILABLE,
        currentKm: vehicle?.currentKm || 0,
        assignedUserId: vehicle?.assignedUserId || undefined,
        nextInspection: vehicle?.nextInspection || '',
        insuranceExpiry: vehicle?.insuranceExpiry || '',
        notes: vehicle?.notes || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white -gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white -gray-800 px-6 py-4 border-b border-gray-100 -gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 -white">
                        {vehicle ? 'Editar Viatura' : 'Nova Viatura'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 :bg-gray-700 rounded-lg">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Matrícula *</label>
                            <input
                                type="text"
                                required
                                value={formData.plate}
                                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                                placeholder="XX-XX-XX"
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Empresa *</label>
                            <select
                                required
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            >
                                <option value={Company.SEMRUMO}>SEMRUMO</option>
                                <option value={Company.AORUBRO}>AORUBRO</option>
                                <option value={Company.HAKURA}>HAKURA</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Marca</label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                placeholder="Ex: Hyundai"
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Modelo</label>
                            <input
                                type="text"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                placeholder="Ex: i30"
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Ano</label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Quilometragem</label>
                            <input
                                type="number"
                                value={formData.currentKm}
                                onChange={(e) => setFormData({ ...formData, currentKm: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Estado</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            >
                                <option value={VehicleStatus.AVAILABLE}>Disponível</option>
                                <option value={VehicleStatus.IN_USE}>Em Uso</option>
                                <option value={VehicleStatus.MAINTENANCE}>Em Manutenção</option>
                                <option value={VehicleStatus.INACTIVE}>Inativo</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Atribuído a</label>
                            <SearchableSelect
                                options={[
                                    { id: '', label: 'Não atribuído' },
                                    ...users.map(user => ({
                                        id: user.id,
                                        label: user.name,
                                        sublabel: user.role
                                    }))
                                ]}
                                value={formData.assignedUserId || ''}
                                onChange={(id) => setFormData({ ...formData, assignedUserId: id ? Number(id) : undefined })}
                                placeholder="Pesquisar colaborador..."
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Próxima Inspeção</label>
                            <input
                                type="date"
                                value={formData.nextInspection}
                                onChange={(e) => setFormData({ ...formData, nextInspection: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Validade Seguro</label>
                            <input
                                type="date"
                                value={formData.insuranceExpiry}
                                onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">Notas</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 -gray-700">
                        {vehicle && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 :bg-red-900/20 rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Eliminar
                            </button>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 :bg-gray-700 rounded-lg text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"
                            >
                                <Save size={16} />
                                Guardar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Vehicle Detail Modal Component
interface VehicleDetailModalProps {
    vehicle: Vehicle;
    trips: Trip[];
    maintenanceRecords: MaintenanceRecord[];
    onClose: () => void;
    onEdit: () => void;
}

const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({ vehicle, trips, maintenanceRecords, onClose, onEdit }) => {
    const totalKmTrips = trips.reduce((acc, trip) => {
        if (trip.endKm && trip.startKm) {
            return acc + (trip.endKm - trip.startKm);
        }
        return acc;
    }, 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white -gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white -gray-800 px-6 py-4 border-b border-gray-100 -gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-100 -brand-900/30 rounded-xl">
                            <Car className="text-brand-600 -brand-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 -white">{vehicle.plate}</h2>
                            <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onEdit} className="px-3 py-2 text-brand-600 hover:bg-brand-50 :bg-brand-900/20 rounded-lg text-sm font-medium">
                            Editar
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 :bg-gray-700 rounded-lg">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 -gray-700/50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900 -white">{vehicle.currentKm.toLocaleString('pt-PT')}</p>
                            <p className="text-xs text-gray-500">km atuais</p>
                        </div>
                        <div className="bg-gray-50 -gray-700/50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900 -white">{trips.length}</p>
                            <p className="text-xs text-gray-500">viagens</p>
                        </div>
                        <div className="bg-gray-50 -gray-700/50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900 -white">{totalKmTrips.toLocaleString('pt-PT')}</p>
                            <p className="text-xs text-gray-500">km registados</p>
                        </div>
                    </div>

                    {/* Recent Trips */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 -gray-300 mb-3 flex items-center gap-2">
                            <Route size={16} />
                            Últimas Viagens
                        </h3>
                        {trips.length > 0 ? (
                            <div className="space-y-2">
                                {trips.slice(0, 5).map(trip => (
                                    <div key={trip.id} className="flex items-center justify-between p-3 bg-gray-50 -gray-700/50 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 -white">{trip.destination || 'Sem destino'}</p>
                                            <p className="text-xs text-gray-500">{new Date(trip.startDate).toLocaleDateString('pt-PT')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900 -white">
                                                {trip.endKm && trip.startKm ? `${trip.endKm - trip.startKm} km` : 'Em curso'}
                                            </p>
                                            <p className={`text-xs ${trip.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'}`}>
                                                {trip.status === 'ACTIVE' ? 'Ativa' : 'Concluída'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">Sem viagens registadas</p>
                        )}
                    </div>

                    {/* Maintenance History */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 -gray-300 mb-3 flex items-center gap-2">
                            <Wrench size={16} />
                            Histórico de Manutenção
                        </h3>
                        {maintenanceRecords.length > 0 ? (
                            <div className="space-y-2">
                                {maintenanceRecords.slice(0, 5).map(record => (
                                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 -gray-700/50 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 -white">{record.type}</p>
                                            <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString('pt-PT')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900 -white">{record.km.toLocaleString('pt-PT')} km</p>
                                            {record.cost && <p className="text-xs text-gray-500">{record.cost.toFixed(2)}€</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">Sem registos de manutenção</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FleetManagement;
