import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock,
  UserCircle,
  Calendar,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  primary?: boolean;
  badge?: number;
}

interface BottomNavProps {
  unreadMessages?: number;
}

/**
 * BottomNav - Navegação inferior otimizada para mobile
 *
 * Features:
 * - Posicionamento na thumb zone (bottom 1/3 do ecrã)
 * - Badge de notificações
 * - Indicador activo animado
 * - Botão primário destacado
 * - Safe area aware
 * - Backdrop blur para overlay
 * - Touch targets 48px+
 *
 * Apple HIG: https://developer.apple.com/design/human-interface-guidelines/tab-bars
 * Material Design: https://m3.material.io/components/navigation-bar
 */
const BottomNav: React.FC<BottomNavProps> = ({ unreadMessages = 0 }) => {
  const location = useLocation();

  const items: NavItem[] = [
    {
      id: 'kiosk',
      label: 'Kiosk',
      icon: Clock,
      path: '/portal',
      primary: true // Ação principal destacada
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: UserCircle,
      path: '/portal/profile'
    },
    {
      id: 'calendar',
      label: 'Horário',
      icon: Calendar,
      path: '/portal/attendance'
    },
    {
      id: 'messages',
      label: 'Msgs',
      icon: MessageSquare,
      path: '/portal/messages',
      badge: unreadMessages
    },
    {
      id: 'more',
      label: 'Mais',
      icon: MoreHorizontal,
      path: '/portal/menu'
    },
  ];

  const getIsActive = (item: NavItem) => {
    if (item.path === '/portal') {
      return location.pathname === '/portal';
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40
        bg-white/95 dark:bg-gray-800/95
        border-t border-gray-200 dark:border-gray-700

        /* Safe area para iPhone com notch/home indicator */
        pb-safe

        /* Shadow para elevação */
        shadow-[0_-2px_10px_rgba(0,0,0,0.1)]

        /* Backdrop blur para overlay suave */
        backdrop-blur-lg

        /* Hidden em desktop */
        lg:hidden
      "
    >
      <div className="flex items-stretch h-16 max-w-screen-xl mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = getIsActive(item);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1
                relative transition-all duration-200

                /* Touch target generoso (48px+) */
                min-h-[48px] min-w-[48px]

                /* Visual feedback */
                active:scale-95

                ${isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400'
                }
              `}
            >
              {/* Indicator activo (linha no topo) */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-brand-600 dark:bg-brand-400 rounded-b-full"
                  transition={{
                    type: 'spring',
                    damping: 30,
                    stiffness: 400
                  }}
                />
              )}

              {/* Ícone */}
              <div className="relative">
                <Icon
                  size={item.primary ? 28 : 24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={item.primary ? 'text-brand-600 dark:text-brand-400' : ''}
                />

                {/* Badge de notificações */}
                {item.badge && item.badge > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-1
                      bg-error text-white
                      text-[10px] font-bold
                      min-w-[16px] h-4 px-1
                      rounded-full
                      flex items-center justify-center
                      ring-2 ring-white dark:ring-gray-800
                    "
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  text-[10px] font-medium leading-none
                  ${isActive ? 'font-bold' : ''}
                `}
              >
                {item.label}
              </span>

              {/* Primary action pulse (apenas se não estiver activo) */}
              {item.primary && !isActive && (
                <motion.div
                  className="absolute inset-0 bg-brand-600 opacity-0 rounded-lg"
                  animate={{
                    opacity: [0, 0.1, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: 'easeInOut'
                  }}
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
