import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Permite rodar em qualquer subpasta no GitHub Pages ou Vercel
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/fastcdn-api': {
        target: 'https://fastcdn.fit',
        changeOrigin: true,
        secure: true,
        headers: {
          Host: 'fastcdn.fit',
          Origin: 'https://fastcdn.fit'
        },
        rewrite: (path) => path.replace(/^\/fastcdn-api/, '')
      }
    }
  }
})
