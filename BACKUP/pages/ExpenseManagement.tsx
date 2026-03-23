
import React, { useState } from 'react';
import Header from '../components/Header';
import { Expense, ExpenseStatus, ExpenseStatusLabels, ExpenseCategoryLabels, Company } from '../types';
import {
    CheckCircle,
    XCircle,
    Filter,
    Search,
    ReceiptEuro,
    Download,
    ExternalLink,
    RefreshCw,
    Coins
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ExpenseManagementProps {
    expenses: Expense[];
    onUpdateExpense: (expense: Expense) => void;
}

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ expenses, onUpdateExpense }) => {
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterCompany, setFilterCompany] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { addToast } = useToast();

    const filteredExpenses = expenses.filter(exp => {
        const matchStatus = filterStatus === 'ALL' ? true : exp.status === filterStatus;
        const matchCompany = filterCompany ? exp.userCompany === filterCompany : true;
        const matchSearch = (exp.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (exp.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchStatus && matchCompany && matchSearch;
    }).sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

    const handleStatusChange = (expense: Expense, newStatus: ExpenseStatus) => {
        let reason = undefined;
        if (newStatus === ExpenseStatus.REJECTED) {
            reason = prompt("Motivo da rejeição:") || "Sem motivo especificado.";
        }
        onUpdateExpense({
            ...expense,
            status: newStatus,
            rejectionReason: reason
        });
    };

    const handleSyncPayroll = () => {
        if (confirm("Confirmar processamento salarial? \nTodas as despesas 'Aprovadas' passarão para o estado 'Paga / Processada' e serão exportadas para o TOConline.")) {
            setIsProcessing(true);
            // Simulate API call
            setTimeout(() => {
                expenses.forEach(exp => {
                    if (exp.status === ExpenseStatus.APPROVED) {
                        onUpdateExpense({ ...exp, status: ExpenseStatus.PAID });
                    }
                });
                setIsProcessing(false);
                addToast('success', "Sincronização concluída com sucesso!");
            }, 2000);
        }
    };

    const totalApprovedAmount = expenses.filter(e => e.status === ExpenseStatus.APPROVED).reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="p-8 w-full max-w-7xl mx-auto pb-24">
            <Header title="Gestão de Despesas" subtitle="Aprovação e processamento de reembolsos" />

            {/* Sync/Action Banner */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-6 text-white mb-8 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                        <Coins className="text-yellow-400" /> Fecho de Despesas
                    </h2>
                    <p className="text-blue-100 text-sm opacity-90 max-w-xl">
                        Ao sincronizar, todas as despesas aprovadas são enviadas automaticamente para o software de processamento salarial (TOConline) como suplementos não sujeitos a imposto (ajudas de custo), eliminando a necessidade de transferências manuais.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                        <span className="text-xs text-blue-300 font-bold uppercase tracking-wider block">Total a Processar</span>
                        <span className="text-3xl font-mono font-bold text-white">{totalApprovedAmount.toFixed(2)}€</span>
                    </div>
                    <button
                        onClick={handleSyncPayroll}
                        disabled={isProcessing || totalApprovedAmount === 0}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold shadow-lg transition-all ${isProcessing || totalApprovedAmount === 0
                            ? 'bg-blue-700 text-blue-400 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-400 text-white hover:scale-105'
                            }`}
                    >
                        <RefreshCw size={20} className={isProcessing ? 'animate-spin' : ''} />
                        {isProcessing ? 'A Sincronizar...' : 'Sincronizar com Salários'}
                    </button>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Pesquisar</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Colaborador, descrição..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Estado</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                        <option value="ALL">Todos</option>
                        {Object.values(ExpenseStatus).map(s => <option key={s} value={s}>{ExpenseStatusLabels[s]}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Empresa</label>
                    <select
                        value={filterCompany}
                        onChange={(e) => setFilterCompany(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                        <option value="">Todas</option>
                        {Object.values(Company).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-4">Colaborador</th>
                            <th className="px-6 py-4">Detalhes</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Recibo</th>
                            <th className="px-6 py-4 text-center">Estado</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredExpenses.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma despesa encontrada.</td></tr>
                        ) : (
                            filteredExpenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{exp.userName}</div>
                                        <div className="text-xs text-gray-500">{exp.userCompany}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-800">{ExpenseCategoryLabels[exp.category]}</div>
                                        <div className="text-xs text-gray-500">{exp.description}</div>
                                        <div className="text-[10px] text-gray-400 mt-1">{new Date(exp.date).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                                        {exp.amount.toFixed(2)}€
                                    </td>
                                    <td className="px-6 py-4">
                                        {exp.receiptUrl ? (
                                            <a href={exp.receiptUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline">
                                                <ExternalLink size={12} /> Ver Recibo
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Sem recibo</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline - block px - 3 py - 1 rounded - full text - xs font - bold ${exp.status === ExpenseStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                            exp.status === ExpenseStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                exp.status === ExpenseStatus.PAID ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            } `}>
                                            {ExpenseStatusLabels[exp.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {exp.status === ExpenseStatus.PENDING && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleStatusChange(exp, ExpenseStatus.APPROVED)}
                                                    className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                                                    title="Aprovar"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(exp, ExpenseStatus.REJECTED)}
                                                    className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                                    title="Rejeitar"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        )}
                                        {exp.status === ExpenseStatus.APPROVED && (
                                            <button
                                                onClick={() => handleStatusChange(exp, ExpenseStatus.PENDING)}
                                                className="text-xs text-gray-400 hover:text-gray-600 underline"
                                            >
                                                Reverter
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExpenseManagement;
