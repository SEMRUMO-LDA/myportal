
import React, { useState, useMemo } from 'react';
import { User, TimeLog, Department } from '../types';
import { Search, Building2, User as UserIcon } from 'lucide-react';

interface TeamStatusProps {
    users: User[];
    logs: TimeLog[];
}

const TeamStatus: React.FC<TeamStatusProps> = ({ users, logs }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');

    const today = new Date().toISOString().split('T')[0];

    // Calculate status for each user
    const userStatuses = useMemo(() => {
        return users.map(user => {
            // Find today's log for this user
            const userLog = logs.find(log => log.userId === user.id && log.date === today);

            // Determine status: Green if checked in AND NOT checked out
            const isOnline = userLog && userLog.checkIn && !userLog.checkOut;

            return {
                ...user,
                isOnline,
                lastLog: userLog
            };
        });
    }, [users, logs, today]);

    // Filter users
    const filteredUsers = userStatuses.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.department.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            filterStatus === 'ALL' ||
            (filterStatus === 'ONLINE' && user.isOnline) ||
            (filterStatus === 'OFFLINE' && !user.isOnline);

        return matchesSearch && matchesStatus;
    });

    const onlineCount = userStatuses.filter(u => u.isOnline).length;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Estado da Equipa</h1>
                    <p className="text-gray-500">Verifique a disponibilidade dos seus colegas em tempo real.</p>
                </div>

                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-gray-800">{onlineCount}</span>
                    <span className="text-gray-500 text-sm">Online Agora</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou departamento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterStatus('ALL')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterStatus('ONLINE')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filterStatus === 'ONLINE' ? 'bg-green-100 text-green-700 border border-green-200 font-bold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> Online
                    </button>
                    <button
                        onClick={() => setFilterStatus('OFFLINE')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filterStatus === 'OFFLINE' ? 'bg-red-100 text-red-700 border border-red-200 font-bold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div> Offline
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUsers.map(user => (
                    <div key={user.id} className={`bg-white rounded-xl shadow-sm border p-4 transition-all hover:shadow-md ${user.isOnline ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}`}>
                        <div className="flex items-start gap-4">
                            <div className="relative">
                                <img
                                    src={user.photoUrl}
                                    alt={user.name}
                                    className={`w-14 h-14 rounded-full object-cover border-2 ${user.isOnline ? 'border-green-500' : 'border-gray-200 grayscale'}`}
                                />
                                {user.isOnline && (
                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">{user.name}</h3>
                                <p className="text-xs text-gray-500 truncate mb-2">{user.role}</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <Building2 size={12} /> {user.department}
                            </span>
                        </div>
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <UserIcon size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Nenhum colega encontrado com estes filtros.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamStatus;
