// IR Board CLI — list ideas, read subtrees, append reports, update status.
//
// Setup:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/irReport.mjs <cmd> ...

import admin from 'firebase-admin'
import { pathToFileURL } from 'node:url'
import { IR_SHEET_ID } from '../src/constants/irBoard.js'
import { ADMIN_UID } from '../src/constants/admin.js'
import {
  listIdeas,
  collectIdeaSubtree,
  setIdeaStatus,
  appendReportNode,
} from '../src/lib/irBoard.js'
import { parseArgs, formatIdeaRead } from './irReportLib.mjs'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rollercoasterdottodream'

function requireCredentials() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Error: set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json')
    process.exit(1)
  }
}

function initAdmin() {
  requireCredentials()
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  })
  return admin.firestore()
}

const docRef = (db) => db.doc(`roadmapSheets/${IR_SHEET_ID}`)

async function loadBoard(db) {
  const snap = await docRef(db).get()
  if (!snap.exists) {
    throw new Error('IR Board missing — run: node scripts/irReport.mjs ensure')
  }
  return snap.data()
}

async function saveBoard(db, data) {
  await docRef(db).set(
    {
      nodes: data.nodes,
      edges: data.edges,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

async function ensureBoard(db) {
  const ref = docRef(db)
  const snap = await ref.get()
  if (snap.exists) return
  await ref.set({
    ownerUid: ADMIN_UID,
    name: 'IR Board',
    nodes: [],
    edges: [],
    order: -1,
    collaborators: {},
    collaboratorUids: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

export async function runCommand(parsed, { db } = {}) {
  const firestore = db ?? initAdmin()

  switch (parsed.command) {
    case 'ensure':
      await ensureBoard(firestore)
      return
    case 'list': {
      const board = await loadBoard(firestore)
      const ideas = listIdeas(board.nodes, { includeDone: parsed.includeDone })
      console.log(JSON.stringify(ideas))
      return
    }
    case 'read': {
      const board = await loadBoard(firestore)
      const subtree = collectIdeaSubtree(parsed.ideaId, board.nodes, board.edges)
      console.log(JSON.stringify(formatIdeaRead(subtree)))
      return
    }
    case 'set-status': {
      const board = await loadBoard(firestore)
      const nodes = setIdeaStatus(board.nodes, parsed.ideaId, parsed.status)
      await saveBoard(firestore, { nodes, edges: board.edges ?? [] })
      return
    }
    case 'append-update': {
      const board = await loadBoard(firestore)
      let { nodes, edges } = appendReportNode({
        nodes: board.nodes,
        edges: board.edges,
        ideaId: parsed.ideaId,
        type: 'update',
        summary: parsed.summary,
      })
      nodes = setIdeaStatus(nodes, parsed.ideaId, 'in-progress')
      await saveBoard(firestore, { nodes, edges })
      return
    }
    case 'append-success': {
      const board = await loadBoard(firestore)
      let { nodes, edges } = appendReportNode({
        nodes: board.nodes,
        edges: board.edges,
        ideaId: parsed.ideaId,
        type: 'success',
        summary: parsed.summary,
      })
      nodes = setIdeaStatus(nodes, parsed.ideaId, 'done')
      await saveBoard(firestore, { nodes, edges })
      return
    }
    default:
      throw new Error(`unknown command: ${parsed.command}`)
  }
}

async function main() {
  try {
    const parsed = parseArgs(process.argv)
    await runCommand(parsed)
    process.exit(0)
  } catch (err) {
    console.error(err.message ?? err)
    process.exit(1)
  }
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) main()
