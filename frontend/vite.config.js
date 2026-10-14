import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy for the production page (build only: the dev server injects inline
// scripts of its own). Inline scripts are allowed by hash, so an injected <script> cannot run.
// Styles keep 'unsafe-inline' because React style={...} props are inline style attributes.
const SUPABASE = 'https://yanbnkraietnntyqhtck.supabase.co'
function contentSecurityPolicy() {
  return {
    name: 'bfs-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = []
        for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
          if (/type="application\/ld\+json"/.test(m[1])) continue      // data, never executed
          hashes.push(`'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`)
        }
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          `connect-src 'self' ${SUPABASE} ${SUPABASE.replace('https:', 'wss:')}`,
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          'upgrade-insecure-requests',
        ].join('; ')
        return html.replace(/(<meta charset="[^"]*"\s*\/?>)/i, `$1\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
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
