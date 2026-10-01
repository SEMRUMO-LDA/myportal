import React, { useMemo } from 'react';
import { Award, Clock, Star, Zap, ShieldCheck } from 'lucide-react';
import { TimeLog, Anomaly } from '../types';

interface BadgesWidgetProps {
    timeLogs: TimeLog[];
    anomalies: Anomaly[];
    compact?: boolean;
}

export const BadgesWidget: React.FC<BadgesWidgetProps> = ({ timeLogs, anomalies, compact = false }) => {
    
    const badges = useMemo(() => {
        const earned = [];
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        // 1. Relógio Suíço (0 atrasos nos últimos 30 dias com pelo menos 15 picagens)
        const recentAnomalies = anomalies.filter(a => new Date(a.date) >= thirtyDaysAgo);
        const hasDelays = recentAnomalies.some(a => a.type === 'DELAY' || a.description.toLowerCase().includes('atraso'));
        const recentLogs = timeLogs.filter(l => new Date(l.date) >= thirtyDaysAgo);
        
        if (!hasDelays && recentLogs.length >= 15) {
            earned.push({
                id: 'swiss-clock',
                title: 'Relógio Suíço',
                description: '0 atrasos nos últimos 30 dias',
                icon: <Clock size={20} className="text-blue-500" />,
                bg: 'bg-blue-50',
                border: 'border-blue-200'
            });
        }

        // 2. Sempre Presente (0 faltas injustificadas nos últimos 6 meses)
        const semiAnnualAnomalies = anomalies.filter(a => new Date(a.date) >= sixMonthsAgo);
        const hasUnjustifiedAbsences = semiAnnualAnomalies.some(a => (a.type === 'ABSENCE' || a.type === 'MISSING_DAY') && !a.justified);
        const semiAnnualLogs = timeLogs.filter(l => new Date(l.date) >= sixMonthsAgo);

        if (!hasUnjustifiedAbsences && semiAnnualLogs.length > 50) {
            earned.push({
                id: 'always-present',
                title: 'Sempre Presente',
                description: 'Assiduidade impecável em 6 meses',
                icon: <ShieldCheck size={20} className="text-emerald-500" />,
                bg: 'bg-emerald-50',
                border: 'border-emerald-200'
            });
        }

        // 3. Trabalhador Incansável (Picou + de 40 horas na última semana)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        const weeklyLogs = timeLogs.filter(l => new Date(l.date) >= oneWeekAgo && l.totalHours);
        const weeklyHours = weeklyLogs.reduce((acc, log) => acc + (log.totalHours || 0), 0);
        
        if (weeklyHours >= 40) {
            earned.push({
                id: 'hard-worker',
                title: 'Incansável',
                description: '+40 horas na última semana',
                icon: <Zap size={20} className="text-amber-500" />,
                bg: 'bg-amber-50',
                border: 'border-amber-200'
            });
        }

        // 4. Madrugador (Pelo menos 5 picagens antes das 08:00 no total)
        const earlyLogs = timeLogs.filter(l => {
            if (!l.checkIn) return false;
            const [h, m] = l.checkIn.split(':').map(Number);
            return h < 8;
        });

        if (earlyLogs.length >= 5) {
            earned.push({
                id: 'early-bird',
                title: 'Madrugador',
                description: 'Começa o dia cedo e com energia',
                icon: <Star size={20} className="text-purple-500" />,
                bg: 'bg-purple-50',
                border: 'border-purple-200'
            });
        }

        return earned;
    }, [timeLogs, anomalies]);

    if (badges.length === 0) {
        if (compact) return null;
        return (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                <Award size={32} className="mx-auto text-gray-300 mb-2" />
                <h4 className="text-sm font-bold text-gray-500">Ainda sem Distintivos</h4>
                <p className="text-xs text-gray-400 mt-1">Gere um bom histórico de assiduidade para ganhar medalhas.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            {!compact && (
                <div className="flex items-center gap-2 mb-4">
                    <Award size={20} className="text-brand-600" />
                    <h3 className="font-bold text-gray-800">Conquistas Pessoais</h3>
                </div>
            )}
            <div className="grid grid-cols-2 gap-3">
                {badges.map(b => (
                    <div key={b.id} className={`flex items-start gap-3 p-3 rounded-lg border ${b.bg} ${b.border}`}>
                        <div className="p-2 bg-white rounded-full shadow-sm">
                            {b.icon}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm leading-tight">{b.title}</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{b.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BadgesWidget;
