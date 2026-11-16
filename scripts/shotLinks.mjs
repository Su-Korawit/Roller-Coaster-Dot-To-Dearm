// Take a phone-size screenshot of each Store website (headless Chrome) -> public/assets/os/shots/<id>-1.webp
// Usage: node scripts/shotLinks.mjs [id ...]   (no ids = every link app in storeLinks.js)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
// links.json = [{id,url}] dumped from STORE_LINKS (see lv notes); path in argv env LINKS
const STORE_LINKS = JSON.parse(readFileSync(process.env.LINKS, 'utf8'))

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'public/assets/os/shots'
mkdirSync(OUT, { recursive: true })
const only = process.argv.slice(2)
const tmp = join(tmpdir(), 'rcd2d-shots')
mkdirSync(tmp, { recursive: true })
for (const l of STORE_LINKS) {
  if (only.length && !only.includes(l.id)) continue
  const png = join(tmp, `${l.id}.png`)
  try {
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=5000', '--window-size=390,780', `--screenshot=${png}`, l.url], { timeout: 90000, stdio: 'ignore' })
    if (!existsSync(png)) throw new Error('no file')
    await sharp(png).resize({ height: 624 }).webp({ quality: 72 }).toFile(`${OUT}/${l.id}-1.webp`)
    rmSync(png)
    console.log('ok  ', l.id)
  } catch (e) { console.log('FAIL', l.id, e.message) }
}
