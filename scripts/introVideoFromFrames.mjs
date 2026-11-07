// Builds the cutscene videos from the generated picture frames (public/assets/os/intro/<id>-<n>.webp):
// slow push-in on each frame + crossfades, over a blurred copy of the frame (same look as the picture
// mode). Writes <id>-wide.mp4 (960x540) and <id>-tall.mp4 (540x960). Not AI video: a stopgap until a
// real generated clip exists (then use scripts/introVideo.mjs). Needs ffmpeg on PATH.
// Usage: node scripts/introVideoFromFrames.mjs [goal habit community]
import { execFileSync } from 'node:child_process'
import { mkdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { INTRO_FRAMES } from '../src/os/intro/introLogic.js'

const FPS = 24
const SEG = 4        // seconds each frame stays (including its fade-in)
const FADE = 0.7
const dir = path.resolve('public/assets/os/intro')
mkdirSync(dir, { recursive: true })
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(INTRO_FRAMES)

// Fit box of a frame inside W x H (even numbers, so the encoder is happy).
const even = (n) => Math.max(2, Math.round(n / 2) * 2)
function fit(w, h, W, H) {
  const k = Math.min(W / w, H / h)
  return { w: even(w * k * 0.96), h: even(h * k * 0.96) }   // 4% margin so the push-in never touches the edge
}

function graph(n, W, H, dims) {
  const parts = []
  const frames = SEG * FPS
  for (let i = 0; i < n; i++) {
    const f = fit(dims[i].w, dims[i].h, W, H)
    parts.push(`[${i}:v]split=2[a${i}][b${i}]`)
    parts.push(`[a${i}]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=24:2,zoompan=z=1:d=${frames}:s=${W}x${H}:fps=${FPS}[bg${i}]`)
    // Slow push-in 1.00 → 1.07 on the sharp frame, centred.
    parts.push(`[b${i}]scale=${f.w * 2}:${f.h * 2},zoompan=z='min(1+0.07*on/${frames},1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${f.w}x${f.h}:fps=${FPS}[fg${i}]`)
    parts.push(`[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v${i}]`)
  }
  let last = 'v0'
  for (let i = 1; i < n; i++) {
    const out = i === n - 1 ? 'out' : `x${i}`
    parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${(i * (SEG - FADE)).toFixed(2)}[${out}]`)
    last = out
  }
  if (n === 1) parts.push('[v0]null[out]')
  return parts.join(';\n')
}

const tmp = mkdtempSync(path.join(tmpdir(), 'introvid-'))
try {
  for (const id of ids) {
    const n = INTRO_FRAMES[id]
    if (!n) { console.error(`no frames registered for "${id}" in INTRO_FRAMES`); process.exit(1) }
    const files = Array.from({ length: n }, (_, i) => path.join(dir, `${id}-${i + 1}.webp`))
    const dims = await Promise.all(files.map(async (f) => { const m = await sharp(f).metadata(); return { w: m.width, h: m.height } }))
    for (const [kind, W, H] of [['wide', 960, 540], ['tall', 540, 960]]) {
      const script = path.join(tmp, `${id}-${kind}.txt`)
      writeFileSync(script, graph(n, W, H, dims))
      const out = path.join(dir, `${id}-${kind}.mp4`)
      const inputs = files.flatMap((f) => ['-i', f])
      execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-/filter_complex', script, '-map', '[out]',
        '-an', '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', out])
      const secs = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim()
      console.log(`${path.relative(process.cwd(), out)}  ${(statSync(out).size / 1024).toFixed(0)} KB  ${Number(secs).toFixed(1)} s`)
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
