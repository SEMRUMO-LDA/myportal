import React, { useEffect, useState } from 'react';
import {
    User,
    Shield,
    Wifi,
    Database,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    Car,
    Calendar,
    Briefcase,
    UserCheck
} from 'lucide-react';

export interface LoadingStep {
    id: string;
    label: string;
    sublabel?: string;
    status: 'pending' | 'loading' | 'completed' | 'error';
    icon: React.ReactNode;
    errorMessage?: string;
}

interface KioskLoadingAdvancedProps {
    userName?: string;
    userPhoto?: string;
    steps?: LoadingStep[];
    currentStep?: string;
    onRetry?: () => void;
    estimatedTime?: number; // in seconds
}

const KioskLoadingAdvanced: React.FC<KioskLoadingAdvancedProps> = ({
    userName = 'Colaborador',
    userPhoto,
    steps: customSteps,
    currentStep,
    onRetry,
    estimatedTime = 5
}) => {
    const defaultSteps: LoadingStep[] = [
        {
            id: 'auth',
            label: 'Verificação de segurança',
            sublabel: 'A confirmar a sua identidade',
            status: 'pending',
            icon: <Shield size={20} />
        },
        {
            id: 'session',
            label: 'Sessões anteriores',
            sublabel: 'A verificar sessões abertas',
            status: 'pending',
            icon: <UserCheck size={20} />
        },
        {
            id: 'attendance',
            label: 'Registos de ponto',
            sublabel: 'A carregar últimas picagens',
            status: 'pending',
            icon: <Clock size={20} />
        },
        {
            id: 'schedule',
            label: 'Horário de trabalho',
            sublabel: 'A obter o seu horário',
            status: 'pending',
            icon: <Calendar size={20} />
        },
        {
            id: 'hours',
            label: 'Banco de horas',
            sublabel: 'A calcular saldo de horas',
            status: 'pending',
            icon: <Briefcase size={20} />
        },
        {
            id: 'fleet',
            label: 'Frota disponível',
            sublabel: 'A verificar veículos',
            status: 'pending',
            icon: <Car size={20} />
        }
    ];

    const [steps, setSteps] = useState<LoadingStep[]>(customSteps || defaultSteps);
    const [dots, setDots] = useState('');
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [motivationalMessage, setMotivationalMessage] = useState('');

    // Motivational messages that rotate
    const motivationalMessages = [
        'A preparar tudo para si...',
        'Quase pronto para começar o dia!',
        'A organizar o seu espaço de trabalho...',
        'Carregando as suas informações com segurança...',
        'Verificando os últimos detalhes...',
        'Sincronizando com o servidor...'
    ];

    // Animate loading dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Timer for elapsed time
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 0.1);
        }, 100);
        return () => clearInterval(timer);
    }, []);

    // Rotate motivational messages
    useEffect(() => {
        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
            setMotivationalMessage(motivationalMessages[randomIndex]);
        }, 3000);

        // Set initial message
        setMotivationalMessage(motivationalMessages[0]);

        return () => clearInterval(interval);
    }, []);

    // Update steps based on currentStep prop
    useEffect(() => {
        if (currentStep) {
            setSteps(prev => prev.map(step => {
                if (step.id === currentStep) {
                    return { ...step, status: 'loading' };
                } else if (prev.findIndex(s => s.id === currentStep) > prev.findIndex(s => s.id === step.id)) {
                    return { ...step, status: 'completed' };
                }
                return step;
            }));
        }
    }, [currentStep]);

    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const totalSteps = steps.length;
    const progressPercentage = (completedSteps / totalSteps) * 100;
    const hasError = steps.some(s => s.status === 'error');
    const currentLoadingStep = steps.find(s => s.status === 'loading');

    // Generate random sparkles for background animation
    const sparkles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`
    }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B2147] via-[#1a2f5a] to-[#0B2147] text-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            {sparkles.map(sparkle => (
                <div
                    key={sparkle.id}
                    className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
                    style={{
                        left: sparkle.left,
                        top: sparkle.top,
                        animationDelay: sparkle.animationDelay,
                        animationDuration: sparkle.animationDuration
                    }}
                />
            ))}

            <div className="w-full max-w-lg relative z-10">
                {/* Welcome Section */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            {userPhoto ? (
                                <img
                                    src={userPhoto}
                                    alt={userName}
                                    className="w-28 h-28 rounded-full border-4 border-white/20 shadow-2xl"
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border-4 border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                                    <User size={48} className="text-white/80" />
                                </div>
                            )}
                            {/* Rotating border animation */}
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 border-r-emerald-400 animate-spin-slow" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                        Olá, {userName}!
                    </h1>
                    <p className="text-blue-200/80 text-sm animate-pulse">
                        {motivationalMessage}
                    </p>
                </div>

                {/* Main Loading Card */}
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 pointer-events-none" />

                    {/* Header with Time */}
                    <div className="relative mb-6 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-blue-200/60 uppercase tracking-wider">A carregar</p>
                            <p className="text-2xl font-bold text-white">
                                {completedSteps} de {totalSteps}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-blue-200/60">Tempo decorrido</p>
                            <p className="text-lg font-mono text-white/80">
                                {timeElapsed.toFixed(1)}s
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8 relative">
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 transition-all duration-700 ease-out rounded-full relative"
                                style={{
                                    width: `${progressPercentage}%`,
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 2s linear infinite'
                                }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex justify-between mt-2">
                            <p className="text-xs text-blue-200/60">
                                {Math.round(progressPercentage)}% concluído
                            </p>
                            <p className="text-xs text-blue-200/60">
                                ~{Math.max(0, estimatedTime - Math.floor(timeElapsed))}s restantes
                            </p>
                        </div>
                    </div>

                    {/* Steps Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`
                                    flex items-center gap-3 p-3 rounded-xl transition-all duration-500
                                    ${step.status === 'loading' ? 'bg-blue-500/20 border border-blue-400/30 scale-105' :
                                      step.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-400/20' :
                                      step.status === 'error' ? 'bg-red-500/10 border border-red-400/20' :
                                      'bg-white/5 border border-white/10 opacity-50'}
                                `}
                            >
                                {/* Icon */}
                                <div className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all
                                    ${step.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                      step.status === 'loading' ? 'bg-blue-500/20 text-blue-400' :
                                      step.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                      'bg-white/10 text-white/40'}
                                `}>
                                    {step.status === 'completed' ? <CheckCircle size={18} /> :
                                     step.status === 'loading' ? <Loader2 size={18} className="animate-spin" /> :
                                     step.status === 'error' ? <AlertCircle size={18} /> :
                                     step.icon}
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold truncate transition-colors ${
                                        step.status === 'loading' ? 'text-white' :
                                        step.status === 'completed' ? 'text-emerald-400' :
                                        step.status === 'error' ? 'text-red-400' :
                                        'text-white/50'
                                    }`}>
                                        {step.label}
                                    </p>
                                    {step.status === 'loading' && (
                                        <div className="flex gap-1 mt-1">
                                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Current Step Detail */}
                    {currentLoadingStep && (
                        <div className="p-4 bg-blue-500/10 border border-blue-400/20 rounded-xl mb-4">
                            <p className="text-blue-200 text-sm">
                                <span className="font-semibold">A processar:</span> {currentLoadingStep.sublabel || currentLoadingStep.label}
                                {dots}
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {hasError && (
                        <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-xl animate-shake">
                            <p className="text-red-300 text-sm font-semibold mb-2">
                                ⚠️ Ocorreu um problema
                            </p>
                            {steps.find(s => s.status === 'error')?.errorMessage && (
                                <p className="text-red-200/60 text-xs mb-3">
                                    {steps.find(s => s.status === 'error')?.errorMessage}
                                </p>
                            )}
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-all transform hover:scale-105 active:scale-95"
                                >
                                    Tentar Novamente
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 mt-6 text-xs text-white/40">
                    <Shield size={14} />
                    <span>Conexão segura • Dados encriptados</span>
                </div>
            </div>
        </div>
    );
};

export default KioskLoadingAdvanced;