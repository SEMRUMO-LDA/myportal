import React from 'react';
import { Building2, QrCode } from 'lucide-react';
import { User } from '../types';

interface CollaboratorCardProps {
    user: User;
    className?: string;
}

const CollaboratorCard: React.FC<CollaboratorCardProps> = ({ user, className = "" }) => {
    return (
        <div className={`relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl transform transition-transform hover:scale-[1.02] duration-300 group ${className}`}>
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-brand-900 to-black"></div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

            {/* Content */}
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold tracking-wider">{user.department.toUpperCase()}</h2>
                        <p className="text-white/50 text-xs tracking-[0.2em] uppercase mt-1">Colaborador</p>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                        <Building2 size={24} className="text-brand-400" />
                    </div>
                </div>

                <div className="flex items-center gap-4 py-4">
                    <div className="w-12 h-12 bg-white rounded-lg p-1">
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            <QrCode size={32} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-white/40 text-[10px] uppercase font-bold mb-1">Nome do Titular</p>
                            <p className="font-mono text-lg md:text-xl tracking-wide font-medium shadow-black drop-shadow-md">
                                {user.name.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-white/40 font-mono pt-2 border-t border-white/10">
                        <span>ID: {user.id.toString().padStart(6, '0')}</span>
                        <span>MEMBER SINCE {user.admissionDate ? user.admissionDate.split('-')[0] : 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorCard;
