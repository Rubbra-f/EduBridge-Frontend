import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.EDUBRIDGE_API_KEY

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      proxy: {
        '/api': {
          target: env.EDUBRIDGE_API_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiKey) proxyReq.setHeader('X-API-Key', apiKey)
            })
          },
        },
      },
    },
  }
})
