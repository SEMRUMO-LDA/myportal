import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { permissionService } from '../services/permissionService';
import { Permission } from '../types/auth';
import { JobRole } from '../types';
import { useToast } from '../context/ToastContext';
import { Lock, Unlock, ShieldCheck, HelpCircle } from 'lucide-react';

interface RolePermissionMatrix {
    [roleId: number]: Set<string>; // Set of permission codes
}

const PermissionsManagement: React.FC = () => {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [roles, setRoles] = useState<JobRole[]>([]);
    const [matrix, setMatrix] = useState<RolePermissionMatrix>({});
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [permsData, rolesData] = await Promise.all([
                permissionService.getAllPermissions(),
                supabase.from('job_roles').select('*').order('name', { ascending: true })
            ]);

            setPermissions(permsData);

            const loadedRoles: JobRole[] = rolesData.data || [];
            setRoles(loadedRoles);

            // Load matrix
            const matrixData: RolePermissionMatrix = {};
            for (const role of loadedRoles) {
                const rolePerms = await permissionService.getRolePermissions(role.id);
                matrixData[role.id] = new Set(rolePerms);
            }
            setMatrix(matrixData);

        } catch (error) {
            console.error('Error fetching data:', error);
            addToast('error', 'Erro ao carregar permissões.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleReference = async (roleId: number, permissionCode: string) => {
        const currentSet = matrix[roleId] || new Set();
        const hasPermission = currentSet.has(permissionCode);
        const newSet = new Set(currentSet);

        // Optimistic update
        if (hasPermission) {
            newSet.delete(permissionCode);
        } else {
            newSet.add(permissionCode);
        }

        setMatrix(prev => ({ ...prev, [roleId]: newSet }));

        try {
            await permissionService.togglePermission(roleId, permissionCode, !hasPermission);
            addToast('success', `Permissão ${hasPermission ? 'removida' : 'adicionada'} com sucesso.`);
        } catch (error) {
            console.error('Error updating permission:', error);
            addToast('error', 'Erro ao atualizar permissão.');
            // Revert on error
            setMatrix(prev => ({ ...prev, [roleId]: currentSet }));
        }
    };

    // Group permissions by category
    // Group permissions by category
    const groupedPermissions: Record<string, Permission[]> = permissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando matriz de permissões...</div>;
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="text-brand-600" />
                    Gestão de Permissões
                </h1>
                <p className="text-gray-500 mt-1">
                    Defina quais os cargos que têm acesso a cada funcionalidade do sistema.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 min-w-[300px] sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                                    Permissão / Funcionalidade
                                </th>
                                {roles.map(role => (
                                    <th key={role.id} className="px-4 py-4 text-center min-w-[120px]">
                                        <div className="flex flex-col items-center">
                                            <span className="text-brand-700">{role.name}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                <React.Fragment key={category}>
                                    <tr className="bg-gray-50/50">
                                        <td
                                            colSpan={roles.length + 1}
                                            className="px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100/50 sticky left-0"
                                        >
                                            {category}
                                        </td>
                                    </tr>
                                    {perms.map(perm => (
                                        <tr key={perm.code} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-3 border-r border-gray-200 sticky left-0 bg-white group-hover:bg-gray-50">
                                                <div className="font-medium text-gray-900">{perm.description}</div>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">{perm.code}</div>
                                            </td>
                                            {roles.map(role => {
                                                const isGranted = matrix[role.id]?.has(perm.code);
                                                return (
                                                    <td key={`${role.id}-${perm.code}`} className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleToggleReference(role.id, perm.code)}
                                                            className={`
                                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                                ${isGranted ? 'bg-brand-600' : 'bg-gray-200'}
                              `}
                                                        >
                                                            <span
                                                                className={`
                                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                  ${isGranted ? 'translate-x-5' : 'translate-x-0'}
                                `}
                                                            />
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <HelpCircle className="text-blue-500 mt-0.5 shrink-0" size={20} />
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">Como funciona?</h4>
                    <p className="text-blue-800 text-sm mt-1">
                        As alterações são guardadas automaticamente. Ao ativar uma permissão, os utilizadores com esse cargo terão acesso imediato (poderá ser necessário recarregar a página ou voltar a entrar para ver menus atualizados).
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PermissionsManagement;
