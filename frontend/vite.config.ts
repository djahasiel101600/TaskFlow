/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const apiBase = import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000'
const wsBase = apiBase.replace(/^http/, 'ws')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiBase,
        changeOrigin: true,
      },
      '/media': {
        target: apiBase,
        changeOrigin: true,
      },
      '/ws': {
        target: wsBase,
        ws: true,
      },
    },
  },
})
