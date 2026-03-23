import React, { useState, useEffect } from 'react';
import { Fingerprint, Smartphone, Trash2, Plus, Shield, CheckCircle, XCircle } from 'lucide-react';
import { User, BiometricCredential } from '../../types';
import { biometricAuthService } from '../../services/biometricAuthService';
import { useToast } from '../../context/ToastContext';

interface BiometricSettingsProps {
  user: User;
}

const BiometricSettings: React.FC<BiometricSettingsProps> = ({ user }) => {
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    checkSupport();
    loadCredentials();
  }, [user.id]);

  const checkSupport = async () => {
    const supported = biometricAuthService.isSupported();
    setIsSupported(supported);
  };

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const creds = await biometricAuthService.listCredentials(user.id);
      setCredentials(creds);
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCredential = async () => {
    setIsAdding(true);

    try {
      const available = await biometricAuthService.isPlatformAuthenticatorAvailable();
      if (!available) {
        addToast('error', 'Autenticação biométrica não está disponível neste dispositivo.');
        return;
      }

      const credential = await biometricAuthService.register(user.id, user.name);

      if (credential) {
        addToast('success', '✅ Dispositivo adicionado com sucesso!');
        await loadCredentials();
      } else {
        addToast('error', 'Não foi possível adicionar o dispositivo.');
      }
    } catch (error: any) {
      if (error.name === 'BiometricCancelledError') {
        addToast('info', 'Adição cancelada.');
      } else {
        addToast('error', 'Erro ao adicionar dispositivo.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCredential = async (credentialId: string, deviceName: string) => {
    if (!confirm(`Tem a certeza que deseja remover "${deviceName}"?\n\nNão poderá mais usar Face ID/Touch ID neste dispositivo.`)) {
      return;
    }

    try {
      const success = await biometricAuthService.delete(credentialId);

      if (success) {
        addToast('success', 'Dispositivo removido com sucesso.');
        await loadCredentials();
      } else {
        addToast('error', 'Não foi possível remover o dispositivo.');
      }
    } catch (error) {
      addToast('error', 'Erro ao remover dispositivo.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isSupported) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <XCircle size={24} className="text-gray-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Não Suportado</h3>
            <p className="text-sm text-gray-600">
              Autenticação biométrica não é suportada neste navegador ou dispositivo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Autenticação Biométrica</h3>
            <p className="text-sm text-gray-600">
              Gerir dispositivos com Face ID / Touch ID
            </p>
          </div>
        </div>

        {credentials.length > 0 && (
          <button
            onClick={handleAddCredential}
            disabled={isAdding}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <Plus size={18} />
            <span>Adicionar Dispositivo</span>
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-600 mt-3">A carregar...</p>
        </div>
      )}

      {/* No credentials */}
      {!isLoading && credentials.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Fingerprint size={40} className="text-blue-600" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">
            Nenhum dispositivo configurado
          </h4>
          <p className="text-sm text-gray-600 mb-6">
            Adicione um dispositivo para fazer login com Face ID ou Touch ID em apenas 1 segundo.
          </p>
          <button
            onClick={handleAddCredential}
            disabled={isAdding}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-all disabled:opacity-50 transform hover:scale-105 active:scale-95"
          >
            {isAdding ? 'A adicionar...' : 'Adicionar Dispositivo'}
          </button>
        </div>
      )}

      {/* Credentials list */}
      {!isLoading && credentials.length > 0 && (
        <div className="space-y-3">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Icon & Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Smartphone size={24} className="text-gray-700" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">{cred.deviceName || 'Dispositivo'}</h4>
                      {cred.enabled ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={12} />
                          Ativo
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Desativado
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p>Adicionado: {formatDate(cred.createdAt)}</p>
                      {cred.lastUsedAt && (
                        <p>Último uso: {formatDate(cred.lastUsedAt)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteCredential(cred.credentialId, cred.deviceName || 'Dispositivo')}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                  title="Remover dispositivo"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-1">Segurança</p>
            <p className="text-gray-700">
              Os seus dados biométricos nunca saem do dispositivo.
              Apenas uma chave pública é armazenada nos nossos servidores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiometricSettings;
