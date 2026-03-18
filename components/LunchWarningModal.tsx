import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Coffee, Check, X } from 'lucide-react';

interface LunchWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  lastPunchTime?: string;
  punchCount: number;
}

const LunchWarningModal: React.FC<LunchWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  lastPunchTime,
  punchCount
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this before
    const dismissed = localStorage.getItem('lunch_warning_dismissed');
    if (dismissed === 'true') {
      setDontShowAgain(true);
    }
  }, []);

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem('lunch_warning_dismissed', 'true');
    }
    onConfirm();
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('lunch_warning_dismissed', 'true');
    }
    onClose();
  };

  if (!isOpen || (dontShowAgain && localStorage.getItem('lunch_warning_dismissed') === 'true')) {
    return null;
  }

  // Detect if this is likely a lunch break punch
  const now = new Date();
  const hour = now.getHours();
  const isLunchTime = hour >= 11 && hour <= 15;

  // If already have 1 punch and it's lunch time, show warning
  if (punchCount === 1 && isLunchTime) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur p-3 rounded-full">
                <Coffee size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Hora de Almoço?</h2>
                <p className="text-white/90 text-sm mt-1">Lembrete importante</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Alert Box */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-amber-900 font-bold text-sm">
                  NÃO é necessário picar para almoço!
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  O sistema deduz automaticamente 1 hora de almoço.
                </p>
              </div>
            </div>

            {/* Visual Guide */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-bold text-gray-800 mb-3 text-sm">Como funciona agora:</p>

              <div className="space-y-2">
                {/* Correct way */}
                <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                  <Check className="text-green-600" size={20} />
                  <div className="flex-1">
                    <p className="text-green-900 font-bold text-sm">CORRETO - 2 picagens:</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-green-700">
                      <span className="bg-green-100 px-2 py-1 rounded">09:00 Entrada</span>
                      <span>→</span>
                      <span className="bg-green-100 px-2 py-1 rounded">18:00 Saída</span>
                    </div>
                  </div>
                </div>

                {/* Wrong way */}
                <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-200">
                  <X className="text-red-600" size={20} />
                  <div className="flex-1">
                    <p className="text-red-900 font-bold text-sm">ERRADO - 4 picagens:</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-red-700">
                      <span className="bg-red-100 px-1.5 py-1 rounded text-[10px]">09:00</span>
                      <span className="bg-red-100 px-1.5 py-1 rounded text-[10px] line-through">13:00</span>
                      <span className="bg-red-100 px-1.5 py-1 rounded text-[10px] line-through">14:00</span>
                      <span className="bg-red-100 px-1.5 py-1 rounded text-[10px]">18:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User's current status */}
            <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-blue-600" size={16} />
                <span className="text-sm text-blue-900">
                  Sua entrada hoje: <strong>{lastPunchTime || '09:00'}</strong>
                </span>
              </div>
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-bold">
                1ª picagem
              </span>
            </div>

            {/* Don't show again checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-600">Não mostrar este aviso novamente</span>
            </label>
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancelar Picagem
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-lg"
            >
              Picar Mesmo Assim
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LunchWarningModal;