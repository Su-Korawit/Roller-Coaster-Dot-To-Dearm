import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only middleware that runs api/camphub.js directly inside vite dev server.
// In production, Vercel routes /api/camphub to the real serverless function.
function camphubApiPlugin() {
  return {
    name: 'camphub-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/camphub' || req.method !== 'GET') return next()
        try {
          const { default: handler } = await import('./api/camphub.js')
          const mockRes = {
            _code: 200,
            status(code) { this._code = code; return this },
            setHeader(k, v) { res.setHeader(k, v) },
            json(data) {
              res.writeHead(this._code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
              res.end(JSON.stringify(data))
            },
          }
          await handler(req, mockRes)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), camphubApiPlugin()],
})
