/**
 * LoginModeToggle Component
 * Toggle between Colaborador and Administrador login modes
 */

import React from 'react';
import { UserCircle, ShieldCheck } from 'lucide-react';

interface LoginModeToggleProps {
  mode: 'colaborador' | 'administrador';
  onChange: (mode: 'colaborador' | 'administrador') => void;
  disabled?: boolean;
}

export const LoginModeToggle: React.FC<LoginModeToggleProps> = ({
  mode,
  onChange,
  disabled = false
}) => {
  return (
    <div className="flex mb-8 bg-white/5 p-1 rounded-2xl">
      <button
        type="button"
        onClick={() => onChange('colaborador')}
        disabled={disabled}
        className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300
                    flex items-center justify-center gap-2
                    ${mode === 'colaborador'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-white/60 hover:text-white/80'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <UserCircle size={18} />
        Colaborador
      </button>

      <button
        type="button"
        onClick={() => onChange('administrador')}
        disabled={disabled}
        className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300
                    flex items-center justify-center gap-2
                    ${mode === 'administrador'
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-white/60 hover:text-white/80'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <ShieldCheck size={18} />
        Administrador
      </button>
    </div>
  );
};