import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The dev server proxies API and WebSocket traffic to the FastAPI backend
// (introduced in phase 2). Until then the frontend uses the in-browser mock layer.
export default defineConfig({
  // GitHub Pages serves the hosted build under /<repo>/ (set by the deploy workflow).
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: cache-friendly and keeps the app chunk small.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
})
