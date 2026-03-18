
import React, { useState } from 'react';
import Header from '../components/Header';
import { useOutletContext } from 'react-router-dom';
import { JobRole } from '../types';
import { Briefcase, Trash2 } from 'lucide-react';

interface RolesManagementProps {
    roles: JobRole[];
    onAddRole: (name: string) => void;
    onDeleteRole: (id: number) => void;
}

const RolesManagement: React.FC<RolesManagementProps> = ({ roles, onAddRole, onDeleteRole }) => {
    const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
    const [name, setName] = useState('');

    const handleSave = () => {
        if (!name.trim()) return;
        onAddRole(name);
        setName('');
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto space-y-8 pb-20 md:pb-8">
            <Header
                title="Gestão de Cargos"
                subtitle="Definir os cargos disponíveis para os colaboradores."
                onMenuClick={toggleSidebar}
            />

            {/* Creation Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Novo cargo</h2>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Guardar
                    </button>
                </div>
                <div className="p-4 md:p-6">
                    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm max-w-2xl">
                        <h3 className="text-sm font-bold text-brand-600 mb-4 uppercase tracking-wider">Novo cargo</h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Nome <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Consultor Sénior"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* List of Roles */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Briefcase size={18} className="text-gray-500" />
                    Cargos Existentes
                </h3>

                {roles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm italic">
                        Nenhum cargo definido.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map(role => (
                            <div key={role.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg group hover:border-brand-200 transition-colors">
                                <span className="text-sm font-bold text-gray-800">{role.name}</span>
                                <button
                                    onClick={() => onDeleteRole(role.id)}
                                    className="text-gray-400 hover:text-red-600 p-2 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remover"
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

export default RolesManagement;
