// Announcement-derived checklist items per project (round 1 / 2), from the cache of scripts/fetchAnnouncements.mjs.
//   node scripts/fetchAnnouncements.mjs && node scripts/buildAnnouncementChecklists.mjs
// -> public/data/checklist/announcements/<universityId>.json  { u, at, docs: [{ url, at, groups }], map: { "<programId>:<projectKey>": docIndex } }
//    public/data/checklist/announcements/manifest.json (coverage) and docs/plans/<date>-checklist-announcement-coverage.md
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { htmlToText, extractAnnouncement, isSpecificPage } from '../src/os/announcementExtract.js'
import { execFileSync } from 'node:child_process'
import { SRC, CACHE, urlKey, collectPdfLinks } from './fetchAnnouncements.mjs'

const OUT = 'public/data/checklist/announcements'

async function main() {
  const idx = JSON.parse(await readFile(path.join(CACHE, 'index.json'), 'utf8'))
  const shards = []
  for (const f of await readdir(SRC)) if (f !== 'manifest.json' && f.endsWith('.json')) shards.push(JSON.parse(await readFile(path.join(SRC, f), 'utf8')))
  const usage = new Map()
  for (const u of shards) for (const pr of u.programs) for (const p of pr.j) if (p.r <= 2 && p.l) for (const x of p.l.split(/\s+/).filter((s) => /^https?:\/\//i.test(s))) usage.set(x, (usage.get(x) ?? 0) + 1)

  // PDF text via poppler's pdftotext (scanned PDFs give no text -> counted as 'no clear items').
  const pdfText = (url) => {
    const e = idx[url]
    if (e?.status !== 'ok' || e.ext !== 'pdf') return ''
    const src = path.join(CACHE, `${urlKey(url)}.pdf`); const txt = `${src}.txt`
    if (!existsSync(txt)) { try { execFileSync('pdftotext', [src, txt], { stdio: 'ignore', timeout: 60000 }) } catch { return '' } }
    const t = existsSync(txt) ? readFileSync(txt, 'utf8') : ''
    return (t.match(/�/g) ?? []).length > t.length * 0.002 ? '' : t   // garbled font encoding -> unreadable, skip
  }
  const pdfLinks = await collectPdfLinks(usage)
  const extracted = new Map()   // url -> { groups } | null
  const reason = new Map()      // url -> why not
  for (const [url, n] of usage) {
    const e = idx[url]
    if (!e) { reason.set(url, 'ไม่ได้ดึง'); continue }
    if (e.status === 'robots') { reason.set(url, 'robots.txt ไม่อนุญาต'); continue }
    if (e.status !== 'ok') { reason.set(url, e.status === 'http' ? `เว็บตอบ HTTP ${e.http}` : 'เข้าเว็บไม่ได้'); continue }
    if (!isSpecificPage(url, n)) { reason.set(url, 'ลิงก์เป็นหน้าแรก/พอร์ทัลที่ใช้ร่วมหลายโครงการ'); continue }
    const html = await readFile(path.join(CACHE, `${urlKey(url)}.html`), 'utf8')
    const pdfs = (pdfLinks.get(url) ?? []).filter((x) => pdfText(x))
    // the announcement PDF first (it is the official text), then the page itself
    const sources = [...pdfs.map((x) => ({ text: pdfText(x), url: x })), { text: htmlToText(html), url }]
    let ex = null
    for (const sct of sources) { ex = extractAnnouncement(sct.text); if (ex) { ex.src = sct.url; break } }
    if (ex) extracted.set(url, { ...ex, at: e.at }); else reason.set(url, 'หน้าไม่มีรายการที่ระบุชัด (หรือโหลดด้วย JavaScript/เป็นไฟล์แนบ)')
  }

  await mkdir(OUT, { recursive: true })
  for (const f of await readdir(OUT)) if (f.endsWith('.json')) await unlink(path.join(OUT, f))
  const manifest = { builtAt: new Date().toISOString().slice(0, 10), universities: [] }
  const total = { projects: 0, derived: 0, nolink: 0, portal: 0, unreachable: 0, empty: 0 }
  for (const u of shards) {
    const docs = []; const docOf = new Map(); const map = {}
    const c = { id: u.id, name: u.name, projects: 0, derived: 0, nolink: 0, portal: 0, unreachable: 0, empty: 0 }
    for (const pr of u.programs) for (const p of pr.j) {
      if (p.r > 2) continue
      c.projects++
      const urls = p.l ? p.l.split(/\s+/).filter((s) => /^https?:\/\//i.test(s)) : []
      if (!urls.length) { c.nolink++; continue }
      const hit = urls.find((x) => extracted.has(x))
      if (hit) {
        if (!docOf.has(hit)) { docOf.set(hit, docs.length); const ex = extracted.get(hit); docs.push({ url: hit, ...(ex.src !== hit ? { src: ex.src } : {}), at: ex.at, groups: ex.groups }) }
        map[`${pr.p}:${p.k}`] = docOf.get(hit); c.derived++; continue
      }
      const why = reason.get(urls[0]) ?? ''
      if (/พอร์ทัล/.test(why)) c.portal++; else if (/ไม่มีรายการ/.test(why)) c.empty++; else c.unreachable++
    }
    for (const k of Object.keys(total)) total[k] += c[k] ?? 0
    manifest.universities.push(c)
    if (docs.length) await writeFile(path.join(OUT, `${u.id}.json`), JSON.stringify({ u: u.id, at: manifest.builtAt, docs, map }))
  }
  manifest.total = total
  manifest.pages = { distinctUrls: usage.size, extracted: extracted.size }
  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest))

  const pct = (a) => (total.projects ? `${((a / total.projects) * 100).toFixed(1)}%` : '-')
  const md = [
    `# รายงานความครอบคลุม: รายการเช็กลิสต์จากประกาศจริง (${manifest.builtAt})`, '',
    'สร้างโดย `scripts/fetchAnnouncements.mjs` + `scripts/buildAnnouncementChecklists.mjs` (ข้อความต้นทางเก็บใน `.cache/` ไม่ commit) รอบ 1-2 เท่านั้น', '',
    '## สรุป', '',
    `- โครงการรอบ 1-2 ทั้งหมด: ${total.projects}`,
    `- URL ประกาศที่ต่างกัน: ${usage.size} (สกัดรายการได้จาก ${extracted.size} หน้า)`,
    `- ได้รายการจากประกาศ: **${total.derived}** (${pct(total.derived)})`,
    `- ไม่มีลิงก์ประกาศใน MyTCAS: ${total.nolink} (${pct(total.nolink)})`,
    `- ลิงก์เป็นหน้าแรก/พอร์ทัลรวม ไม่ชี้ประกาศของโครงการ: ${total.portal} (${pct(total.portal)})`,
    `- เข้าเว็บไม่ได้ / robots ไม่อนุญาต / HTTP ผิดปกติ: ${total.unreachable} (${pct(total.unreachable)})`,
    `- หน้าไม่มีรายการที่ระบุชัด (โหลดด้วย JavaScript, PDF/รูปแนบ, ข้อความไม่เป็นรายการ): ${total.empty} (${pct(total.empty)})`, '',
    'ข้อสังเกต: ไม่มี URL ใดใน MyTCAS ที่ชี้ไฟล์ PDF ประกาศโดยตรง ส่วนใหญ่เป็นหน้าแรกของเว็บรับสมัคร จึงสกัดเป็นรายโครงการไม่ได้ และไม่ได้เดา เอกสารที่ไม่ได้รายการจากประกาศยังใช้รายการทั่วไปของรอบ + ข้อมูล MyTCAS ตามเดิม', '',
    '## รายมหาวิทยาลัย', '',
    '| รหัส | มหาวิทยาลัย | โครงการ | ได้จากประกาศ | ไม่มีลิงก์ | พอร์ทัล | เข้าไม่ได้ | ไม่พบรายการ |', '|---|---|---:|---:|---:|---:|---:|---:|',
    ...manifest.universities.map((c) => `| ${c.id} | ${c.name} | ${c.projects} | ${c.derived} | ${c.nolink} | ${c.portal} | ${c.unreachable} | ${c.empty} |`), '',
  ].join('\n')
  await mkdir('docs/plans', { recursive: true })
  await writeFile(`docs/plans/${manifest.builtAt}-checklist-announcement-coverage.md`, md)
  console.log(JSON.stringify(total), 'pages', extracted.size, '/', usage.size)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
