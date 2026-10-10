import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Same-origin public feed: avoids browser restrictions at the upstream edge.
// @ts-ignore The small Node fetch helper is also used by the scheduled build.
import { loadDeskFeed } from './scripts/ai-desk-source.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), {
    name: 'local-ai-desk',
    configureServer(server) {
      server.middlewares.use('/data/ai-desk.json', async (_request, response) => {
        try {
          const snapshot = await loadDeskFeed()
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-cache')
          response.end(JSON.stringify(snapshot))
        } catch {
          response.statusCode = 503
          response.setHeader('Retry-After', '1800')
          response.end(JSON.stringify({ error: 'Daily feed temporarily unavailable' }))
        }
      })
    },
  }],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
})
