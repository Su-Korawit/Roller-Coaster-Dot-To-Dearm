// Turns a generated cutscene video into the two web files the OS plays (responsive):
//   public/assets/os/intro/<id>-wide.mp4   16:9-ish screens (desktop / landscape tablet)
//   public/assets/os/intro/<id>-tall.mp4   portrait phones
// Usage:  node scripts/introVideo.mjs <id> <wide-source> [<tall-source>]
// With one source the tall version is built from it: the clip fitted inside a 9:16 frame over a
// blurred copy of itself (same look as the picture frames). Then add the id to INTRO_VIDEOS in
// src/os/intro/introLogic.js. Needs ffmpeg on PATH. No audio, H.264, faststart, small (~1-2 MB).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'

const [id, wide, tall] = process.argv.slice(2)
if (!id || !wide || !/^[a-z]+$/.test(id) || !existsSync(wide) || (tall && !existsSync(tall))) {
  console.error('usage: node scripts/introVideo.mjs <id> <wide-source> [<tall-source>]')
  process.exit(1)
}
const outDir = path.resolve('public/assets/os/intro')
mkdirSync(outDir, { recursive: true })

const base = ['-y', '-hide_banner', '-loglevel', 'error']
const enc = ['-an', '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '29', '-preset', 'slow', '-movflags', '+faststart']

// 960 wide, even height, 24 fps.
execFileSync('ffmpeg', [...base, '-i', wide, '-vf', 'scale=960:-2:flags=lanczos,fps=24', ...enc, path.join(outDir, `${id}-wide.mp4`)])

if (tall) {
  execFileSync('ffmpeg', [...base, '-i', tall, '-vf', 'scale=540:960:force_original_aspect_ratio=increase,crop=540:960,fps=24', ...enc, path.join(outDir, `${id}-tall.mp4`)])
} else {
  const graph = '[0:v]split=2[a][b];[a]scale=540:960:force_original_aspect_ratio=increase,crop=540:960,boxblur=24:2[bg];[b]scale=540:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=24'
  execFileSync('ffmpeg', [...base, '-i', wide, '-filter_complex', graph, ...enc, path.join(outDir, `${id}-tall.mp4`)])
}

for (const kind of ['wide', 'tall']) {
  const file = path.join(outDir, `${id}-${kind}.mp4`)
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim()
  console.log(`${path.relative(process.cwd(), file)}  ${(statSync(file).size / 1024).toFixed(0)} KB  ${Number(dur).toFixed(1)} s`)
}
console.log(`Next: add "${id}" to INTRO_VIDEOS in src/os/intro/introLogic.js`)
