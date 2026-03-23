/**
 * Numpad Component
 * Reusable numeric keypad for PIN input
 */

import React from 'react';
import { Delete } from 'lucide-react';

interface NumpadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
}

export const Numpad: React.FC<NumpadProps> = ({
  onDigit,
  onDelete,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <button
          key={num}
          type="button"
          onClick={() => onDigit(num.toString())}
          disabled={disabled}
          className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15
                     text-white text-2xl font-semibold transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:scale-105 active:scale-95"
        >
          {num}
        </button>
      ))}

      <div className="h-16" />

      <button
        type="button"
        onClick={() => onDigit('0')}
        disabled={disabled}
        className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15
                   text-white text-2xl font-semibold transition-all
                   disabled:opacity-30 disabled:cursor-not-allowed
                   hover:scale-105 active:scale-95"
      >
        0
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="h-16 rounded-2xl bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40
                   text-red-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed
                   flex items-center justify-center hover:scale-105 active:scale-95"
      >
        <Delete size={24} />
      </button>
    </div>
  );
};