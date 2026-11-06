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
        const [path, search = ''] = req.url.split('?')
        if (path !== '/api/camphub' || req.method !== 'GET') return next()
        try {
          const { default: handler } = await import('./api/camphub.js')
          // camphub.js reads req.query; vite doesn't populate it in dev.
          req.query = Object.fromEntries(new URLSearchParams(search))
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

// Dev-only: serves /api/voice/* from api/_voice with an IN-MEMORY store (no Firebase, no Retell,
// always mock mode). The Firebase ID token is decoded WITHOUT verification here — dev only.
function voiceApiPlugin() {
  let handlerPromise = null
  const getHandler = () => (handlerPromise ||= (async () => {
    const [{ createVoiceHandler }, { createMemoryStore }, retell] = await Promise.all([
      import('./api/_voice/handler.js'), import('./api/_voice/store.js'), import('./api/_voice/retell.js'),
    ])
    const store = createMemoryStore()
    store.verifyToken = async (t) => {
      const payload = JSON.parse(Buffer.from(t.split('.')[1] || '', 'base64url').toString() || '{}')
      if (!payload.user_id && !payload.sub) throw new Error('bad token')
      return payload.user_id || payload.sub
    }
    return createVoiceHandler({ store, retell, env: { NODE_ENV: 'development' } })
  })())
  return {
    name: 'voice-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const [path, search = ''] = req.url.split('?')
        const m = /^\/api\/voice\/([a-z-]+)$/.exec(path)
        if (!m) return next()
        try {
          const chunks = []
          for await (const c of req) chunks.push(c)
          const raw = Buffer.concat(chunks).toString()
          req.body = raw ? JSON.parse(raw) : {}
          req.query = { ...Object.fromEntries(new URLSearchParams(search)), action: m[1] }
          const mockRes = {
            _code: 200,
            status(code) { this._code = code; return this },
            setHeader(k, v) { res.setHeader(k, v) },
            json(data) {
              res.writeHead(this._code, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(data))
            },
          }
          await (await getHandler())(req, mockRes)
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
  plugins: [react(), tailwindcss(), camphubApiPlugin(), mytcasApiPlugin(), voiceApiPlugin()],
})
