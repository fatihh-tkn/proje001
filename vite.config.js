import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,pdf,xml,bpmn,txt,doc,docx}'],
        // Maksimum cache boyutu artırıldı ki büyük pdf/bpmn vs. sığsın
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      }
    })
  ]
})
