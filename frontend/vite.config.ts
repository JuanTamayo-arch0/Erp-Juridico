import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// Use function form so we can set correct base for Electron packaging.
export default defineConfig(({ command, mode }) => {
  const isBuild = command === 'build'
  return {
    // In production (Electron loads file://...), ensure assets are resolved relative to index.html
    base: isBuild ? './' : '/',
    plugins: [react()],
    server: {
      // Use a fixed port so Electron knows where to connect during dev
      port: 5173,
      // Fail if the port is busy instead of silently picking another one.
      // This avoids Electron pointing to a wrong URL and showing an infinite "Loading...".
      strictPort: true,
      proxy: {
        // Proxy any /api requests to the Django backend running on :8000
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
