
import React, { useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import Header from '../components/Header';
import { useOutletContext } from 'react-router-dom';
import { Department, User } from '../types';
import { Building2, Search, Trash2, Plus, ArrowLeft, ArrowRight, User as UserIcon } from 'lucide-react';

interface DepartmentsManagementProps {
    departments: Department[];
    users: User[];
    onAddDepartment: (name: string) => void;
    onDeleteDepartment: (id: number) => void;
    onUpdateDepartment: (dept: Department) => void;
}

const DepartmentsManagement: React.FC<DepartmentsManagementProps> = ({ departments, users, onAddDepartment, onDeleteDepartment, onUpdateDepartment }) => {
    const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const filtered = departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleCreate = () => {
        if (!newName.trim()) return;
        onAddDepartment(newName);
        setNewName('');
        setIsCreating(false);
    };

    const handleAssignManager = (dept: Department, managerId: string) => {
        const id = managerId ? parseInt(managerId) : undefined;
        onUpdateDepartment({ ...dept, managerId: id });
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto space-y-8 pb-20 md:pb-8">
            <Header
                title="Departamentos"
                subtitle="Gerir a estrutura de departamentos da organização."
                onMenuClick={toggleSidebar}
            />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-brand-600">Departamentos</h2>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Plus size={16} /> Novo departamento
                    </button>
                </div>

                {/* Creation Form (collapsible) */}
                {isCreating && (
                    <div className="p-4 bg-emerald-50 border-b border-emerald-100 animate-fade-in flex flex-col md:flex-row gap-4 items-end md:items-center">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-emerald-700 mb-1">Nome do Departamento</label>
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ex: Recursos Humanos"
                                className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreate}
                                disabled={!newName.trim()}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Guardar
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="text-gray-500 px-4 py-2 hover:bg-gray-200 rounded-lg text-sm font-bold"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-4 space-y-4">
                    <div className="relative">
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
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Nome</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Responsável</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Data Registo</th>
                                    <th className="w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400 text-sm">
                                            {searchTerm ? 'Nenhum resultado encontrado.' : 'Nenhum departamento registado.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(d => (
                                        <tr key={d.id} className="hover:bg-gray-50 group">
                                            <td className="p-3 text-sm font-bold text-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-blue-50 text-blue-500 rounded"><Building2 size={16} /></div>
                                                    {d.name}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2 max-w-[200px]">
                                                    <UserIcon size={14} className="text-gray-400" />
                                                    <SearchableSelect
                                                        options={[
                                                            { id: '', label: 'Sem responsável' },
                                                            ...users.map(u => ({
                                                                id: u.id,
                                                                label: u.name,
                                                                sublabel: u.role
                                                            }))
                                                        ]}
                                                        value={d.managerId || ''}
                                                        onChange={(id) => handleAssignManager(d, id)}
                                                        placeholder="Pesquisar..."
                                                        className="w-full"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-3 text-right text-xs text-gray-400">
                                                Hoje
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => onDeleteDepartment(d.id)}
                                                    className="text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remover"
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

                    <div className="flex justify-end gap-2 p-2">
                        <button disabled className="px-3 py-1 border rounded text-xs text-gray-400 disabled:opacity-50">anterior</button>
                        <button disabled className="px-3 py-1 border rounded text-xs text-gray-400 disabled:opacity-50">próximo</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentsManagement;
