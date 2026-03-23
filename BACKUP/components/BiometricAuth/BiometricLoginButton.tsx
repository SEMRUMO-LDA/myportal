import React, { useState, useEffect } from 'react';
import { Fingerprint, Smartphone } from 'lucide-react';
import { biometricAuthService } from '../../services/biometricAuthService';

interface BiometricLoginButtonProps {
  userId: number;
  onSuccess: (userId: number) => void;
  onError: (error: string) => void;
}

const BiometricLoginButton: React.FC<BiometricLoginButtonProps> = ({
  userId,
  onSuccess,
  onError
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, [userId]);

  const checkBiometricAvailability = async () => {
    // Check if WebAuthn is supported
    const supported = biometricAuthService.isSupported();
    setIsSupported(supported);

    if (!supported) return;

    // Check if platform authenticator is available
    const available = await biometricAuthService.isPlatformAuthenticatorAvailable();
    setIsAvailable(available);

    // Check if user has credentials registered
    if (userId) {
      const credentials = await biometricAuthService.hasCredentials(userId);
      setHasCredentials(credentials);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);

    try {
      const result = await biometricAuthService.authenticate(userId);

      if (result.success) {
        onSuccess(userId);
      } else {
        onError('Autenticação biométrica falhou. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Biometric login error:', error);

      if (error.name === 'BiometricCancelledError') {
        onError('Autenticação cancelada.');
      } else if (error.name === 'BiometricNotSupportedError') {
        onError('Autenticação biométrica não suportada neste dispositivo.');
      } else {
        onError('Erro na autenticação biométrica. Use o PIN como alternativa.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Only show if supported, available and user has credentials
  if (!isSupported || !isAvailable || !hasCredentials) {
    return null;
  }

  // Detect device type for appropriate icon
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const Icon = isMobile ? Smartphone : Fingerprint;

  return (
    <button
      onClick={handleBiometricLogin}
      disabled={isLoading}
      className="relative w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-600/30 overflow-hidden group"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>

      {/* Content */}
      <div className="relative flex items-center justify-center gap-3">
        {isLoading ? (
          <>
            <div className="animate-spin">
              <Icon size={24} />
            </div>
            <span>A autenticar...</span>
          </>
        ) : (
          <>
            <Icon size={24} className="animate-pulse" />
            <span>Login com {isMobile ? 'Face ID / Touch ID' : 'Biometria'}</span>
          </>
        )}
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </button>
  );
};

export default BiometricLoginButton;
