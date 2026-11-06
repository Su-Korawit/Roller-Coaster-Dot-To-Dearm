// Pure helpers for Store app reviews (1 review per user per app).

export const MAX_REVIEW_TEXT = 500

export const reviewId = (appId, uid) => `${appId}_${uid}`

// { count, average (1 decimal, 0 when none), histogram: { 5: n, 4: n, ... 1: n } }
export function summarizeReviews(reviews = []) {
  const histogram = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let sum = 0
  let count = 0
  for (const r of reviews) {
    if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) continue
    histogram[r.rating] += 1
    sum += r.rating
    count += 1
  }
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : 0, histogram }
}

// Returns an error message (Thai) or null when valid.
export function validateReview({ rating, text = '' }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'กรุณาให้ดาว 1-5'
  if (text.length > MAX_REVIEW_TEXT) return `ความเห็นยาวเกิน ${MAX_REVIEW_TEXT} ตัวอักษร`
  return null
}

// Newest first. `createdAt` may be a Firestore Timestamp, a number or missing (just written).
export function sortReviews(reviews = []) {
  const ms = (r) => r.updatedAt?.toMillis?.() ?? (typeof r.updatedAt === 'number' ? r.updatedAt : Number.MAX_SAFE_INTEGER)
  return [...reviews].sort((a, b) => ms(b) - ms(a))
}
