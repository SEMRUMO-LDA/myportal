import React, { useState } from 'react';
import { Calendar, X, CheckCircle } from 'lucide-react';
import { User, LeaveType } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../context/ToastContext';
import QuickActionCard from './QuickActionCard';

interface LeaveQuickRequestProps {
  user: User;
  leaveTypes: LeaveType[];
  availableDays: number;
}

const LeaveQuickRequest: React.FC<LeaveQuickRequestProps> = ({
  user,
  leaveTypes,
  availableDays
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedDays, setSelectedDays] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const vacationTypeId = leaveTypes.find(lt => lt.name.toLowerCase().includes('férias'))?.id;

  const handleQuickRequest = async () => {
    if (!vacationTypeId) {
      addToast('error', 'Tipo de férias não encontrado.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate dates (next working days)
      const startDate = getNextWorkingDay();
      const endDate = addWorkingDays(startDate, selectedDays - 1);

      // Create leave request
      const { error } = await supabase
        .from('leaves')
        .insert({
          user_id: user.id,
          leave_type_id: vacationTypeId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'PENDING',
          notes: `Pedido rápido de ${selectedDays} dias úteis`
        });

      if (error) throw error;

      addToast('success', `✅ Pedido de ${selectedDays} dias de férias enviado!`);
      setShowModal(false);
    } catch (error) {
      console.error('Error submitting quick leave:', error);
      addToast('error', 'Erro ao enviar pedido de férias.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNextWorkingDay = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Skip weekend
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return tomorrow;
  };

  const addWorkingDays = (startDate: Date, days: number): Date => {
    const result = new Date(startDate);
    let addedDays = 0;

    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }

    return result;
  };

  if (availableDays === 0) {
    return null; // Don't show if no days available
  }

  return (
    <>
      <QuickActionCard
        icon={Calendar}
        title="Férias Rápidas"
        description={`${availableDays} dias disponíveis`}
        color="green"
        badge={`${selectedDays}d`}
        onClick={() => setShowModal(true)}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Pedir Férias Rápido</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Days selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Quantos dias úteis?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[3, 5, 7, 10, 15].map(days => (
                    <button
                      key={days}
                      onClick={() => setSelectedDays(days)}
                      disabled={days > availableDays}
                      className={`
                        py-3 rounded-xl font-bold text-sm transition-all
                        ${selectedDays === days
                          ? 'bg-green-600 text-white shadow-lg scale-110'
                          : days > availableDays
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Início:</span>{' '}
                  {getNextWorkingDay().toLocaleDateString('pt-PT')}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Fim:</span>{' '}
                  {addWorkingDays(getNextWorkingDay(), selectedDays - 1).toLocaleDateString('pt-PT')}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  (Apenas dias úteis, fins de semana excluídos)
                </p>
              </div>

              {/* Balance */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Dias disponíveis:</span>
                  <span className="text-xl font-bold text-blue-600">{availableDays}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Após este pedido:</span>
                  <span className="text-lg font-bold text-gray-900">{availableDays - selectedDays}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleQuickRequest}
                  disabled={isSubmitting || selectedDays > availableDays}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      A enviar...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Enviar Pedido
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

export default LeaveQuickRequest;
