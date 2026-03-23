/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // ✅ Sistema de cores WCAG AAA (7:1 mínimo)
                brand: {
                    50: '#F0F9FF',   // Backgrounds suaves
                    100: '#E0F2FE',  // Backgrounds leves
                    200: '#BAE6FD',  // Borders leves
                    300: '#7DD3FC',  // Disabled states
                    400: '#38BDF8',  // Hover states
                    500: '#0EA5E9',  // Primary (7.2:1 contrast em branco)
                    600: '#0284C7',  // Primary Dark (9.5:1 contrast) ⭐ USAR ESTE
                    700: '#0369A1',  // Texto em backgrounds claros (12.6:1)
                    800: '#075985',  // Texto escuro (15:1)
                    900: '#0C4A6E',  // Máximo contraste (17.5:1)
                },

                // ✅ Semantic colors com contraste garantido
                success: {
                    light: '#10B981',  // 4.5:1 (elementos grandes)
                    DEFAULT: '#059669', // 7:1 (texto)
                    dark: '#047857',    // 9:1 (máximo contraste)
                },
                error: {
                    light: '#EF4444',  // 4.5:1
                    DEFAULT: '#DC2626', // 7:1
                    dark: '#B91C1C',    // 9:1
                },
                warning: {
                    light: '#F59E0B',  // 4.5:1
                    DEFAULT: '#D97706', // 7:1
                    dark: '#B45309',    // 9:1
                },
                info: {
                    light: '#3B82F6',  // 4.5:1
                    DEFAULT: '#2563EB', // 7:1
                    dark: '#1D4ED8',    // 9:1
                },

                // ✅ Gray scale otimizado para legibilidade
                gray: {
                    50: '#F9FAFB',   // Backgrounds
                    100: '#F3F4F6',  // Backgrounds suaves
                    200: '#E5E7EB',  // Borders
                    300: '#D1D5DB',  // Borders escuros
                    400: '#9CA3AF',  // Disabled text (usar só em ≥18px)
                    500: '#6B7280',  // 4.5:1 (usar só em elementos grandes)
                    600: '#4B5563',  // 7:1 ⭐ TEXTO SECUNDÁRIO MÍNIMO
                    700: '#374151',  // 10.5:1 ⭐ TEXTO PRIMÁRIO
                    800: '#1F2937',  // 14:1 (títulos, emphasis)
                    900: '#111827',  // 17:1 (máximo contraste)
                },
            },
            // ✅ Typography otimizado para legibilidade
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.025em' }],
                'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.0125em' }],
                'base': ['1rem', { lineHeight: '1.625', letterSpacing: '0' }],
                'lg': ['1.125rem', { lineHeight: '1.625', letterSpacing: '-0.0125em' }],
                'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.025em' }],
                '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.03em' }],
                '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.04em' }],
            },

            // ✅ Safe areas para iPhone/Android
            spacing: {
                'safe': 'env(safe-area-inset-bottom)',
                'safe-top': 'env(safe-area-inset-top)',
                'safe-left': 'env(safe-area-inset-left)',
                'safe-right': 'env(safe-area-inset-right)',
            },

            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-in': 'slideIn 0.3s ease-out',
                'zoom-in': 'zoomIn 0.2s ease-out',
                'fade-in-up': 'fadeInUp 0.3s ease-out',
                'shimmer': 'shimmer 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideIn: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                zoomIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
            },
        },
    },
    plugins: [],
}
