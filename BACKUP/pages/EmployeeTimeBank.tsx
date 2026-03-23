
import React, { useMemo } from 'react';
import Header from '../components/Header';
import { User, TimeLog, TimeLogStatus, HourBankAdjustment } from '../types';
import { Clock, TrendingUp, TrendingDown, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { formatHoursHumanized } from '../utils/scheduleUtils';

interface EmployeeTimeBankProps {
    user: User;
    logs: TimeLog[];
    adjustments?: HourBankAdjustment[];
}

const EmployeeTimeBank: React.FC<EmployeeTimeBankProps> = ({ user, logs, adjustments = [] }) => {

    // Helper to convert HH:mm string to minutes
    const timeToMinutes = (time: string | undefined) => {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const processedData = useMemo(() => {
        // Filter logs for this user only
        const userLogs = logs.filter(l => l.userId === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate Expected Hours based on user schedule
        let expectedMinutesPerDay = 8 * 60;
        if (user.workStartTime && user.workEndTime) {
            const startMins = timeToMinutes(user.workStartTime);
            const endMins = timeToMinutes(user.workEndTime);
            let rawDiff = endMins - startMins;
            if (rawDiff > 5 * 60) rawDiff -= 60; // Deduct 1h lunch
            expectedMinutesPerDay = rawDiff;
        }

        let runningBalance = 0;

        // We need to calculate balance chronologically to show running total correctly if we were doing a chart
        // But for the table (reverse chrono), we calculate row by row.
        // Let's calculate total balance first.

        const statement = userLogs.map(log => {
            let workedMinutes = 0;
            let dailyBalance = 0;
            let note = "";

            if (log.totalHours) {
                workedMinutes = Math.round(log.totalHours * 60);
                const diff = workedMinutes - expectedMinutesPerDay;

                if (diff > 0) {
                    // Rule changed: Exact mathematical deduction (no more 30 minute blocks)
                    dailyBalance = diff;
                } else {
                    // Rule: Exact deduction for lateness
                    dailyBalance = diff;
                }
            } else if (new Date(log.date) < new Date()) {
                // Past incomplete log
                note = "Registo Incompleto";
            }

            runningBalance += dailyBalance;

            return {
                ...log,
                workedHours: workedMinutes / 60,
                expectedHours: expectedMinutesPerDay / 60,
                dailyBalanceMinutes: dailyBalance,
                note
            };
        });

        // Include manual adjustments
        const userAdjustments = adjustments.filter(a => a.userId === user.id);
        const adjTotal = userAdjustments.reduce((sum, a) => sum + a.adjustmentMinutes, 0);

        return {
            statement,
            totalBalanceMinutes: runningBalance + adjTotal,
            logBalanceMinutes: runningBalance,
            adjustmentMinutes: adjTotal,
            userAdjustments: userAdjustments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        };

    }, [logs, user, adjustments]);

    return (
        <div className="p-6 md:p-8 w-full max-w-6xl mx-auto animate-fade-in">
            <Header title="Meu Banco de Horas" subtitle="Extrato detalhado de assiduidade e saldo" hideControls />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm ${processedData.totalBalanceMinutes >= 0 ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">Saldo Atual</span>
                    <span className="text-4xl font-mono font-bold">
                        {formatHoursHumanized(processedData.totalBalanceMinutes / 60)}
                    </span>
                    <div className="mt-2 text-xs font-medium flex items-center gap-1">
                        {processedData.totalBalanceMinutes >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {processedData.totalBalanceMinutes >= 0 ? 'Horas a favor' : 'Horas em dívida'}
                    </div>
                </div>

                <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clock size={20} /></div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Horário Contratado</p>
                            <p className="font-bold text-gray-800">{user.workStartTime} - {user.workEndTime}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 pl-11">Carga diária prevista de {((timeToMinutes(user.workEndTime) - timeToMinutes(user.workStartTime) - 60) / 60).toFixed(1)}h (c/ pausa).</p>
                </div>

                <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><AlertTriangle size={20} /></div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Regra de Cálculo</p>
                            <p className="font-bold text-gray-800">Cálculo Exato</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 pl-11">Tempo extra contabilizado ao minuto exato trabalhado.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Data</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Entrada</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Saída</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Trabalhado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Saldo Dia</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Obs.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedData.statement.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            <span className="text-sm font-medium text-gray-700">{row.date}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">{row.checkIn}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {row.checkOut ? (
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">{row.checkOut}</span>
                                        ) : (
                                            <span className="text-orange-500 text-xs font-bold">--:--</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-medium text-gray-800">{formatHoursHumanized(row.workedHours).replace('+', '')}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${row.dailyBalanceMinutes >= 0 ? (row.dailyBalanceMinutes === 0 ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700') : 'bg-red-100 text-red-700'}`}>
                                            {row.dailyBalanceMinutes === 0 ? '0h 00m' : formatHoursHumanized(row.dailyBalanceMinutes / 60)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400 italic">
                                        {row.note}
                                        {!row.checkOut && new Date(row.date) < new Date() && "Falta registo de saída"}
                                    </td>
                                </tr>
                            ))}
                            {processedData.statement.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Sem registos de ponto disponíveis.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Adjustments Section */}
            {processedData.userAdjustments.length > 0 && (
                <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                        <FileText size={16} className="text-gray-500" />
                        <h3 className="text-sm font-bold text-gray-700">Ajustes Manuais</h3>
                        {processedData.adjustmentMinutes !== 0 && (
                            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${processedData.adjustmentMinutes >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                Total: {formatHoursHumanized(processedData.adjustmentMinutes / 60)}
                            </span>
                        )}
                    </div>
                    <div className="divide-y divide-gray-100">
                        {processedData.userAdjustments.map(adj => (
                            <div key={adj.id} className="px-6 py-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${adj.adjustmentMinutes >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {adj.adjustmentMinutes >= 0 ? '+' : ''}{(adj.adjustmentMinutes / 60).toFixed(1)}h
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800">{adj.reason}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {adj.type === 'manual' ? 'Ajuste Manual' : adj.type === 'correction' ? 'Correção' : 'Reset'} &middot; {new Date(adj.createdAt).toLocaleDateString('pt-PT')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTimeBank;
