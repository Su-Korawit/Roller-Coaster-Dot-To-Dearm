// Polite fetch of every distinct announcement URL used by round 1/2 projects -> .cache/announcements (never committed).
//   node scripts/fetchAnnouncements.mjs   (resumable; CONCURRENCY default 3, per-host spacing 1s)
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isSpecificPage } from '../src/os/announcementExtract.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SRC = 'public/data/checklist/projects'
export const CACHE = process.env.ANN_CACHE || path.join('.cache', 'announcements')
export const urlKey = (u) => createHash('sha1').update(u).digest('hex').slice(0, 16)

export async function collectUrls() {
  const m = new Map()
  for (const f of await readdir(SRC)) {
    if (f === 'manifest.json') continue
    const u = JSON.parse(await readFile(path.join(SRC, f), 'utf8'))
    for (const pr of u.programs) for (const p of pr.j) {
      if (p.r > 2 || !p.l) continue
      for (const x of p.l.split(/\s+/).filter((s) => /^https?:\/\//i.test(s))) m.set(x, (m.get(x) ?? 0) + 1)
    }
  }
  return m
}

// PDFs linked from a page that is specific to a few projects and links at most 3 PDFs (so the PDF is clearly that page's announcement).
export async function collectPdfLinks(usage) {
  const out = new Map()
  for (const [u, n] of usage) {
    if (!isSpecificPage(u, n)) continue
    const f = path.join(CACHE, `${urlKey(u)}.html`)
    if (!existsSync(f)) continue
    const links = new Set()
    for (const m of (await readFile(f, 'utf8')).matchAll(/href=["']([^"']+\.pdf[^"']*)["']/gi)) { try { links.add(new URL(m[1].replace(/&amp;/g, '&'), u).href) } catch { /* bad href */ } }
    if (links.size && links.size <= 3) out.set(u, [...links])
  }
  return out
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const lastHit = new Map()
async function polite(host) {
  const wait = (lastHit.get(host) ?? 0) + 1000 - Date.now()
  lastHit.set(host, Math.max(Date.now(), (lastHit.get(host) ?? 0) + 1000))
  if (wait > 0) await sleep(wait)
}
const robotsCache = new Map()
async function allowed(u) {
  const { origin, pathname } = new URL(u)
  if (!robotsCache.has(origin)) {
    robotsCache.set(origin, (async () => {
      try {
        const r = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(10000) })
        if (!r.ok) return []
        const rules = []; let on = false
        for (const line of (await r.text()).split(/\r?\n/)) {
          const [k, ...v] = line.split(':'); const val = v.join(':').trim()
          if (/^user-agent$/i.test(k.trim())) on = val === '*'
          else if (on && /^disallow$/i.test(k.trim()) && val) rules.push(val)
        }
        return rules
      } catch { return [] }
    })())
  }
  return !(await robotsCache.get(origin)).some((r) => pathname.startsWith(r))
}

async function fetchOne(u) {
  const meta = { url: u, at: new Date().toISOString().slice(0, 10) }
  try {
    if (!(await allowed(u))) return { ...meta, status: 'robots' }
    await polite(new URL(u).host)
    const res = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': 'ILoveTCAS-checklist/1.0 (student checklist; polite)', 'Accept-Language': 'th,en;q=0.5' }, signal: AbortSignal.timeout(25000) })
    const type = res.headers.get('content-type') ?? ''
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 15e6) return { ...meta, status: 'toolarge', http: res.status }
    const ext = /pdf/i.test(type) ? 'pdf' : /html|text/i.test(type) ? 'html' : 'bin'
    await writeFile(path.join(CACHE, `${urlKey(u)}.${ext}`), buf)
    return { ...meta, status: res.ok ? 'ok' : 'http', http: res.status, type, ext, bytes: buf.length, final: res.url }
  } catch (e) { return { ...meta, status: 'error', error: String(e.cause?.code ?? e.message).slice(0, 80) } }
}

async function main() {
  await mkdir(CACHE, { recursive: true })
  const idxFile = path.join(CACHE, 'index.json')
  const idx = existsSync(idxFile) ? JSON.parse(await readFile(idxFile, 'utf8')) : {}
  const usage = await collectUrls()
  let i = 0
  const run = async (urls) => {
    console.log('to fetch', urls.length)
    await Promise.all(Array.from({ length: Number(process.env.CONCURRENCY || 3) }, async () => {
      while (urls.length) {
        const u = urls.shift(); idx[u] = await fetchOne(u)
        if (++i % 20 === 0) { console.log(i); await writeFile(idxFile, JSON.stringify(idx)) }
      }
    }))
  }
  await run([...usage.keys()].filter((u) => !idx[u]))
  await run([...new Set([...(await collectPdfLinks(usage)).values()].flat())].filter((u) => !idx[u]))
  await writeFile(idxFile, JSON.stringify(idx))
  const c = {}; for (const e of Object.values(idx)) c[e.status + (e.ext ? ':' + e.ext : '')] = (c[e.status + (e.ext ? ':' + e.ext : '')] ?? 0) + 1
  console.log(c)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
