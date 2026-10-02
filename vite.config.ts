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
    base: '/app/myportal/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
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
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true
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
              // Supabase isolado
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }

              // PDF e HTML2Canvas - muito pesados, lazy load
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'vendor-pdf';
              }

              // Charts - também pesado, lazy load
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts';
              }

              // Calendar - lazy load
              if (id.includes('@fullcalendar')) {
                return 'vendor-calendar';
              }

              // AI - lazy load
              if (id.includes('@google/genai')) {
                return 'vendor-ai';
              }

              // Motion / Animations isolado
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }

              // TUDO o resto junto (React, Router, libs, etc) - evita dependency issues
              return 'vendor';
            }
          },

          // Optimization settings
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },

      // Performance optimizations
      chunkSizeWarningLimit: 600,
      minify: 'esbuild',
      sourcemap: false,
      target: 'es2020',

      // Rollup optimizations
      cssCodeSplit: true,
      reportCompressedSize: false,

      // Treeshaking agressivo
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false
      },

      // Additional minification
      cssMinify: true
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
