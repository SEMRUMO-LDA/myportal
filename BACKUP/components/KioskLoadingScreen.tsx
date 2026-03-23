import React, { useEffect, useState } from 'react';
import {
    User,
    Shield,
    Wifi,
    Database,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';

interface LoadingStep {
    id: string;
    label: string;
    sublabel?: string;
    status: 'pending' | 'loading' | 'completed' | 'error';
    icon: React.ReactNode;
}

interface KioskLoadingScreenProps {
    userName?: string;
    userPhoto?: string;
    onRetry?: () => void;
}

const KioskLoadingScreen: React.FC<KioskLoadingScreenProps> = ({
    userName = 'Colaborador',
    userPhoto,
    onRetry
}) => {
    const [steps, setSteps] = useState<LoadingStep[]>([
        {
            id: 'auth',
            label: 'Autenticação',
            sublabel: 'A verificar identidade',
            status: 'loading',
            icon: <Shield size={20} />
        },
        {
            id: 'connection',
            label: 'Ligação ao servidor',
            sublabel: 'A estabelecer conexão segura',
            status: 'pending',
            icon: <Wifi size={20} />
        },
        {
            id: 'data',
            label: 'Carregar informações',
            sublabel: 'A obter dados do colaborador',
            status: 'pending',
            icon: <Database size={20} />
        },
        {
            id: 'attendance',
            label: 'Verificar registos',
            sublabel: 'A confirmar última picagem',
            status: 'pending',
            icon: <Clock size={20} />
        }
    ]);

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [showError, setShowError] = useState(false);
    const [dots, setDots] = useState('');

    // Animate loading dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Simulate progress (in real implementation, this would be controlled by actual loading states)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentStepIndex < steps.length - 1) {
                setSteps(prev => prev.map((step, index) => {
                    if (index === currentStepIndex) {
                        return { ...step, status: 'completed' };
                    } else if (index === currentStepIndex + 1) {
                        return { ...step, status: 'loading' };
                    }
                    return step;
                }));
                setCurrentStepIndex(prev => prev + 1);
            }
        }, 1500); // Each step takes 1.5 seconds

        // Simulate occasional error for demonstration (remove in production)
        if (currentStepIndex === 2 && Math.random() > 0.9) { // 10% chance of error
            setShowError(true);
            setSteps(prev => prev.map((step, index) => {
                if (index === currentStepIndex) {
                    return { ...step, status: 'error' };
                }
                return step;
            }));
        }

        return () => clearTimeout(timer);
    }, [currentStepIndex]);

    const currentStep = steps[currentStepIndex];
    const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B2147] via-[#1a2f5a] to-[#0B2147] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Welcome Message */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="flex justify-center mb-4">
                        {userPhoto ? (
                            <img
                                src={userPhoto}
                                alt={userName}
                                className="w-24 h-24 rounded-full border-4 border-white/20 shadow-xl"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center shadow-xl">
                                <User size={40} className="text-white/60" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Bem-vindo(a), {userName}</h1>
                    <p className="text-blue-200 text-sm">A preparar o seu espaço de trabalho{dots}</p>
                </div>

                {/* Loading Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <p className="text-center text-xs text-blue-200 mt-2">
                            {Math.round(progressPercentage)}% concluído
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`flex items-start gap-4 transition-all duration-300 ${
                                    step.status === 'pending' ? 'opacity-40' : 'opacity-100'
                                }`}
                            >
                                {/* Icon */}
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all
                                    ${step.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                      step.status === 'loading' ? 'bg-blue-500/20 text-blue-400' :
                                      step.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                      'bg-white/5 text-white/40'}
                                `}>
                                    {step.status === 'completed' ? <CheckCircle size={20} /> :
                                     step.status === 'loading' ? <Loader2 size={20} className="animate-spin" /> :
                                     step.status === 'error' ? <AlertCircle size={20} /> :
                                     step.icon}
                                </div>

                                {/* Text */}
                                <div className="flex-1">
                                    <p className={`font-semibold transition-colors ${
                                        step.status === 'loading' ? 'text-white' :
                                        step.status === 'completed' ? 'text-emerald-400' :
                                        step.status === 'error' ? 'text-red-400' :
                                        'text-white/40'
                                    }`}>
                                        {step.label}
                                    </p>
                                    {step.sublabel && (
                                        <p className={`text-xs mt-1 transition-colors ${
                                            step.status === 'loading' ? 'text-blue-200' :
                                            step.status === 'completed' ? 'text-emerald-300/60' :
                                            step.status === 'error' ? 'text-red-300/60' :
                                            'text-white/30'
                                        }`}>
                                            {step.sublabel}
                                        </p>
                                    )}
                                </div>

                                {/* Status Indicator */}
                                {step.status === 'loading' && index === currentStepIndex && (
                                    <div className="flex gap-1 items-center">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150" />
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Error State */}
                    {showError && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <p className="text-red-300 text-sm font-semibold mb-2">
                                Ocorreu um erro ao carregar os dados
                            </p>
                            <p className="text-red-200/60 text-xs mb-3">
                                Por favor, tente novamente ou contacte o suporte se o problema persistir.
                            </p>
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                    Tentar Novamente
                                </button>
                            )}
                        </div>
                    )}

                    {/* Info Message */}
                    {!showError && (
                        <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-blue-200 text-xs">
                                💡 <span className="font-semibold">Dica:</span> Este processo é necessário para garantir
                                a segurança dos seus dados e sincronizar as informações mais recentes.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Message */}
                <p className="text-center text-xs text-white/40 mt-6">
                    Sistema seguro • Dados encriptados • {new Date().getFullYear()} MyPortal
                </p>
            </div>
        </div>
    );
};

export default KioskLoadingScreen;