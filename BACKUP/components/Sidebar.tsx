import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';
import { normalizeRoleName, isAdminRole, getRoleDisplayName } from '../utils/authUtils';
import {
  LayoutDashboard,
  Users,
  LogOut,
  UserCircle,
  CalendarDays,
  Clock,
  MessageSquare,
  Settings,
  ShieldCheck,
  FileText,
  X,
  FileBarChart,
  ReceiptEuro,
  Car,
  ChevronDown,
  ChevronRight,
  Lock,
  Briefcase,
  Building2,
  Calendar,
  FolderOpen,
  ClipboardList,
  AlertTriangle,
  Umbrella,
  Watch,
  Cloud,
  MapPin,
  Hourglass,
  History,
  Heart
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose, onLogout }) => {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg transition-all text-sm font-medium mb-1 ${isActive
      ? 'bg-brand-50 text-brand-700 font-bold shadow-sm ring-1 ring-brand-200'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const subLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium mb-1 pl-9 ${isActive
      ? 'text-brand-700 font-bold'
      : 'text-gray-500 hover:text-gray-900'
    }`;

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="px-3 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
      {label}
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-30 h-screen w-72 md:w-64 bg-white border-r border-gray-200 flex flex-col 
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2 text-brand-700">
            <div className="bg-brand-600 text-white p-1.5 rounded-lg shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none text-gray-900">{user?.department || 'SEMRUMO'}</h1>
              <p className="text-[10px] text-gray-500 font-bold mt-0.5 tracking-wider">MY PORTAL</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
          <NavLink to="/admin" end className={linkClasses} onClick={onClose}>
            <LayoutDashboard size={18} />
            <span>Visão Geral</span>
          </NavLink>

          {/* ADMINISTRAÇÃO DROPDOWN */}
          {(hasPermission('VIEW_ADMIN') || (user?.role === UserRole.ADMIN) || isAdminRole(normalizeRoleName(user?.role || ''))) && (
            <div className="mt-2">
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className={`w-full flex items-center justify-between px-3 py-3 md:py-2.5 rounded-lg transition-all text-sm font-bold mb-1 ${isAdminOpen ? 'text-gray-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Settings size={18} />
                  <span>Administração</span>
                </div>
                {isAdminOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isAdminOpen && (
                <div className="mt-1 space-y-0.5 animate-slide-down">
                  {hasPermission('MANAGE_SETTINGS') && (
                    <NavLink to="/admin/settings/lock-month" className={subLinkClasses} onClick={onClose}>
                      <Lock size={16} />
                      <span>Bloqueio de Mês</span>
                    </NavLink>
                  )}
                  {hasPermission('MANAGE_ROLES') && (
                    <>
                      <NavLink to="/admin/settings/roles" className={subLinkClasses} onClick={onClose}>
                        <Briefcase size={16} />
                        <span>Cargos</span>
                      </NavLink>
                      <NavLink to="/admin/settings/permissions" className={subLinkClasses} onClick={onClose}>
                        <ShieldCheck size={16} />
                        <span>Permissões</span>
                      </NavLink>
                    </>
                  )}
                  {hasPermission('MANAGE_SETTINGS') && (
                    <>
                      <NavLink to="/admin/settings/departments" className={subLinkClasses} onClick={onClose}>
                        <Building2 size={16} />
                        <span>Departamentos</span>
                      </NavLink>
                      <NavLink to="/admin/settings/holidays" className={subLinkClasses} onClick={onClose}>
                        <Calendar size={16} />
                        <span>Feriados</span>
                      </NavLink>
                      <NavLink to="/admin/settings/schedule-templates" className={subLinkClasses} onClick={onClose}>
                        <ClipboardList size={16} />
                        <span>Modelos de Horário</span>
                      </NavLink>
                      {/* ANOMALIAS DESABILITADAS TEMPORARIAMENTE
                      <NavLink to="/admin/settings/anomalies" className={subLinkClasses} onClick={onClose}>
                        <AlertTriangle size={16} />
                        <span>Tipos de anomalia</span>
                      </NavLink> */}
                      <NavLink to="/admin/settings/leave-types" className={subLinkClasses} onClick={onClose}>
                        <Umbrella size={16} />
                        <span>Tipos de Ausência</span>
                      </NavLink>
                      <NavLink to="/admin/settings/integrations" className={subLinkClasses} onClick={onClose}>
                        <Cloud size={16} />
                        <span>Integrações</span>
                      </NavLink>
                    </>
                  )}
                  <NavLink to="/admin/documents" className={subLinkClasses} onClick={onClose}>
                    <FolderOpen size={16} />
                    <span>Gestão Documental</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}
          <SectionLabel label="Interface" />
          {hasPermission('VIEW_TIMELOGS') && (
            <>
              <NavLink
                to="/admin/attendance"
                end
                className={() => linkClasses({
                  isActive: location.pathname === '/admin/attendance' && !location.search.includes('tab=bank')
                })}
                onClick={onClose}
              >
                <Clock size={18} />
                <span>Registos</span>
              </NavLink>
              <NavLink
                to="/admin/attendance?tab=bank"
                className={() => linkClasses({
                  isActive: location.pathname === '/admin/attendance' && location.search.includes('tab=bank')
                })}
                onClick={onClose}
              >
                <Hourglass size={18} />
                <span>Banco de Horas</span>
              </NavLink>
              {/* ANOMALIAS DESABILITADAS TEMPORARIAMENTE
              <NavLink to="/admin/anomalies" className={linkClasses} onClick={onClose}>
                <AlertTriangle size={18} />
                <span>Anomalias</span>
              </NavLink> */}
            </>
          )}
          {hasPermission('VIEW_ABSENCES') && (
            <NavLink to="/admin/absences" className={linkClasses} onClick={onClose}>
              <CalendarDays size={18} />
              <span>Justificações / Férias</span>
            </NavLink>
          )}
          <NavLink to="/admin/team-calendar" className={linkClasses} onClick={onClose}>
            <Calendar size={18} />
            <span>Calendário de Equipa</span>
          </NavLink>
          {(hasPermission('VIEW_ADMIN') || user?.role === UserRole.ADMIN || isAdminRole(normalizeRoleName(user?.role || ''))) && (
            <NavLink to="/admin/messages" className={linkClasses} onClick={onClose}>
              <MessageSquare size={18} />
              <span>Mensagens Internas</span>
            </NavLink>
          )}
          {hasPermission('MANAGE_USERS') && (
            <NavLink to="/admin/users" className={linkClasses} onClick={onClose}>
              <Users size={18} />
              <span>Colaboradores</span>
            </NavLink>
          )}
          {hasPermission('MANAGE_SETTINGS') && (
            <NavLink to="/admin/locations" className={linkClasses} onClick={onClose}>
              <MapPin size={18} />
              <span>Locais</span>
            </NavLink>
          )}
          {/* DESPESAS DESABILITADAS TEMPORARIAMENTE
          {hasPermission('VIEW_EXPENSES') && (
            <NavLink to="/admin/expenses" className={linkClasses} onClick={onClose}>
              <ReceiptEuro size={18} />
              <span>Despesas</span>
            </NavLink>
          )} */}

          <SectionLabel label="Relatórios" />
          {(hasPermission('VIEW_TIMELOGS') && hasPermission('VIEW_ABSENCES')) && (
            <>
              <NavLink to="/admin/analytics" className={linkClasses} onClick={onClose}>
                <FileBarChart size={18} />
                <span>Indicadores de Desempenho</span>
              </NavLink>
              <NavLink to="/admin/climate" className={linkClasses} onClick={onClose}>
                <Heart size={18} />
                <span>Clima Organizacional</span>
              </NavLink>
              <NavLink to="/admin/reports" className={linkClasses} onClick={onClose}>
                <FileBarChart size={18} />
                <span>Relatórios Oficiais</span>
              </NavLink>
            </>
          )}

          <SectionLabel label="Gestão de Frota" />
          {hasPermission('VIEW_FLEET') && (
            <>
              <NavLink to="/admin/fleet" className={linkClasses} onClick={onClose} end>
                <Car size={18} />
                <span>Controlo de Frota</span>
              </NavLink>
              <NavLink to="/admin/trip-history" className={linkClasses} onClick={onClose}>
                <History size={18} />
                <span>Relatórios de Viagem</span>
              </NavLink>
            </>
          )}

          <SectionLabel label="Sistema & Auditoria" />
          {hasPermission('VIEW_AUDIT') && (
            <NavLink to="/auditor" target="_blank" className={linkClasses} onClick={onClose}>
              <FileText size={18} />
              <span>Portal Auditor (ACT)</span>
            </NavLink>
          )}

        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 safe-area-bottom">
          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 shrink-0">
              <UserCircle size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-700 truncate">{user?.name || 'Visitante'}</p>
              <p className="text-[10px] text-gray-500 truncate">{getRoleDisplayName(user?.role || '') || 'Sem acesso'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 w-full rounded-lg text-xs font-bold text-red-600 bg-white border border-red-100 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
