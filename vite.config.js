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

// Dev-only middleware that runs api/mytcas.js directly inside vite dev server.
// In production, Vercel routes /api/mytcas to the real serverless function.
function mytcasApiPlugin() {
  return {
    name: 'mytcas-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const [path, search = ''] = req.url.split('?')
        if (path !== '/api/mytcas') return next()
        try {
          const { default: handler } = await import('./api/mytcas.js')
          // mytcas.js reads req.query; vite doesn't populate it in dev.
          req.query = Object.fromEntries(new URLSearchParams(search))
          const mockRes = {
            _code: 200,
            status(code) { this._code = code; return this },
            setHeader(k, v) { res.setHeader(k, v) },
            json(data) {
              res.writeHead(this._code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
              res.end(JSON.stringify(data))
            },
            end() { res.writeHead(this._code); res.end() },
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
  plugins: [react(), tailwindcss(), camphubApiPlugin(), mytcasApiPlugin()],
})
