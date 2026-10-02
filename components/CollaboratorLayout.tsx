
import React, { useState } from 'react';
import { User, LogOut, Building2, UserCircle, MessageSquare, LayoutDashboard, Clock, Menu, X, Fingerprint, ReceiptEuro, Gift, TreePalm, Users } from 'lucide-react';
import { User as UserType } from '../types';
import { NavLink } from 'react-router-dom';
const LeoAssistant = React.lazy(() => import('./LeoAssistant'));

interface CollaboratorLayoutProps {
    user: UserType | null;
    onLogout: () => void;
    children: React.ReactNode;
    unreadMessagesCount?: number;
}

const CollaboratorLayout: React.FC<CollaboratorLayoutProps> = ({ user, onLogout, children, unreadMessagesCount = 0 }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const NavItem = ({ to, icon: Icon, label, end = false, badge }: any) => (
        <NavLink
            to={to}
            end={end}
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-100 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
            }
        >
            <Icon size={20} />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
            )}
        </NavLink>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex">

            {/* MOBILE OVERLAY */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* SIDEBAR NAVIGATION */}
            <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="bg-brand-600 p-2 rounded-lg text-white">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-none text-gray-900">SEMRUMO</h1>
                        <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">MY PORTAL</p>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-auto text-gray-400">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <NavItem to="/portal" icon={LayoutDashboard} label="Kiosk (Início)" end />
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4 mb-2 px-4">Gestão</div>
                    <NavItem to="/portal/profile" icon={UserCircle} label="Meu Perfil" />
                    <NavItem to="/portal/attendance" icon={Fingerprint} label="Calendário Pessoal" />
                    <NavItem to="/portal/time-bank" icon={Clock} label="Banco de Horas" />
                    <NavItem to="/portal/vacations" icon={TreePalm} label="Férias & Ausências" />
                    <NavItem to="/portal/expenses" icon={ReceiptEuro} label="Minhas Despesas" />
                    <NavItem to="/portal/team-status" icon={Users} label="Estado da Equipa" />

                    <NavItem to="/rewards" icon={Gift} label="Clube de Benefícios" />
                    <NavItem to="/portal/feedback" icon={MessageSquare} label="Canal de Feedback" />
                    <NavItem to="/portal/messages" icon={MessageSquare} label="Live Chat & Mensagens" badge={unreadMessagesCount} />
                </nav>

                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3 mb-4">
                        <img src={user?.photoUrl} alt="User" className="w-10 h-10 rounded-full border border-gray-200" />
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate text-gray-900">{user?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            onLogout();
                            setTimeout(() => {
                                window.location.hash = '/login';
                            }, 100);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-lg text-sm font-medium transition-colors text-gray-600"
                    >
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">

                {/* TOP HEADER */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 dark:text-gray-400">
                            <Menu size={24} />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-100 hidden md:block">
                                Área de Colaborador
                            </h2>
                            <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:block">Gestão de Perfil e Assiduidade</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notification button removed */}
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden bg-gray-50 dark:bg-gray-900 transition-colors">
                    {children}
                </main>
            </div>

            {/* Notification slide-over removed */}

            {/* LEO Assistant */}
            <React.Suspense fallback={null}>
                <LeoAssistant currentUser={user} context="kiosk" />
            </React.Suspense>
        </div>
    );
};

export default CollaboratorLayout;
