import fs from 'node:fs'
import path from 'node:path'

export const CURRENT_PATH = '.iloveskill/current.json'
export const PENDING_PATH = '.iloveskill/pending-deploys.json'

function filePath(relPath, baseDir) {
  return path.join(baseDir, relPath)
}

function ensureParentDir(absPath) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
}

export function readCurrent(baseDir = process.cwd()) {
  const abs = filePath(CURRENT_PATH, baseDir)
  if (!fs.existsSync(abs)) return null
  return JSON.parse(fs.readFileSync(abs, 'utf8'))
}

export function writeCurrent({ ideaId, ideaTitle, planPath }, baseDir = process.cwd()) {
  const abs = filePath(CURRENT_PATH, baseDir)
  ensureParentDir(abs)
  const data = { ideaId, ideaTitle, planPath }
  fs.writeFileSync(abs, JSON.stringify(data, null, 2))
  return data
}

export function clearCurrent(baseDir = process.cwd()) {
  const abs = filePath(CURRENT_PATH, baseDir)
  if (fs.existsSync(abs)) fs.unlinkSync(abs)
}

export function readPending(baseDir = process.cwd()) {
  const abs = filePath(PENDING_PATH, baseDir)
  if (!fs.existsSync(abs)) return { commands: [] }
  return JSON.parse(fs.readFileSync(abs, 'utf8'))
}

export function enqueuePending(command, baseDir = process.cwd()) {
  const pending = readPending(baseDir)
  pending.commands.push(command)
  const abs = filePath(PENDING_PATH, baseDir)
  ensureParentDir(abs)
  fs.writeFileSync(abs, JSON.stringify(pending, null, 2))
  return pending
}

export function clearPending(baseDir = process.cwd()) {
  const abs = filePath(PENDING_PATH, baseDir)
  ensureParentDir(abs)
  fs.writeFileSync(abs, JSON.stringify({ commands: [] }, null, 2))
}
