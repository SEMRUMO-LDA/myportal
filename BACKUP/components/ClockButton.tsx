import React from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ClockButtonProps {
  type: 'in' | 'out';
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * ClockButton - Botão otimizado para picagem de ponto em mobile
 *
 * Features:
 * - Touch target ≥56px (Apple HIG compliant)
 * - Haptic feedback ao tocar
 * - Visual feedback imediato
 * - Loading state integrado
 * - Gradient para profundidade visual
 */
const ClockButton: React.FC<ClockButtonProps> = ({
  type,
  onPress,
  disabled = false,
  isLoading = false
}) => {
  const isClockIn = type === 'in';

  const handlePress = () => {
    if (disabled || isLoading) return;

    // Haptic feedback (iOS Safari e Android Chrome)
    if (navigator.vibrate) {
      navigator.vibrate(50); // 50ms vibration
    }

    // Trigger action
    onPress();
  };

  return (
    <motion.button
      onClick={handlePress}
      disabled={disabled || isLoading}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        relative

        /* Touch target mínimo 56px (Apple HIG) */
        min-h-[56px] sm:min-h-[64px]

        /* Visual prominence */
        ${isClockIn
          ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
          : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
        }

        /* Estado disabled */
        disabled:opacity-50 disabled:cursor-not-allowed

        /* Spacing generoso para touch */
        px-6 py-4 sm:px-8 sm:py-5

        /* Corner radius confortável */
        rounded-2xl

        /* Shadow para profundidade */
        ${isClockIn
          ? 'shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40'
          : 'shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40'
        }

        /* Typography otimizado */
        text-white font-bold text-base sm:text-lg

        /* Flex para ícone + texto */
        flex items-center justify-center gap-3

        /* Full width em mobile */
        w-full sm:w-auto sm:min-w-[200px]

        /* Transition suave */
        transition-all duration-200

        /* Active state */
        active:brightness-90
      `}
    >
      {/* Ícone - tamanho maior em desktop */}
      <Clock
        size={24}
        className="sm:hidden flex-shrink-0"
      />
      <Clock
        size={28}
        className="hidden sm:block flex-shrink-0"
      />

      {/* Label */}
      <span className="truncate">
        {isClockIn ? 'Marcar Entrada' : 'Marcar Saída'}
      </span>

      {/* Loading overlay */}
      {(isLoading || disabled) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center backdrop-blur-[2px]"
        >
          <Loader2
            className="animate-spin text-white"
            size={24}
          />
        </motion.div>
      )}

      {/* Pulse animation quando não está loading */}
      {!isLoading && !disabled && (
        <motion.div
          className={`absolute inset-0 rounded-2xl ${isClockIn ? 'bg-green-400' : 'bg-red-400'}`}
          animate={{
            opacity: [0, 0.2, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'easeInOut'
          }}
        />
      )}
    </motion.button>
  );
};

export default ClockButton;
