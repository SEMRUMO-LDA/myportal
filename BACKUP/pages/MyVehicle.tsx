import React, { useState, useEffect } from 'react';
import {
    Car,
    MapPin,
    Clock,
    Fuel,
    Route,
    AlertTriangle,
    CheckCircle2,
    Play,
    Square,
    Receipt,
    History,
    ChevronRight,
    X,
    Save,
    Calendar
} from 'lucide-react';
import {
    User,
    Vehicle,
    Trip,
    VehicleExpense,
    VehicleStatus,
    VehicleExpenseCategory,
    VehicleExpenseCategoryLabels
} from '../types';
import {
    fetchVehicleByUserId,
    fetchTrips,
    fetchActiveTrip,
    startTrip,
    endTrip,
    createVehicleExpense,
    fetchVehicleExpenses,
    getInspectionStatus
} from '../services/fleetService';
import { useToast } from '../context/ToastContext';

interface MyVehicleProps {
    user: User;
}

const MyVehicle: React.FC<MyVehicleProps> = ({ user }) => {
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    // Modal states
    const [showStartTripModal, setShowStartTripModal] = useState(false);
    const [showEndTripModal, setShowEndTripModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setLoading(true);
        const [vehicleData, activeTripData, tripsData, expensesData] = await Promise.all([
            fetchVehicleByUserId(user.id),
            fetchActiveTrip(user.id),
            fetchTrips(undefined, user.id),
            fetchVehicleExpenses(undefined, user.id)
        ]);
        setVehicle(vehicleData);
        setActiveTrip(activeTripData);
        setTrips(tripsData);
        setExpenses(expensesData);
        setLoading(false);
    };

    const handleStartTrip = async (startKm: number, purpose?: string, destination?: string) => {
        if (!vehicle) return;
        const trip = await startTrip(vehicle.id, user.id, startKm, purpose, destination);
        if (trip) {
            setActiveTrip(trip);
            // Optimistically update vehicle status and Odometer
            setVehicle(prev => prev ? { ...prev, status: VehicleStatus.IN_USE, currentKm: startKm } : null);
            setShowStartTripModal(false);
        }
    };

    const handleEndTrip = async (endKm: number) => {
        if (!activeTrip) return;
        const trip = await endTrip(activeTrip.id, endKm);
        if (trip) {
            setActiveTrip(null);
            setTrips(prev => [trip, ...prev.filter(t => t.id !== trip.id)]);
            setVehicle(prev => prev ? { ...prev, status: VehicleStatus.AVAILABLE, currentKm: endKm } : null);
            setShowEndTripModal(false);
        }
    };

    const handleAddExpense = async (expense: Omit<VehicleExpense, 'id' | 'created_at'>) => {
        const newExpense = await createVehicleExpense(expense);
        if (newExpense) {
            setExpenses(prev => [newExpense, ...prev]);
            setShowExpenseModal(false);
            addToast('success', 'Despesa registada com sucesso!');
        } else {
            addToast('error', 'Erro ao registar despesa. Tente novamente.');
        }
    };

    const totalExpensesThisMonth = expenses
        .filter(e => {
            const expDate = new Date(e.date);
            const now = new Date();
            return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
        })
        .reduce((acc, e) => acc + e.amount, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="p-6">
                <div className="bg-white -gray-800 rounded-2xl p-8 text-center border border-gray-100 -gray-700">
                    <Car size={64} className="mx-auto mb-4 text-gray-300 -gray-600" />
                    <h2 className="text-xl font-bold text-gray-900 -white mb-2">Sem Viatura Atribuída</h2>
                    <p className="text-gray-500 -gray-400">
                        Não tens nenhuma viatura da empresa atribuída de momento.
                        Contacta o teu gestor se precisares de uma viatura.
                    </p>
                </div>
            </div>
        );
    }

    const inspectionStatus = getInspectionStatus(vehicle.nextInspection);
    const totalKmThisMonth = trips
        .filter(t => {
            const tripDate = new Date(t.startDate);
            const now = new Date();
            return tripDate.getMonth() === now.getMonth() && tripDate.getFullYear() === now.getFullYear();
        })
        .reduce((acc, t) => acc + (t.endKm && t.startKm ? t.endKm - t.startKm : 0), 0);

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 -white">Minha Viatura</h1>
                <p className="text-sm text-gray-500 -gray-400">
                    Gere as tuas viagens e regista quilómetros
                </p>
            </div>

            {/* Vehicle Card */}
            <div className="bg-white -gray-800 rounded-2xl p-6 border border-gray-100 -gray-700">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Vehicle Icon */}
                    <div className="p-4 bg-brand-100 -brand-900/30 rounded-2xl shrink-0">
                        <Car className="text-brand-600 -brand-400" size={48} />
                    </div>

                    {/* Vehicle Info */}
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900 -white">{vehicle.plate}</h2>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${activeTrip
                                ? 'bg-green-100 text-green-700 -green-900/30 -green-400'
                                : 'bg-gray-100 text-gray-700 -gray-700 -gray-300'
                                }`}>
                                {activeTrip ? '● Em Viagem' : 'Disponível'}
                            </span>
                        </div>
                        <p className="text-gray-500 -gray-400">
                            {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                        </p>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin size={16} className="text-gray-400" />
                                <span className="font-medium text-gray-900 -white">
                                    {vehicle.currentKm.toLocaleString('pt-PT')} km
                                </span>
                            </div>

                            {inspectionStatus && (
                                <div className={`flex items-center gap-2 text-sm ${inspectionStatus === 'EXPIRED' ? 'text-red-600' :
                                    inspectionStatus === 'UPCOMING' ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                    {inspectionStatus === 'EXPIRED' ? <AlertTriangle size={16} /> :
                                        inspectionStatus === 'UPCOMING' ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                                    <span className="font-medium">
                                        Inspeção: {inspectionStatus === 'OK' ? 'OK' : inspectionStatus === 'UPCOMING' ? 'Próxima' : 'Expirada'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 shrink-0">
                        {activeTrip ? (
                            <button
                                onClick={() => setShowEndTripModal(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                            >
                                <Square size={18} />
                                <span>Finalizar Viagem</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowStartTripModal(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium"
                            >
                                <Play size={18} />
                                <span>Iniciar Viagem</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white -gray-700 text-gray-700 -gray-200 border border-gray-200 -gray-600 rounded-xl hover:bg-gray-50 :bg-gray-600 transition-colors font-medium"
                        >
                            <Receipt size={18} />
                            <span>Registar Despesa</span>
                        </button>
                    </div>
                </div>

                {/* Active Trip Banner */}
                {activeTrip && (
                    <div className="mt-6 p-4 bg-green-50 -green-900/20 border border-green-200 -green-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 -green-900/50 rounded-lg">
                                    <Route className="text-green-600 -green-400" size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-green-700 -green-400">Viagem em curso</p>
                                    <p className="text-xs text-green-600 -green-500">
                                        Início: {new Date(activeTrip.startDate).toLocaleString('pt-PT')} • {activeTrip.startKm.toLocaleString('pt-PT')} km
                                    </p>
                                </div>
                            </div>
                            {activeTrip.destination && (
                                <div className="text-right">
                                    <p className="text-sm font-medium text-green-700 -green-400">{activeTrip.destination}</p>
                                    {activeTrip.purpose && <p className="text-xs text-green-600 -green-500">{activeTrip.purpose}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 -blue-900/30 rounded-lg">
                            <Route className="text-blue-600 -blue-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 -white">{trips.length}</p>
                            <p className="text-xs text-gray-500">Total Viagens</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 -green-900/30 rounded-lg">
                            <MapPin className="text-green-600 -green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 -white">{totalKmThisMonth.toLocaleString('pt-PT')}</p>
                            <p className="text-xs text-gray-500">Km este mês</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 -purple-900/30 rounded-lg">
                            <Calendar className="text-purple-600 -purple-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 -white">
                                {trips.filter(t => {
                                    const tripDate = new Date(t.startDate);
                                    const now = new Date();
                                    return tripDate.getMonth() === now.getMonth() && tripDate.getFullYear() === now.getFullYear();
                                }).length}
                            </p>
                            <p className="text-xs text-gray-500">Viagens este mês</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white -gray-800 rounded-xl p-4 border border-gray-100 -gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 -orange-900/30 rounded-lg">
                            <Receipt className="text-orange-600 -orange-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 -white">{totalExpensesThisMonth.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</p>
                            <p className="text-xs text-gray-500">Despesas este mês</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Trips */}
            <div className="bg-white -gray-800 rounded-2xl border border-gray-100 -gray-700">
                <div className="px-6 py-4 border-b border-gray-100 -gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 -white flex items-center gap-2">
                        <History size={18} />
                        Histórico de Viagens
                    </h3>
                </div>

                {trips.length > 0 ? (
                    <div className="divide-y divide-gray-100 -gray-700">
                        {trips.slice(0, 10).map(trip => (
                            <div key={trip.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 :bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${trip.status === 'ACTIVE'
                                        ? 'bg-green-100 -green-900/30'
                                        : 'bg-gray-100 -gray-700'
                                        }`}>
                                        <Route size={18} className={
                                            trip.status === 'ACTIVE'
                                                ? 'text-green-600 -green-400'
                                                : 'text-gray-500 -gray-400'
                                        } />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 -white">
                                            {trip.destination || 'Viagem sem destino'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(trip.startDate).toLocaleDateString('pt-PT')} • {trip.purpose || 'Sem motivo'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900 -white">
                                        {trip.endKm && trip.startKm
                                            ? `${(trip.endKm - trip.startKm).toLocaleString('pt-PT')} km`
                                            : <span className="text-green-600">Em curso</span>
                                        }
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {trip.startKm.toLocaleString('pt-PT')} → {trip.endKm?.toLocaleString('pt-PT') || '...'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="px-6 py-12 text-center">
                        <Route size={48} className="mx-auto mb-4 text-gray-300 -gray-600" />
                        <p className="text-gray-500 -gray-400">Sem viagens registadas</p>
                    </div>
                )}
            </div>

            {/* Expense History */}
            <div className="bg-white -gray-800 rounded-2xl border border-gray-100 -gray-700">
                <div className="px-6 py-4 border-b border-gray-100 -gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 -white flex items-center gap-2">
                        <Receipt size={18} />
                        Despesas
                    </h3>
                    <span className="text-sm text-gray-500">{expenses.length} registos</span>
                </div>

                {expenses.length > 0 ? (
                    <div className="divide-y divide-gray-100 -gray-700">
                        {expenses.slice(0, 10).map(expense => (
                            <div key={expense.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 :bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-orange-100 -orange-900/30 rounded-lg">
                                        <Receipt size={18} className="text-orange-600 -orange-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 -white">
                                            {VehicleExpenseCategoryLabels[expense.category] || expense.category}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(expense.date).toLocaleDateString('pt-PT')} {expense.description && `• ${expense.description}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900 -white">
                                        {expense.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                                    </p>
                                    {expense.liters && (
                                        <p className="text-xs text-gray-500">{expense.liters} L</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="px-6 py-12 text-center">
                        <Receipt size={48} className="mx-auto mb-4 text-gray-300 -gray-600" />
                        <p className="text-gray-500 -gray-400">Sem despesas registadas</p>
                    </div>
                )}
            </div>

            {/* Start Trip Modal */}
            {showStartTripModal && vehicle && (
                <StartTripModal
                    vehicle={vehicle}
                    onClose={() => setShowStartTripModal(false)}
                    onStart={handleStartTrip}
                />
            )}

            {/* End Trip Modal */}
            {showEndTripModal && activeTrip && (
                <EndTripModal
                    trip={activeTrip}
                    onClose={() => setShowEndTripModal(false)}
                    onEnd={handleEndTrip}
                />
            )}

            {/* Expense Modal */}
            {showExpenseModal && vehicle && (
                <ExpenseModal
                    vehicle={vehicle}
                    userId={user.id}
                    tripId={activeTrip?.id}
                    onClose={() => setShowExpenseModal(false)}
                    onSave={handleAddExpense}
                />
            )}
        </div>
    );
};

// Start Trip Modal
interface StartTripModalProps {
    vehicle: Vehicle;
    onClose: () => void;
    onStart: (startKm: number, purpose?: string, destination?: string) => void;
}

const StartTripModal: React.FC<StartTripModalProps> = ({ vehicle, onClose, onStart }) => {
    const [startKm, setStartKm] = useState(vehicle.currentKm);
    const [purpose, setPurpose] = useState('');
    const [destination, setDestination] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStart(startKm, purpose || undefined, destination || undefined);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white -gray-800 rounded-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-100 -gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 -white">Iniciar Viagem</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 :bg-gray-700 rounded-lg">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-4 bg-brand-50 -brand-900/20 rounded-xl flex items-center gap-3">
                        <Car className="text-brand-600" size={24} />
                        <div>
                            <p className="font-bold text-brand-700 -brand-400">{vehicle.plate}</p>
                            <p className="text-sm text-brand-600">{vehicle.brand} {vehicle.model}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">
                            Quilometragem Inicial *
                        </label>
                        <input
                            type="number"
                            required
                            value={startKm}
                            onChange={(e) => setStartKm(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">
                            Destino
                        </label>
                        <input
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="Ex: Lisboa"
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">
                            Motivo
                        </label>
                        <input
                            type="text"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="Ex: Reunião com cliente"
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 :bg-gray-700 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-lg font-medium flex items-center justify-center gap-2"
                        >
                            <Play size={18} />
                            Iniciar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// End Trip Modal
interface EndTripModalProps {
    trip: Trip;
    onClose: () => void;
    onEnd: (endKm: number) => void;
}

const EndTripModal: React.FC<EndTripModalProps> = ({ trip, onClose, onEnd }) => {
    const [endKm, setEndKm] = useState(trip.startKm);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (endKm >= trip.startKm) {
            onEnd(endKm);
        }
    };

    const distance = endKm - trip.startKm;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white -gray-800 rounded-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-100 -gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 -white">Finalizar Viagem</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 :bg-gray-700 rounded-lg">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-4 bg-gray-50 -gray-700/50 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Início</span>
                            <span className="font-medium text-gray-900 -white">
                                {new Date(trip.startDate).toLocaleString('pt-PT')}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Km Inicial</span>
                            <span className="font-medium text-gray-900 -white">
                                {trip.startKm.toLocaleString('pt-PT')} km
                            </span>
                        </div>
                        {trip.destination && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Destino</span>
                                <span className="font-medium text-gray-900 -white">{trip.destination}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">
                            Quilometragem Final *
                        </label>
                        <input
                            type="number"
                            required
                            min={trip.startKm}
                            value={endKm}
                            onChange={(e) => setEndKm(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                        />
                    </div>

                    {distance > 0 && (
                        <div className="p-4 bg-green-50 -green-900/20 rounded-xl text-center">
                            <p className="text-sm text-green-600 -green-400">Distância percorrida</p>
                            <p className="text-2xl font-bold text-green-700 -green-400">
                                {distance.toLocaleString('pt-PT')} km
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 :bg-gray-700 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={endKm < trip.startKm}
                            className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 rounded-lg font-medium flex items-center justify-center gap-2"
                        >
                            <Square size={18} />
                            Finalizar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Expense Modal
interface ExpenseModalProps {
    vehicle: Vehicle;
    userId: number;
    tripId?: number;
    onClose: () => void;
    onSave: (expense: Omit<VehicleExpense, 'id' | 'created_at'>) => void;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ vehicle, userId, tripId, onClose, onSave }) => {
    const [category, setCategory] = useState<VehicleExpenseCategory>('FUEL');
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const categoryLabels: Record<VehicleExpenseCategory, string> = {
        FUEL: 'Combustível',
        TOLLS: 'Portagens',
        PARKING: 'Estacionamento',
        MAINTENANCE: 'Manutenção',
        INSURANCE: 'Seguro',
        OTHER: 'Outros'
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            vehicleId: vehicle.id,
            userId,
            tripId,
            date,
            category,
            amount,
            description: description || undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white -gray-800 rounded-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-100 -gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 -white">Registar Despesa</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 :bg-gray-700 rounded-lg">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">
                            Categoria *
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as VehicleExpenseCategory)}
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                        >
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">
                            Valor (€) *
                        </label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">
                            Data
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 -gray-300 mb-1">
                            Descrição
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Ex: Abastecimento na Galp"
                            className="w-full px-3 py-2 border border-gray-200 -gray-600 rounded-lg bg-white -gray-700 text-gray-900 -white resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 :bg-gray-700 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={amount <= 0}
                            className="flex-1 px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 rounded-lg font-medium flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MyVehicle;
