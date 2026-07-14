import fs from 'node:fs'
import path from 'node:path'

export const CURRENT_PATH = '.iloveskill/current.json'
export const PENDING_PATH = '.iloveskill/pending-deploys.json'
export const QUEUE_PATH = '.iloveskill/queue.json'
export const SIGNAL_PATH = '.iloveskill/task-done.json'

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

export function readQueue(baseDir = process.cwd()) {
  const abs = filePath(QUEUE_PATH, baseDir)
  if (!fs.existsSync(abs)) return { items: [] }
  return JSON.parse(fs.readFileSync(abs, 'utf8'))
}

function writeQueue(queue, baseDir) {
  const abs = filePath(QUEUE_PATH, baseDir)
  ensureParentDir(abs)
  fs.writeFileSync(abs, JSON.stringify(queue, null, 2))
  return queue
}

export function enqueueIdea({ ideaId, ideaTitle, planPath }, baseDir = process.cwd()) {
  const queue = readQueue(baseDir)
  queue.items.push({ ideaId, ideaTitle, planPath })
  return writeQueue(queue, baseDir)
}

export function dequeueNext(baseDir = process.cwd()) {
  const queue = readQueue(baseDir)
  if (queue.items.length === 0) return null
  const [next, ...rest] = queue.items
  writeQueue({ items: rest }, baseDir)
  return next
}

export function readSignal(baseDir = process.cwd()) {
  const abs = filePath(SIGNAL_PATH, baseDir)
  if (!fs.existsSync(abs)) return null
  return JSON.parse(fs.readFileSync(abs, 'utf8'))
}

export function writeSignal({ completed, finishedAt }, baseDir = process.cwd()) {
  const abs = filePath(SIGNAL_PATH, baseDir)
  ensureParentDir(abs)
  const data = { completed, finishedAt }
  fs.writeFileSync(abs, JSON.stringify(data, null, 2))
  return data
}

export function clearSignal(baseDir = process.cwd()) {
  const abs = filePath(SIGNAL_PATH, baseDir)
  if (fs.existsSync(abs)) fs.unlinkSync(abs)
}
