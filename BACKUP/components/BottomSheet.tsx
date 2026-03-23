import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string; // e.g., '90vh', '600px'
}

/**
 * BottomSheet - Modal otimizado para mobile
 *
 * Features:
 * - Swipe-down para fechar (natural gesture)
 * - Tap no backdrop para fechar
 * - Handle visual no topo
 * - Smooth spring animation
 * - Safe area aware (notch, home indicator)
 * - Drag elasticity com feedback visual
 *
 * Usage:
 * ```tsx
 * <BottomSheet
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Nova Despesa"
 * >
 *   <ExpenseForm onSubmit={handleSubmit} />
 * </BottomSheet>
 * ```
 */
const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '90vh'
}) => {
  const [dragProgress, setDragProgress] = useState(0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop com fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            transition={{ duration: 0.2 }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info: PanInfo) => {
              // Fechar se arrastar mais de 150px ou velocidade > 500
              if (info.offset.y > 150 || info.velocity.y > 500) {
                onClose();
              }
            }}
            onDrag={(_, info: PanInfo) => {
              // Calcular progresso do drag para feedback visual
              const progress = Math.max(0, Math.min(1, info.offset.y / 300));
              setDragProgress(progress);
            }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{ maxHeight }}
          >
            {/* Sticky Header com Drag Handle */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 pt-3 pb-2 px-4 border-b border-gray-100 dark:border-gray-800">
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4 transition-all" />

              {/* Header */}
              {title && (
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  <button
                    onClick={onClose}
                    className="
                      p-2 rounded-full
                      hover:bg-gray-100 dark:hover:bg-gray-800
                      active:scale-95
                      transition-all
                      text-gray-600 dark:text-gray-400
                    "
                    aria-label="Fechar"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Content com scroll */}
            <div
              className="overflow-y-auto flex-1 px-4 pb-6 safe-area-bottom"
              style={{
                opacity: 1 - dragProgress,
                transform: `scale(${1 - dragProgress * 0.05})`
              }}
            >
              {children}
            </div>

            {/* Safe Area Spacer (iPhone home indicator) */}
            <div className="h-safe bg-white dark:bg-gray-900" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
