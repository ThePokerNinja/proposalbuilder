import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use /proposalbuilder/ for GitHub Pages, / for local development
  base: process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES === 'true' 
    ? '/proposalbuilder/' 
    : '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
