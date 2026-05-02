import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/One-Convenience/backend/api',
        changeOrigin: true
      }
    }
  }
}) // FIXED: One-Convenience proxy - BLACKBOXAI

