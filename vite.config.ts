import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Only use /proposalbuilder/ base path in production builds
  // In development, use root path for easier testing
  base: process.env.NODE_ENV === 'production' ? '/proposalbuilder/' : '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
