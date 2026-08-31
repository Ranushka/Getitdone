import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react(), TanStackRouterVite()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3658,
    strictPort: true,
    proxy: {
      '/trpc': 'http://localhost:3659',
      '/uploads': 'http://localhost:3659',
      '/api': 'http://localhost:3659',
    },
  },
  preview: {
    port: 4658,
    strictPort: true,
  },
})
