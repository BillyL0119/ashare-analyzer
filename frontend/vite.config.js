import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:8001',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:8001',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Charts only load with a page that draws one; the entry chunk must not reference that group.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 20 },
            { name: 'vendor-echarts', test: /node_modules[\\/](echarts|echarts-for-react|zrender|size-sensor)[\\/]/, priority: 10 },
            { name: 'vendor-recharts', test: /node_modules[\\/]recharts[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
