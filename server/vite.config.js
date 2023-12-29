import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const PORT = parseInt(process.env.PORT)

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: PORT,
    host: true,
    strictPort: true,
    hmr: {
      port: PORT+1,
    },
    watch: {
      usePolling: true
    }
  },
  plugins: [react()],
})
