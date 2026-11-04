// Client side of the content Studio. Drafts are written straight to Firestore
// (creator-only rules); going live always goes through the publish callables, so a
// half-edited draft can never reach the public site.
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { cols, refs } from '../lib/db'
import { EMPTY_DOC } from '../content/renderBody'

// Fields only the server may change. Stripped from every save so an autosave
// carrying stale state can never be rejected by (or fight with) the rules.
const SERVER_OWNED = ['authorUid', 'publishedSlug', 'publishedAt', 'isLive', 'liveUpdatedAt', 'createdAt']

export class PublishError extends Error {
  constructor(message, errors) {
    super(message)
    this.name = 'PublishError'
    this.errors = errors
  }
}

export async function createDraft(uid, authorName) {
  const ref = doc(cols.articleDrafts)
  await setDoc(refs.articleDraft(ref.id), {
    authorUid: uid,
    authorName: authorName ?? '',
    title: '',
    slug: '',
    category: 'guide',
    excerpt: '',
    tags: [],
    coverUrl: '',
    coverAlt: '',
    body: JSON.stringify(EMPTY_DOC),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function saveDraft(draftId, patch) {
  const data = { ...patch }
  for (const key of SERVER_OWNED) delete data[key]
  await updateDoc(refs.articleDraft(draftId), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteDraft(draftId) {
  await deleteDoc(refs.articleDraft(draftId))
}

const call = async (name, payload) => (await httpsCallable(getFunctions(), name)(payload)).data

export async function publishArticle(draftId) {
  try {
    return await call('publishArticle', { draftId })
  } catch (err) {
    const errors = err?.details?.errors
    if (Array.isArray(errors)) throw new PublishError(err.message, errors)
    throw err
  }
}

export const unpublishArticle = (slug) => call('unpublishArticle', { slug })
