
import React, { useState } from 'react';
import Header from '../components/Header';
import { useOutletContext } from 'react-router-dom';
import { LockedMonth } from '../types';
import { Lock, Unlock, Trash2 } from 'lucide-react';

interface LockMonthProps {
    lockedMonths: LockedMonth[];
    onAddLock: (year: number, month: number) => void;
    onDeleteLock: (id: number) => void;
}

const LockMonth: React.FC<LockMonthProps> = ({ lockedMonths, onAddLock, onDeleteLock }) => {
    const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [month, setMonth] = useState<string>(''); // Store likely as month name or index

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const handleSave = () => {
        if (!year || !month) return;
        const monthIndex = months.indexOf(month) + 1; // 1-12
        onAddLock(year, monthIndex);
        setMonth('');
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto space-y-8 pb-20 md:pb-8">
            <Header
                title="Bloqueio de Mês"
                subtitle="Gerir períodos bloqueados para edição."
                onMenuClick={toggleSidebar}
            />

            {/* Creation Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Novo bloqueio</h2>
                    <button
                        onClick={handleSave}
                        disabled={!year || !month}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Guardar
                    </button>
                </div>
                <div className="p-4 md:p-6">
                    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm max-w-2xl">
                        <h3 className="text-sm font-bold text-brand-600 mb-4 uppercase tracking-wider">Novo bloqueio</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Ano <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(parseInt(e.target.value))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Mês <span className="text-red-500">*</span></label>
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all bg-white"
                                >
                                    <option value="">Selecione um mês</option>
                                    {months.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                            Ao bloquear um período, não será possível adicionar/editar nenhum registo de ponto/anomalia, mantendo assim a integridade dos dados.
                        </p>
                    </div>
                </div>
            </div>

            {/* List of Locks */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Lock size={18} className="text-gray-500" />
                    Meses Bloqueados
                </h3>

                {lockedMonths.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm italic">
                        Crie um bloqueio acima para proteger os dados históricos.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lockedMonths.map(lock => (
                            <div key={lock.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded text-red-500 shadow-sm"><Lock size={16} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{months[lock.month - 1]}</p>
                                        <p className="text-xs text-gray-500">{lock.year}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDeleteLock(lock.id)}
                                    className="text-gray-400 hover:text-red-600 p-2 transition-colors"
                                    title="Desbloquear"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LockMonth;
