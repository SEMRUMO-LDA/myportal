
import React, { useState } from 'react';
import { Search, Menu } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  hideControls?: boolean;
  onMenuClick?: () => void;
}

interface OutletContextType {
  toggleSidebar?: () => void;
  currentUser?: User | null;
  users?: User[];
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, hideControls, onMenuClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const context = useOutletContext<OutletContextType>() || {};
  const {
    currentUser,
  } = context;


  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  };

  const getUserLabel = () => {
    if (!user) return 'Convidado';
    return user.role || 'Utilizador';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      alert(`Pesquisa por: ${searchTerm} (Funcionalidade futura)`);
    }
  };



  return (
    <div className="flex justify-between items-center mb-6 md:mb-8 relative z-20">
      <div>
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Menu size={24} />
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
        </div>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden md:block">{subtitle}</p>}
      </div>

      {!hideControls && (
        <div className="flex items-center gap-3 md:gap-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Procurar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 focus:border-brand-500 w-64 transition-all shadow-sm text-gray-900 dark:text-white placeholder-gray-400"
            />
          </form>

          <div className="flex items-center gap-2 md:gap-3">

            {/* Notifications removed */}



            <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1 hidden md:block"></div>

            <button className="flex items-center gap-2 p-1.5 pr-3 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-100 dark:border-brand-900/50 rounded-full group transition-all">
              <div className="w-8 h-8 rounded-full bg-brand-200 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                {getInitials(user?.name)}
              </div>
              <span className="text-sm font-bold text-brand-900 dark:text-brand-100 hidden md:block group-hover:text-brand-800 dark:group-hover:text-white">
                {getUserLabel()}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
