import React, { useState, useEffect, useMemo } from 'react';
import { User, TimeLog } from '../types';
import { Play, Square, LogOut, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

/**
 * VERSÃO OTIMIZADA DO KIOSK DASHBOARD
 * - Remove chamadas que causam CORS errors
 * - Carregamento instantâneo
 * - Mantém funcionalidades essenciais
 */

interface KioskDashboardFastProps {
    user: User;
    onClockIn: (user: User) => void;
    onClockOut: (user: User) => void;
    onLogout: () => void;
    lastLog?: TimeLog;
}

const KioskDashboardFast: React.FC<KioskDashboardFastProps> = ({
    user,
    onClockIn,
    onClockOut,
    onLogout,
    lastLog
}) => {
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Clock update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Simular carregamento rápido
    useEffect(() => {
        // Mostrar interface imediatamente após 100ms
        setTimeout(() => setIsReady(true), 100);
    }, []);

    // Estado do ponto
    const isCheckedIn = lastLog && lastLog.checkIn && !lastLog.checkOut;
    const todayEntry = lastLog?.date === new Date().toISOString().split('T')[0] ? lastLog : null;

    // Calcular horas trabalhadas hoje
    const hoursToday = useMemo(() => {
        if (!todayEntry?.checkIn) return '00:00';

        const checkIn = new Date(`2000-01-01T${todayEntry.checkIn}`);
        const now = todayEntry.checkOut
            ? new Date(`2000-01-01T${todayEntry.checkOut}`)
            : new Date(`2000-01-01T${currentTime.toTimeString().slice(0, 8)}`);

        const diff = (now.getTime() - checkIn.getTime()) / 1000 / 60 / 60;
        const hours = Math.floor(diff);
        const minutes = Math.floor((diff - hours) * 60);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }, [todayEntry, currentTime]);

    const handleClockAction = async () => {
        setIsSubmitting(true);

        try {
            if (isCheckedIn) {
                await onClockOut(user);
                addToast('success', 'Check-out registado com sucesso!');
            } else {
                await onClockIn(user);
                addToast('success', 'Check-in registado com sucesso!');
            }
        } catch (error) {
            addToast('error', 'Erro ao registar ponto');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isReady) {
        // Loading super rápido
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-2xl animate-pulse">
                    A carregar...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
                <div className="px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {user.photoUrl && (
                            <img
                                src={user.photoUrl}
                                alt={user.name}
                                className="w-12 h-12 rounded-full border-2 border-white/50"
                            />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-white">{user.name}</h1>
                            <p className="text-blue-200 text-sm">{user.company} • {user.role}</p>
                        </div>
                    </div>

                    <button
                        onClick={onLogout}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-2"
                    >
                        <LogOut size={20} />
                        Sair
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto p-6">
                {/* Clock Display */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 text-center">
                    <div className="text-6xl font-bold text-white mb-2">
                        {currentTime.toLocaleTimeString('pt-PT', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </div>
                    <div className="text-blue-200 text-lg">
                        {currentTime.toLocaleDateString('pt-PT', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </div>
                </div>

                {/* Status Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/10 rounded-xl p-4">
                            <p className="text-blue-200 text-sm mb-1">Estado</p>
                            <p className="text-white text-xl font-bold">
                                {isCheckedIn ? '🟢 Presente' : '⚪ Ausente'}
                            </p>
                        </div>

                        <div className="bg-white/10 rounded-xl p-4">
                            <p className="text-blue-200 text-sm mb-1">Horas Hoje</p>
                            <p className="text-white text-xl font-bold flex items-center gap-2">
                                <Clock size={20} />
                                {hoursToday}
                            </p>
                        </div>

                        {todayEntry?.checkIn && (
                            <div className="bg-white/10 rounded-xl p-4">
                                <p className="text-blue-200 text-sm mb-1">Entrada</p>
                                <p className="text-white text-xl font-bold">
                                    {todayEntry.checkIn}
                                </p>
                            </div>
                        )}

                        {todayEntry?.checkOut && (
                            <div className="bg-white/10 rounded-xl p-4">
                                <p className="text-blue-200 text-sm mb-1">Saída</p>
                                <p className="text-white text-xl font-bold">
                                    {todayEntry.checkOut}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleClockAction}
                        disabled={isSubmitting}
                        className={`
                            w-full py-6 rounded-xl font-bold text-2xl
                            transition-all transform hover:scale-105 active:scale-95
                            flex items-center justify-center gap-3
                            ${isCheckedIn
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-green-600 hover:bg-green-500 text-white'
                            }
                            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">A processar...</span>
                        ) : (
                            <>
                                {isCheckedIn ? <Square size={32} /> : <Play size={32} />}
                                {isCheckedIn ? 'MARCAR SAÍDA' : 'MARCAR ENTRADA'}
                            </>
                        )}
                    </button>
                </div>

                {/* Quick Info */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4">Informações Rápidas</h3>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Horário de Trabalho:</span>
                            <span className="text-white font-medium">
                                {user.workStartTime || '09:00'} - {user.workEndTime || '18:00'}
                            </span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Almoço:</span>
                            <span className="text-white font-medium">
                                {user.lunchStartTime || '13:00'} - {user.lunchEndTime || '14:00'}
                            </span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Departamento:</span>
                            <span className="text-white font-medium">
                                {user.department || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                <p className="text-white/50 text-sm">
                    MyPortal © {new Date().getFullYear()} • Versão Otimizada
                </p>
            </div>
        </div>
    );
};

export default KioskDashboardFast;