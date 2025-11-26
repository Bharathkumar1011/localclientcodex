
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
   base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
    server: {
    port: 5173,
    proxy: {
      '/api': {
        // 👇 if backend runs on same machine as frontend dev
        target: 'http://localhost:5000',
        // or if you’re testing from another device:
        // target: 'http://172.208.68.134:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // server: {
  //   port: 5173,
  //   proxy: {
  //     '/api': {
  //        target: 'http://172.208.68.134:5000',
  //       changeOrigin: true,
  //       secure: false,
  //     },
  //   },
  // },
  // define: {
  //   'import.meta.env.VITE_API_URL': JSON.stringify(
  //     process.env.VITE_API_URL ?? '/api',
  //   ),
  // },
})
