import React, { useState, useEffect } from 'react';
import { Car, Play, AlertCircle } from 'lucide-react';
import { User, Vehicle } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../context/ToastContext';
import QuickActionCard from './QuickActionCard';

interface LastVehicleQuickProps {
  user: User;
}

interface LastUsedVehicle {
  vehicle: Vehicle;
  lastUsed: string;
}

const LastVehicleQuick: React.FC<LastVehicleQuickProps> = ({ user }) => {
  const [lastVehicle, setLastVehicle] = useState<LastUsedVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchLastUsedVehicle();
  }, [user.id]);

  const fetchLastUsedVehicle = async () => {
    try {
      // Get last vehicle trip from this user
      const { data: lastTrip, error: tripError } = await supabase
        .from('vehicle_trips')
        .select(`
          vehicle_id,
          start_time,
          vehicles (*)
        `)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (tripError && tripError.code !== 'PGRST116') {
        throw tripError;
      }

      if (lastTrip && lastTrip.vehicles) {
        setLastVehicle({
          vehicle: lastTrip.vehicles as Vehicle,
          lastUsed: lastTrip.start_time
        });
      }
    } catch (error) {
      console.error('Error fetching last vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!lastVehicle) return;

    setIsStarting(true);

    try {
      // Check if vehicle is already in use
      const { data: activeTrips, error: checkError } = await supabase
        .from('vehicle_trips')
        .select('id, user_id, users(name)')
        .eq('vehicle_id', lastVehicle.vehicle.id)
        .is('end_time', null);

      if (checkError) throw checkError;

      if (activeTrips && activeTrips.length > 0) {
        const otherUser = activeTrips[0].users as any;
        addToast('error', `Viatura já está em uso por ${otherUser?.name || 'outro utilizador'}.`);
        setIsStarting(false);
        return;
      }

      // Start new trip
      const { error: insertError } = await supabase
        .from('vehicle_trips')
        .insert({
          vehicle_id: lastVehicle.vehicle.id,
          user_id: user.id,
          start_time: new Date().toISOString(),
          start_km: null, // User can fill this later
          purpose: 'Viagem iniciada via Quick Action'
        });

      if (insertError) throw insertError;

      addToast('success', `✅ Viagem iniciada com ${lastVehicle.vehicle.plate}`);
      setShowModal(false);
    } catch (error) {
      console.error('Error starting trip:', error);
      addToast('error', 'Erro ao iniciar viagem.');
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <QuickActionCard
        icon={Car}
        title="Viatura Rápida"
        description="A carregar..."
        color="orange"
        onClick={() => {}}
        disabled
        loading
      />
    );
  }

  if (!lastVehicle) {
    return null; // Don't show if no vehicle history
  }

  const daysSinceUsed = Math.floor(
    (new Date().getTime() - new Date(lastVehicle.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <QuickActionCard
        icon={Car}
        title="Viatura Rápida"
        description={lastVehicle.vehicle.plate}
        color="orange"
        badge={lastVehicle.vehicle.model}
        onClick={() => setShowModal(true)}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-3 rounded-xl">
                  <Car size={24} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Iniciar Viagem</h2>
                  <p className="text-sm text-gray-500">Última viatura usada</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Vehicle info */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-orange-600 font-semibold uppercase mb-1">Matrícula</p>
                    <p className="text-3xl font-black text-gray-900">{lastVehicle.vehicle.plate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-orange-600 font-semibold uppercase mb-1">Modelo</p>
                    <p className="text-lg font-bold text-gray-700">{lastVehicle.vehicle.model}</p>
                  </div>
                </div>

                {lastVehicle.vehicle.brand && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-semibold">Marca:</span> {lastVehicle.vehicle.brand}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-orange-200">
                  <AlertCircle size={14} className="text-orange-600" />
                  <p className="text-xs text-gray-600">
                    Última utilização há {daysSinceUsed === 0 ? 'hoje' : `${daysSinceUsed} dia${daysSinceUsed > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">ℹ️ Nota:</span> Após iniciar a viagem, pode adicionar os quilómetros e outros detalhes na secção de Viaturas.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleStartTrip}
                  disabled={isStarting}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      A iniciar...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Iniciar Viagem Agora
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LastVehicleQuick;
