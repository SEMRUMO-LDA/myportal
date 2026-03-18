
import React, { useState } from 'react';
import Header from '../components/Header';
import { useOutletContext } from 'react-router-dom';
import { AnomalyType } from '../types';
import { Search, Trash2, Plus, CheckCircle, XCircle, FileText, Check } from 'lucide-react';

interface AnomalyTypesManagementProps {
    anomalyTypes: AnomalyType[];
    onAddAnomalyType: (data: Omit<AnomalyType, 'id' | 'createdAt'>) => void;
    onDeleteAnomalyType: (id: number) => void;
}

const AnomalyTypesManagement: React.FC<AnomalyTypesManagementProps> = ({ anomalyTypes, onAddAnomalyType, onDeleteAnomalyType }) => {
    const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [isJustified, setIsJustified] = useState(false);
    const [type, setType] = useState<'Falta' | 'Extra'>('Falta');
    const [rhCode, setRhCode] = useState('');

    const filtered = anomalyTypes.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleCreate = () => {
        if (!newName.trim()) return;
        onAddAnomalyType({
            name: newName,
            isJustified,
            type,
            rhCode,
            status: 'active'
        });
        // Reset
        setNewName('');
        setIsJustified(false);
        setType('Falta');
        setRhCode('');
        setIsCreating(false);
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-6xl mx-auto space-y-8 pb-20 md:pb-8">
            <Header
                title="Todos os tipos de anomalia"
                subtitle="Gestão dos tipos de faltas, horas extra e outras ocorrências."
                onMenuClick={toggleSidebar}
            />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-brand-600">Todos os tipos de anomalia</h2>
                    <div className="flex gap-2">
                        <button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                            Importar
                        </button>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> Novo tipo
                        </button>
                    </div>
                </div>

                {/* Creation Form */}
                {isCreating && (
                    <div className="p-4 bg-gray-50 border-b border-gray-200 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nome</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as 'Falta' | 'Extra')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                                >
                                    <option value="Falta">Falta</option>
                                    <option value="Extra">Extra</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Cód. RH</label>
                                <input
                                    type="text"
                                    value={rhCode}
                                    onChange={(e) => setRhCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="justified"
                                    checked={isJustified}
                                    onChange={(e) => setIsJustified(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                />
                                <label htmlFor="justified" className="text-sm text-gray-700">Justificada</label>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4 justify-end">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="text-gray-500 px-4 py-2 hover:bg-gray-200 rounded-lg text-sm font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newName.trim()}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-4 space-y-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Procurar.."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-300"
                        />
                    </div>

                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Nome</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Justificada</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">F / E</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Código Integração RH</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Data Registo</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-400 text-sm">
                                            {searchTerm ? 'Nenhum resultado encontrado.' : 'Nenhuma anomalia registada.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50 group">
                                            <td className="p-3 text-sm font-medium text-gray-600">{a.name}</td>
                                            <td className="p-3 text-sm text-gray-600">
                                                {a.isJustified ? 'Sim' : 'Não'}
                                            </td>
                                            <td className="p-3 text-sm text-gray-600">
                                                {a.type}
                                            </td>
                                            <td className="p-3 text-sm text-gray-600">
                                                {a.rhCode || '-'}
                                            </td>
                                            <td className="p-3">
                                                {a.status === 'active' ? <Check className="text-emerald-500" size={18} /> : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="p-3 text-right text-xs text-gray-400 font-mono">
                                                {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => onDeleteAnomalyType(a.id)}
                                                    className="text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnomalyTypesManagement;
