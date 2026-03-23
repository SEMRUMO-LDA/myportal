import React, { useState } from 'react';
import { X, Fingerprint, Smartphone, Shield, CheckCircle2 } from 'lucide-react';
import { User } from '../../types';
import { biometricAuthService } from '../../services/biometricAuthService';
import { useToast } from '../../context/ToastContext';

interface BiometricSetupModalProps {
  user: User;
  onComplete: () => void;
  onSkip: () => void;
}

const BiometricSetupModal: React.FC<BiometricSetupModalProps> = ({ user, onComplete, onSkip }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'intro' | 'setup' | 'success'>('intro');
  const { addToast } = useToast();

  const handleSetup = async () => {
    setIsLoading(true);
    setStep('setup');

    try {
      // Check if supported
      const isSupported = biometricAuthService.isSupported();
      if (!isSupported) {
        addToast('error', 'Autenticação biométrica não é suportada neste dispositivo.');
        onSkip();
        return;
      }

      // Check if platform authenticator available
      const isAvailable = await biometricAuthService.isPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        addToast('error', 'Face ID/Touch ID não está disponível neste dispositivo.');
        onSkip();
        return;
      }

      // Register biometric credential
      const credential = await biometricAuthService.register(user.id, user.name);

      if (credential) {
        setStep('success');
        addToast('success', '✅ Autenticação biométrica ativada com sucesso!');

        // Auto-close after 2 seconds
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        addToast('error', 'Não foi possível ativar a autenticação biométrica.');
        onSkip();
      }
    } catch (error: any) {
      console.error('Biometric setup error:', error);

      if (error.name === 'BiometricCancelledError') {
        addToast('info', 'Configuração cancelada. Pode ativar mais tarde nas opções.');
      } else if (error.name === 'BiometricNotSupportedError') {
        addToast('error', 'Autenticação biométrica não é suportada.');
      } else {
        addToast('error', 'Erro ao configurar autenticação biométrica.');
      }
      onSkip();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'intro' && 'Ativar Autenticação Biométrica'}
            {step === 'setup' && 'A configurar...'}
            {step === 'success' && 'Configuração Concluída!'}
          </h2>
          {step === 'intro' && (
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'intro' && (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                    <Fingerprint size={48} className="text-blue-600" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                    <Shield size={20} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Login mais rápido e seguro
                </h3>
                <p className="text-gray-600 mb-4">
                  Ative Face ID ou Touch ID para fazer login em apenas 1 segundo, sem precisar de PIN ou password.
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                  <Smartphone size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Login em 1 segundo</p>
                    <p className="text-xs text-gray-600">Sem precisar de introduzir PIN</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-green-50 p-3 rounded-lg">
                  <Shield size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">100% Seguro</p>
                    <p className="text-xs text-gray-600">Dados biométricos nunca saem do dispositivo</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                  <CheckCircle2 size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">PIN sempre disponível</p>
                    <p className="text-xs text-gray-600">Pode usar PIN como backup</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSetup}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
                >
                  {isLoading ? 'A configurar...' : 'Ativar Agora'}
                </button>

                <button
                  onClick={onSkip}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
                >
                  Ativar Mais Tarde
                </button>
              </div>
            </>
          )}

          {step === 'setup' && (
            <div className="text-center py-8">
              <div className="animate-bounce mb-4">
                <Fingerprint size={64} className="text-blue-600 mx-auto" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                A configurar autenticação biométrica
              </p>
              <p className="text-sm text-gray-600">
                Siga as instruções no seu dispositivo...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-scale-in">
                  <CheckCircle2 size={48} className="text-green-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">
                Tudo pronto!
              </p>
              <p className="text-sm text-gray-600">
                Agora pode usar Face ID/Touch ID para fazer login.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiometricSetupModal;
