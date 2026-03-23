import React, { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface ExpandableCardProps {
  title: string;
  icon: LucideIcon;
  count?: number | string;
  iconColor: string;
  bgGradient: string;
  collapsedContent: React.ReactNode;
  expandedContent: React.ReactNode;
  defaultExpanded?: boolean;
  showBadge?: boolean;
  badgeColor?: string;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  icon: Icon,
  count,
  iconColor,
  bgGradient,
  collapsedContent,
  expandedContent,
  defaultExpanded = false,
  showBadge = false,
  badgeColor = 'bg-green-400'
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`group relative ${bgGradient} rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/10 overflow-hidden ${
        isExpanded ? 'shadow-xl' : ''
      }`}
    >
      {/* Animated background */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative z-10 w-full p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Icon */}
          <div className={`${iconColor} backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-white/20 transition-transform group-hover:scale-110`}>
            <Icon size={24} className="text-white" strokeWidth={2.5} />
          </div>

          {/* Title */}
          <div className="text-left flex-1">
            <h3 className="text-white text-lg font-black">{title}</h3>
            {!isExpanded && collapsedContent && (
              <div className="text-white/80 text-sm font-medium mt-0.5">
                {collapsedContent}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Count badge */}
          {count !== undefined && (
            <div className="relative">
              <span className="bg-white/20 backdrop-blur-md text-white text-base font-black px-3 py-1.5 rounded-full shadow-lg border border-white/30">
                {count}
              </span>
              {showBadge && (
                <div className={`absolute -top-1 -right-1 w-3 h-3 ${badgeColor} rounded-full border-2 border-current animate-pulse`}></div>
              )}
            </div>
          )}

          {/* Expand/Collapse Icon */}
          <div className={`w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            <ChevronDown size={18} className="text-white" />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className={`relative z-10 overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 pt-2">
          <div className="border-t border-white/20 pt-4">
            {expandedContent}
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className={`h-full bg-white/40 transition-all duration-500 ${
          isExpanded ? 'w-full' : 'w-0 group-hover:w-full'
        }`}></div>
      </div>
    </div>
  );
};

export default ExpandableCard;
