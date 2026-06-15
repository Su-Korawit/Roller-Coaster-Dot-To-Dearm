// One-time (idempotent) uploader: pushes local assets into Firebase Storage at
// the path scheme the app resolves from. Re-running only re-uploads files whose
// bytes changed (md5 compared against the remote object's md5Hash).
//
// Setup:
//   npm i -D firebase-admin
//   Download a service-account key from the Firebase console
//   (Project settings → Service accounts → Generate new private key),
//   then point at it (the file MUST stay out of git):
//     GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run upload-assets
//
// Bucket defaults to the project's Storage bucket; override with
// FIREBASE_STORAGE_BUCKET if needed.

import { createHash, randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

import { GAME_ASSETS } from '../src/game/assetManifest.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'rollercoasterdottodream.firebasestorage.app'

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
}

function contentTypeFor(file) {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
}

// Game sprites/maps live under public/; localPath is the public URL, so the
// on-disk source is `public` + that path.
function gameAssetJobs() {
  return GAME_ASSETS.map((a) => ({
    local: path.join(ROOT, 'public', a.localPath),
    dest: a.storagePath,
  }))
}

async function dirJobs(localDir, destPrefix) {
  const abs = path.join(ROOT, localDir)
  if (!existsSync(abs)) return []
  const files = await readdir(abs)
  return files.map((f) => ({ local: path.join(abs, f), dest: `${destPrefix}/${f}` }))
}

async function mediaJobs() {
  const jobs = [
    {
      local: path.join(ROOT, 'assets/eachPageAssets/home/Background_Music_1.mp3'),
      dest: 'media/audio/Background_Music_1.mp3',
    },
    ...(await dirJobs('assets/eachPageAssets/home/Background', 'media/video/home')),
    ...(await dirJobs('assets/eachPageAssets/page4/University', 'media/university')),
  ]
  // Only .mp4 from the Background dir (it also holds .png/.mp3 fallbacks).
  return jobs.filter((j) => {
    if (j.dest.startsWith('media/video/home/')) return j.dest.endsWith('.mp4')
    return true
  })
}

async function main() {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: BUCKET,
  })
  const bucket = admin.storage().bucket()

  const jobs = [...gameAssetJobs(), ...(await mediaJobs())]
  let uploaded = 0
  let skipped = 0
  let missing = 0

  for (const job of jobs) {
    if (!existsSync(job.local)) {
      console.warn('  MISSING (skip):', path.relative(ROOT, job.local))
      missing++
      continue
    }

    const bytes = await readFile(job.local)
    const localMd5 = createHash('md5').update(bytes).digest('base64')
    const remote = bucket.file(job.dest)

    let remoteMd5 = null
    let remoteHasToken = false
    try {
      const [meta] = await remote.getMetadata()
      remoteMd5 = meta.md5Hash
      remoteHasToken = !!meta.metadata?.firebaseStorageDownloadTokens
    } catch {
      // not uploaded yet
    }

    // Skip only when bytes match AND the remote object already has a download
    // token. Files uploaded before the token fix have matching md5 but no token,
    // so getDownloadURL() 500s on them forever — force a re-upload to heal them.
    if (remoteMd5 === localMd5 && remoteHasToken) {
      skipped++
      continue
    }

    await bucket.upload(job.local, {
      destination: job.dest,
      metadata: {
        contentType: contentTypeFor(job.local),
        cacheControl: 'public, max-age=3600',
        metadata: {
          // Required for Firebase getDownloadURL() to work in production.
          // Without this token the signed URL returns HTTP 500 on ?alt=media.
          firebaseStorageDownloadTokens: randomUUID(),
        },
      },
    })
    console.log('  uploaded:', job.dest)
    uploaded++
  }

  console.log(`\nDone → uploaded ${uploaded}, skipped ${skipped}, missing ${missing} (bucket: ${BUCKET})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
