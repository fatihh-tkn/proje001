import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
