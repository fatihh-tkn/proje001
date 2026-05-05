import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { exec } from 'child_process'
import path from 'path'

const isProd = process.env.NODE_ENV === 'production';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    // Prevent multiple Three.js instances (react-force-graph-3d bundles its own Three)
    dedupe: ['three'],
    alias: {
      // Force every "three" import (including nested deps) to use the single root-level copy
      three: path.resolve(__dirname, 'node_modules/three'),
    },
  },
  optimizeDeps: {
    include: [
      'three',
      'react-force-graph-3d',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // Ağır kütüphaneleri ayrı chunk'lara böl → ilk yükleme hızlanır
        manualChunks: {
          'vendor-bpmn': ['bpmn-js'],
          'vendor-pdf': ['pdfjs-dist'],
          'vendor-recharts': ['recharts'],
          'vendor-xlsx': ['xlsx'],
          'vendor-motion': ['framer-motion'],
          'vendor-dndkit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/modifiers'],
        }
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'open-chrome-app',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          setTimeout(() => {
            exec('start chrome --app=http://localhost:5173');
          }, 1000);
        });
      }
    },
    // PWA sadece production build'inde aktif
    VitePWA({
      disable: !isProd,
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,pdf,xml,bpmn,txt,doc,docx}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      }
    })
  ]
})
