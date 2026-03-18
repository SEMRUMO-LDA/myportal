import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface KioskLoginOptimizedProps {
    onLoginSuccess: (user: User) => void;
    users: User[];
    loading: boolean;
}

/**
 * Componente otimizado para login rápido no Kiosk
 * Mostra feedback visual IMEDIATO ao colaborador
 */
export const KioskLoginOptimized: React.FC<KioskLoginOptimizedProps> = ({
    onLoginSuccess,
    users,
    loading
}) => {
    const [step, setStep] = useState<'id' | 'pin'>('id');
    const [accessCode, setAccessCode] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Cache de usuários ativos para busca rápida
    const [activeUsersCache, setActiveUsersCache] = useState<Map<number, User>>(new Map());

    // Criar cache de usuários ativos ao carregar
    useEffect(() => {
        const cache = new Map<number, User>();
        users.filter(u => u.status === 'ACTIVE').forEach(user => {
            cache.set(user.id, user);
        });
        setActiveUsersCache(cache);
    }, [users]);

    // Feedback visual instantâneo ao digitar
    const handleAccessCodeChange = useCallback((value: string) => {
        setAccessCode(value);
        setError('');

        // Validação em tempo real
        if (value.length > 0) {
            const userId = parseInt(value);
            if (isNaN(userId) || userId <= 0) {
                setError('Use apenas números');
                return;
            }

            // Busca instantânea no cache
            const user = activeUsersCache.get(userId);
            if (value.length >= 1 && !user && !loading) {
                setError('ID não encontrado');
            } else if (user) {
                // Usuário encontrado - feedback positivo
                setError('');
            }
        }
    }, [activeUsersCache, loading]);

    // Validação RÁPIDA do ID
    const validateId = useCallback(async () => {
        setIsValidating(true);
        setError('');

        // Feedback imediato
        const userId = parseInt(accessCode);

        if (isNaN(userId) || userId <= 0) {
            setError('ID inválido');
            setIsValidating(false);
            return false;
        }

        // Busca no cache (instantânea)
        const user = activeUsersCache.get(userId);

        if (!user) {
            // Se ainda carregando, aguardar
            if (loading) {
                setError('Aguarde, a carregar dados...');
                // Retry após 1 segundo
                setTimeout(() => validateId(), 1000);
            } else {
                setError('Colaborador não encontrado');
            }
            setIsValidating(false);
            return false;
        }

        // Sucesso - avançar para PIN
        setCurrentUser(user);
        setStep('pin');
        setPin('');
        setIsValidating(false);
        setError('');
        return true;
    }, [accessCode, activeUsersCache, loading]);

    // Validação RÁPIDA do PIN
    const validatePin = useCallback(async () => {
        if (!currentUser) return;

        setIsValidating(true);
        setError('');

        // Simular pequeno delay para feedback visual
        await new Promise(resolve => setTimeout(resolve, 300));

        if (pin === currentUser.pin) {
            // Login bem-sucedido
            onLoginSuccess(currentUser);
        } else {
            setError('PIN incorreto');
            setPin('');
        }

        setIsValidating(false);
    }, [pin, currentUser, onLoginSuccess]);

    // Submit handlers
    const handleIdSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidating && accessCode) {
            validateId();
        }
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidating && pin.length === 4) {
            validatePin();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
            <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">

                {/* Header com estado visual */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Ponto Eletrónico
                    </h1>
                    <p className="text-blue-200">
                        {step === 'id' ? 'Digite o seu ID' : `Olá, ${currentUser?.name}!`}
                    </p>
                </div>

                {/* Step 1: ID */}
                {step === 'id' && (
                    <form onSubmit={handleIdSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-2">
                                ID de Colaborador
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={accessCode}
                                onChange={(e) => handleAccessCodeChange(e.target.value)}
                                className={`
                                    w-full px-4 py-3 text-2xl text-center font-bold
                                    bg-white/20 backdrop-blur
                                    border-2 rounded-xl
                                    text-white placeholder-blue-300
                                    focus:outline-none focus:ring-4
                                    transition-all duration-200
                                    ${error
                                        ? 'border-red-400 focus:ring-red-400/50'
                                        : accessCode && activeUsersCache.has(parseInt(accessCode))
                                            ? 'border-green-400 focus:ring-green-400/50'
                                            : 'border-white/30 focus:ring-blue-400/50'
                                    }
                                `}
                                placeholder="Ex: 123"
                                autoFocus
                                disabled={isValidating}
                            />
                        </div>

                        {/* Feedback visual */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-300 text-sm animate-shake">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {accessCode && activeUsersCache.has(parseInt(accessCode)) && !error && (
                            <div className="flex items-center gap-2 text-green-300 text-sm">
                                <CheckCircle size={16} />
                                Colaborador encontrado
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center gap-2 text-blue-300 text-sm">
                                <Loader2 size={16} className="animate-spin" />
                                A carregar dados...
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!accessCode || isValidating || !!error}
                            className={`
                                w-full py-3 rounded-xl font-bold text-lg
                                transition-all duration-200 transform
                                ${!accessCode || error
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : isValidating
                                        ? 'bg-blue-500 text-white animate-pulse'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            {isValidating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin" size={20} />
                                    A verificar...
                                </span>
                            ) : (
                                'Continuar'
                            )}
                        </button>
                    </form>
                )}

                {/* Step 2: PIN */}
                {step === 'pin' && currentUser && (
                    <form onSubmit={handlePinSubmit} className="space-y-4">
                        {/* User info */}
                        <div className="text-center mb-4 p-3 bg-white/10 rounded-xl">
                            <p className="text-white font-bold">{currentUser.name}</p>
                            <p className="text-blue-200 text-sm">{currentUser.company}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-2">
                                PIN (4 dígitos)
                            </label>
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => {
                                    setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                                    setError('');
                                }}
                                className={`
                                    w-full px-4 py-3 text-3xl text-center font-bold tracking-widest
                                    bg-white/20 backdrop-blur
                                    border-2 rounded-xl
                                    text-white placeholder-blue-300
                                    focus:outline-none focus:ring-4
                                    transition-all duration-200
                                    ${error
                                        ? 'border-red-400 focus:ring-red-400/50'
                                        : 'border-white/30 focus:ring-blue-400/50'
                                    }
                                `}
                                placeholder="••••"
                                autoFocus
                                disabled={isValidating}
                            />
                        </div>

                        {/* PIN dots indicator */}
                        <div className="flex justify-center gap-2">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`
                                        w-3 h-3 rounded-full transition-all duration-200
                                        ${i < pin.length
                                            ? 'bg-blue-400 scale-110'
                                            : 'bg-white/20'
                                        }
                                    `}
                                />
                            ))}
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-300 text-sm animate-shake">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep('id');
                                    setPin('');
                                    setError('');
                                    setCurrentUser(null);
                                }}
                                className="flex-1 py-3 rounded-xl font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all"
                            >
                                Voltar
                            </button>

                            <button
                                type="submit"
                                disabled={pin.length !== 4 || isValidating}
                                className={`
                                    flex-[2] py-3 rounded-xl font-bold text-lg
                                    transition-all duration-200 transform
                                    ${pin.length !== 4
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : isValidating
                                            ? 'bg-green-500 text-white animate-pulse'
                                            : 'bg-green-600 hover:bg-green-500 text-white hover:scale-105 active:scale-95'
                                    }
                                `}
                            >
                                {isValidating ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        A entrar...
                                    </span>
                                ) : (
                                    'Entrar'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Loading overlay para dados iniciais */}
            {loading && users.length === 0 && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                        <p className="text-lg font-bold text-gray-800">A carregar sistema...</p>
                        <p className="text-sm text-gray-600 mt-2">Por favor aguarde</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KioskLoginOptimized;