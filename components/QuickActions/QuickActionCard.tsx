import React from 'react';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  badge?: string | number;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const colorClasses = {
  blue: {
    gradient: 'from-blue-500 via-blue-600 to-blue-700',
    glow: 'shadow-blue-500/50',
    iconBg: 'bg-blue-400/30',
    badgeBg: 'bg-blue-900/80',
    border: 'border-blue-400/30',
    ring: 'focus:ring-blue-500/50'
  },
  green: {
    gradient: 'from-green-500 via-green-600 to-green-700',
    glow: 'shadow-green-500/50',
    iconBg: 'bg-green-400/30',
    badgeBg: 'bg-green-900/80',
    border: 'border-green-400/30',
    ring: 'focus:ring-green-500/50'
  },
  purple: {
    gradient: 'from-purple-500 via-purple-600 to-purple-700',
    glow: 'shadow-purple-500/50',
    iconBg: 'bg-purple-400/30',
    badgeBg: 'bg-purple-900/80',
    border: 'border-purple-400/30',
    ring: 'focus:ring-purple-500/50'
  },
  orange: {
    gradient: 'from-orange-500 via-orange-600 to-orange-700',
    glow: 'shadow-orange-500/50',
    iconBg: 'bg-orange-400/30',
    badgeBg: 'bg-orange-900/80',
    border: 'border-orange-400/30',
    ring: 'focus:ring-orange-500/50'
  },
  red: {
    gradient: 'from-red-500 via-red-600 to-red-700',
    glow: 'shadow-red-500/50',
    iconBg: 'bg-red-400/30',
    badgeBg: 'bg-red-900/80',
    border: 'border-red-400/30',
    ring: 'focus:ring-red-500/50'
  }
};

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon: Icon,
  title,
  description,
  color,
  badge,
  onClick,
  disabled = false,
  loading = false
}) => {
  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative group w-full h-full min-h-[160px]
        bg-gradient-to-br ${colors.gradient}
        rounded-3xl p-5
        text-white text-left
        transition-all duration-300 ease-out
        transform hover:scale-[1.08] active:scale-95
        shadow-lg hover:shadow-2xl ${colors.glow}
        border border-white/10
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        overflow-hidden
        focus:outline-none focus:ring-4 ${colors.ring}
      `}
    >
      {/* Animated glow orbs */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500"></div>

      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header with icon and badge */}
        <div className="flex items-start justify-between mb-auto">
          <div className={`${colors.iconBg} backdrop-blur-sm p-3.5 rounded-2xl shadow-xl border border-white/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
            <Icon size={28} className="text-white" strokeWidth={2.5} />
          </div>

          {badge !== undefined && (
            <div className="flex items-center">
              <span className={`${colors.badgeBg} backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20 uppercase tracking-wider`}>
                {badge}
              </span>
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="mt-4 space-y-1">
          <h3 className="text-lg md:text-xl font-black tracking-tight leading-tight group-hover:translate-x-1 transition-transform duration-300">
            {title}
          </h3>
          <p className="text-sm md:text-base font-medium opacity-95 leading-snug">
            {description}
          </p>
        </div>

        {/* Bottom accent line */}
        <div className="mt-auto pt-3">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/40 w-0 group-hover:w-full transition-all duration-500 ease-out"></div>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center rounded-3xl">
            <div className="relative">
              <div className="animate-spin w-10 h-10 border-4 border-white/30 border-t-white rounded-full"></div>
              <div className="absolute inset-0 animate-ping w-10 h-10 border-4 border-white/20 rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default QuickActionCard;
