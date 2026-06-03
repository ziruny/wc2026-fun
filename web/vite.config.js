import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/wc2026-fun/',
  build: {
    chunkSizeWarningLimit: 700,
  },
})
