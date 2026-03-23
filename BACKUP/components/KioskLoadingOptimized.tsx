import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Clock, User, Database, Server, Wifi } from 'lucide-react';

interface LoadingStep {
    id: string;
    label: string;
    icon: React.ReactNode;
    status: 'pending' | 'loading' | 'completed' | 'error';
}

interface KioskLoadingOptimizedProps {
    onLoadingComplete: () => void;
    loadingSteps?: {
        checkSession: () => Promise<any>;
        loadAnomalies: () => Promise<any>;
        loadVehicles: () => Promise<any>;
        loadUserData: () => Promise<any>;
    };
    userName?: string;
    userPhoto?: string;
}

export const KioskLoadingOptimized: React.FC<KioskLoadingOptimizedProps> = ({
    onLoadingComplete,
    loadingSteps,
    userName = 'Colaborador',
    userPhoto
}) => {
    const [steps, setSteps] = useState<LoadingStep[]>([
        {
            id: 'auth',
            label: 'A verificar autenticação',
            icon: <User size={20} />,
            status: 'completed' // Já está autenticado se chegou aqui
        },
        {
            id: 'connection',
            label: 'A conectar ao servidor',
            icon: <Wifi size={20} />,
            status: 'loading'
        },
        {
            id: 'session',
            label: 'A verificar sessões abertas',
            icon: <Clock size={20} />,
            status: 'pending'
        },
        {
            id: 'userdata',
            label: 'A carregar dados pessoais',
            icon: <Database size={20} />,
            status: 'pending'
        },
        {
            id: 'anomalies',
            label: 'A verificar anomalias',
            icon: <Server size={20} />,
            status: 'pending'
        }
    ]);

    const [progress, setProgress] = useState(0);
    const [currentMessage, setCurrentMessage] = useState('A preparar o seu espaço de trabalho...');
    const [minimumLoadTime, setMinimumLoadTime] = useState(false);

    useEffect(() => {
        // Garantir um tempo mínimo de loading para UX suave
        const minTimer = setTimeout(() => setMinimumLoadTime(true), 1500);

        const loadAllData = async () => {
            try {
                // Step 1: Connection (simulado)
                await updateStep('connection', 'loading');
                await new Promise(resolve => setTimeout(resolve, 300));
                await updateStep('connection', 'completed');
                setProgress(20);

                // Step 2: Check Session
                await updateStep('session', 'loading');
                setCurrentMessage('A verificar o seu último acesso...');

                if (loadingSteps?.checkSession) {
                    try {
                        await Promise.race([
                            loadingSteps.checkSession(),
                            new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
                        ]);
                    } catch (error) {
                        console.warn('Session check failed or timeout:', error);
                    }
                }

                await updateStep('session', 'completed');
                setProgress(40);

                // Step 3: User Data
                await updateStep('userdata', 'loading');
                setCurrentMessage('A carregar os seus dados...');

                if (loadingSteps?.loadUserData) {
                    try {
                        await Promise.race([
                            loadingSteps.loadUserData(),
                            new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
                        ]);
                    } catch (error) {
                        console.warn('User data load failed or timeout:', error);
                    }
                }

                await updateStep('userdata', 'completed');
                setProgress(70);

                // Step 4: Anomalies (pode falhar sem bloquear)
                await updateStep('anomalies', 'loading');
                setCurrentMessage('A verificar pendências...');

                if (loadingSteps?.loadAnomalies) {
                    try {
                        await Promise.race([
                            loadingSteps.loadAnomalies(),
                            new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
                        ]);
                        await updateStep('anomalies', 'completed');
                    } catch (error) {
                        console.warn('Anomalies check skipped:', error);
                        await updateStep('anomalies', 'error');
                    }
                } else {
                    await updateStep('anomalies', 'completed');
                }

                setProgress(100);
                setCurrentMessage('Tudo pronto! A abrir o dashboard...');

                // Esperar pelo tempo mínimo antes de completar
                await new Promise(resolve => {
                    const checkMinTime = setInterval(() => {
                        if (minimumLoadTime) {
                            clearInterval(checkMinTime);
                            resolve(true);
                        }
                    }, 100);
                });

                // Pequena pausa para transição suave
                await new Promise(resolve => setTimeout(resolve, 500));

                onLoadingComplete();

            } catch (error) {
                console.error('Error during loading:', error);
                setCurrentMessage('Erro ao carregar. A tentar novamente...');

                // Tentar continuar mesmo com erro
                setTimeout(() => {
                    onLoadingComplete();
                }, 2000);
            }
        };

        loadAllData();

        return () => clearTimeout(minTimer);
    }, []);

    const updateStep = async (stepId: string, status: LoadingStep['status']) => {
        setSteps(prev => prev.map(step =>
            step.id === stepId ? { ...step, status } : step
        ));
        // Pequena pausa para animação
        await new Promise(resolve => setTimeout(resolve, 100));
    };

    const getStepIcon = (step: LoadingStep) => {
        switch (step.status) {
            case 'completed':
                return <CheckCircle2 size={20} className="text-green-400" />;
            case 'loading':
                return <Loader2 size={20} className="text-blue-400 animate-spin" />;
            case 'error':
                return <div className="w-5 h-5 rounded-full bg-yellow-500/20" />;
            default:
                return <div className="w-5 h-5 rounded-full bg-white/20" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 z-50 flex items-center justify-center">
            <div className="w-full max-w-lg p-8">
                {/* Logo/User Section */}
                <div className="text-center mb-8">
                    {userPhoto ? (
                        <img
                            src={userPhoto}
                            alt={userName}
                            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/30"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-white/20 flex items-center justify-center">
                            <User size={40} className="text-white/60" />
                        </div>
                    )}

                    <h1 className="text-2xl font-bold text-white mb-2">
                        Bem-vindo, {userName}!
                    </h1>

                    <p className="text-blue-200 animate-pulse">
                        {currentMessage}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-400 to-green-400 h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-center text-white/60 text-sm mt-2">
                        {progress}% completo
                    </p>
                </div>

                {/* Loading Steps */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                    <div className="space-y-3">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`
                                    flex items-center gap-3 p-3 rounded-lg transition-all duration-300
                                    ${step.status === 'loading' ? 'bg-white/10 scale-105' : ''}
                                    ${step.status === 'completed' ? 'opacity-70' : ''}
                                `}
                                style={{
                                    animationDelay: `${index * 100}ms`
                                }}
                            >
                                <div className="flex-shrink-0">
                                    {getStepIcon(step)}
                                </div>

                                <div className="flex-1">
                                    <p className={`
                                        text-sm font-medium transition-colors
                                        ${step.status === 'loading' ? 'text-white' : 'text-white/70'}
                                        ${step.status === 'completed' ? 'text-green-300/70' : ''}
                                    `}>
                                        {step.label}
                                    </p>
                                </div>

                                {step.status === 'completed' && (
                                    <div className="text-green-400 text-xs animate-fade-in">
                                        ✓
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tips while loading */}
                <div className="mt-6 text-center">
                    <p className="text-white/50 text-sm">
                        💡 Dica: Use o seu ID numérico para fazer login mais rápido
                    </p>
                </div>
            </div>

            {/* Animated background dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

// CSS animations (adicionar ao seu CSS global ou styled-components)
const styles = `
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fade-in 0.3s ease-out;
}
`;

export default KioskLoadingOptimized;