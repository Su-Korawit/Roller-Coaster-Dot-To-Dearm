// Pure logic for the Community feed — no React, no Firestore.

export const MAX_POST = 500
export const MAX_IMAGE_URL = 300

export const likeId = (postId, uid) => `${postId}_${uid}`

// Returns an error message (Thai) or null.
export function validatePost({ text = '', imageUrl = '' }) {
  const t = String(text).trim()
  if (!t) return 'พิมพ์ข้อความก่อนโพสต์'
  if (t.length > MAX_POST) return `ข้อความยาวเกิน ${MAX_POST} ตัวอักษร`
  const u = String(imageUrl).trim()
  if (u && !/^https:\/\/\S+$/.test(u)) return 'ลิงก์รูปต้องขึ้นต้นด้วย https://'
  if (u.length > MAX_IMAGE_URL) return 'ลิงก์รูปยาวเกินไป'
  return null
}

export const cleanPost = ({ text = '', imageUrl = '' }) => ({ text: String(text).trim(), imageUrl: String(imageUrl).trim() })

// 'all' | 'text' (no picture) | 'media' (has a picture)
export function filterFeed(posts, kind = 'all') {
  if (kind === 'text') return posts.filter((p) => !p.imageUrl)
  if (kind === 'media') return posts.filter((p) => !!p.imageUrl)
  return posts
}

// Case-insensitive match on text or author name.
export function searchFeed(posts, query = '') {
  const q = query.trim().toLowerCase()
  return q ? posts.filter((p) => p.text.toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q)) : posts
}

const ms = (p) => p.createdAtMs ?? p.createdAt?.toMillis?.() ?? 0

// "Algorithm" feed: likes lift a post, age pulls it down (half-life ~12 h). Newest first on ties.
export function rankFeed(posts, likeCounts = {}, now = Date.now()) {
  const score = (p) => {
    const ageH = Math.max(0, (now - ms(p)) / 3600000)
    return (1 + 3 * (likeCounts[p.id] ?? 0)) * 0.5 ** (ageH / 12)
  }
  return [...posts].sort((a, b) => score(b) - score(a) || ms(b) - ms(a))
}

// { postId: count }
export function countLikes(likes) {
  const map = {}
  for (const l of likes) map[l.postId] = (map[l.postId] ?? 0) + 1
  return map
}

// Totals for a profile page.
export function profileStats(posts, uid, likeCounts = {}) {
  const mine = posts.filter((p) => p.uid === uid)
  return { posts: mine.length, likes: mine.reduce((a, p) => a + (likeCounts[p.id] ?? 0), 0) }
}
