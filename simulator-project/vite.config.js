import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy `/api` to local backend during development.
    // Adjust the target if your API runs on a different port.
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
