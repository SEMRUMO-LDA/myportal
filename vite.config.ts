import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    base: './',
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'My Portal',
          short_name: 'Portal',
          description: 'Employee Portal Application',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          clientsClaim: true
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Supabase is big and isolated
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              
              // Specialized tools that are heavy and don't affect core UI logic
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('@google/genai')) {
                return 'vendor-specialized';
              }

              // Everything else together to prevent React context/memo breakage
              return 'vendor-base';
            }

            // App chunks - separate heavy pages
            if (id.includes('/pages/')) {
              // Fleet management (heavy)
              if (id.includes('FleetManagement') || id.includes('FleetBooking') || id.includes('TripHistory') || id.includes('MyVehicle')) {
                return 'fleet-pages';
              }

              // Reports (heaviest chunk)
              if (id.includes('Reports') || id.includes('AnalyticsDashboard') || id.includes('OrganizationalClimate')) {
                return 'reports-pages';
              }

              // Admin settings pages
              if (id.includes('Settings') || id.includes('Permissions') || id.includes('Roles')) {
                return 'admin-pages';
              }

              // HR pages
              if (id.includes('UserProfile') || id.includes('AttendanceControl') || id.includes('AbsenceManagement')) {
                return 'hr-pages';
              }

              // Kiosk (standalone)
              if (id.includes('KioskDashboard')) {
                return 'kiosk-page';
              }
            }

            // Components - separate heavy ones
            if (id.includes('/components/')) {
              if (id.includes('LeoAssistant') || id.includes('QuorumAnalyzer')) {
                return 'components-heavy';
              }
            }
          },

          // Optimization settings
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },

      // Performance optimizations
      chunkSizeWarningLimit: 500,
      minify: 'esbuild',
      sourcemap: false, // Disable sourcemaps in production for smaller size

      // Target modern browsers
      target: 'es2020'
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'zustand'
      ],
      exclude: ['@fullcalendar/react']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    ...(mode === 'production' ? {
      esbuild: {
        drop: ['console', 'debugger'],  // Remove ALL console.log em produção
      }
    } : {})
  };
});
