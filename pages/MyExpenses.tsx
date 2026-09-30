
import React, { useState, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import { User, Expense, ExpenseCategory, ExpenseStatus, ExpenseStatusLabels, ExpenseCategoryLabels } from '../types';
import {
    ReceiptEuro,
    Plus,
    X,
    UploadCloud,
    Calendar,
    DollarSign,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    Coins,
    ImageIcon,
    CheckCircle, // Added
    Receipt, // Added
    Upload, // Added
    Filter, // Added
    Search // Added
} from 'lucide-react';

interface MyExpensesProps {
    user: User;
    expenses: Expense[];
    onAddExpense: (expense: Expense) => void;
}

const MyExpenses: React.FC<MyExpensesProps> = ({ user, expenses, onAddExpense }) => {
    const { addToast } = useToast();
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Expense Form State
    const [formData, setFormData] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        category: ExpenseCategory.MEALS,
        amount: 0,
        description: '',
        receiptUrl: ''
    });

    const myExpenses = expenses.filter(e => Number(e.userId) === Number(user.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Stats
    const pendingAmount = myExpenses.filter(e => e.status === ExpenseStatus.PENDING).reduce((sum, e) => sum + e.amount, 0);
    const approvedAmount = myExpenses.filter(e => e.status === ExpenseStatus.APPROVED).reduce((sum, e) => sum + e.amount, 0);
    const paidAmount = myExpenses.filter(e => e.status === ExpenseStatus.PAID).reduce((sum, e) => sum + e.amount, 0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setFormData(prev => ({ ...prev, receiptUrl: event.target!.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || formData.amount <= 0) {
            addToast('warning', "O valor da despesa deve ser maior que zero.");
            return;
        }
        // if (!formData.receiptUrl) {
        //     alert("Por favor anexe o comprovativo.");
        //     return;
        // }

        onAddExpense({
            id: `exp-${Date.now()}`, // Added missing ID
            userId: user.id,
            userName: user.name,
            userCompany: user.company,
            date: formData.date!,
            category: formData.category!,
            amount: Number(formData.amount),
            description: formData.description || '',
            status: ExpenseStatus.PENDING,
            submissionDate: new Date().toISOString(),
            receiptUrl: formData.receiptUrl
        });

        setShowExpenseModal(false);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            category: ExpenseCategory.MEALS,
            amount: 0,
            description: '',
            receiptUrl: ''
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getStatusColor = (status: ExpenseStatus) => {
        switch (status) {
            case ExpenseStatus.APPROVED: return 'bg-green-100 text-green-700 border-green-200';
            case ExpenseStatus.PAID: return 'bg-blue-100 text-blue-700 border-blue-200';
            case ExpenseStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    const getStatusIcon = (status: ExpenseStatus) => {
        switch (status) {
            case ExpenseStatus.APPROVED: return <CheckCircle2 size={16} />;
            case ExpenseStatus.PAID: return <Coins size={16} />;
            case ExpenseStatus.REJECTED: return <XCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto pb-24">
            <Header title="Minhas Despesas" subtitle="Submeta e acompanhe o reembolso de despesas" hideControls />

            {/* Main Action Area */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setShowExpenseModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    <span>Nova Despesa</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <Clock className="text-yellow-600" size={24} />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Pendente</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{pendingAmount.toFixed(2)}€</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="text-green-600" size={24} />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Aprovado</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{approvedAmount.toFixed(2)}€</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Receipt className="text-blue-600" size={24} />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Pago</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{paidAmount.toFixed(2)}€</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ReceiptEuro className="text-brand-600" /> Histórico
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-center">Recibo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {myExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                        Não tem despesas registadas.
                                    </td>
                                </tr>
                            ) : (
                                myExpenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-gray-600">{expense.date}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">{ExpenseCategoryLabels[expense.category]}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{expense.description}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">{expense.amount.toFixed(2)}€</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(expense.status)}`}>
                                                {getStatusIcon(expense.status)} {ExpenseStatusLabels[expense.status]}
                                            </span>
                                            {expense.rejectionReason && (
                                                <p className="text-[10px] text-red-500 mt-1 max-w-[150px] leading-tight">{expense.rejectionReason}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {expense.receiptUrl && (
                                                <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-800 p-2 inline-block rounded-full hover:bg-brand-50">
                                                    <ImageIcon size={18} />
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Nova Despesa</h2>
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-gray-700 hover:shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.values(ExpenseCategory).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat })}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.category === cat
                                                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            {ExpenseCategoryLabels[cat]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                    placeholder="Detalhes da despesa..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comprovativo</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="space-y-1 text-center">
                                        {formData.receiptUrl ? (
                                            <div className="relative">
                                                <img src={formData.receiptUrl} alt="Receipt" className="mx-auto h-32 object-contain rounded-md" />
                                                <p className="text-xs text-green-600 mt-2 font-medium bg-green-50 py-1 px-2 rounded-full inline-block">
                                                    Imagem carregada com sucesso
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-brand-500 transition-colors" />
                                                <div className="flex text-sm text-gray-600">
                                                    <span className="relative cursor-pointer rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500">
                                                        Carregar ficheiro
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">PNG, JPG, GIF até 10MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowExpenseModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium shadow-sm hover:shadow active:scale-[0.98] transform"
                                >
                                    Submeter Despesa
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyExpenses;
