import { describe, it, expect } from 'vitest'
import { summarizeReviews, validateReview, reviewId, sortReviews, MAX_REVIEW_TEXT } from './reviewsLogic'

describe('summarizeReviews', () => {
  it('handles no reviews', () => {
    expect(summarizeReviews([])).toEqual({ count: 0, average: 0, histogram: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } })
  })
  it('averages to one decimal and fills the histogram', () => {
    const s = summarizeReviews([{ rating: 5 }, { rating: 4 }, { rating: 4 }])
    expect(s.count).toBe(3)
    expect(s.average).toBe(4.3)
    expect(s.histogram[4]).toBe(2)
  })
  it('ignores invalid ratings', () => {
    expect(summarizeReviews([{ rating: 9 }, { rating: 'x' }, { rating: 2 }]).count).toBe(1)
  })
})

describe('validateReview', () => {
  it('needs a 1-5 integer rating', () => {
    expect(validateReview({ rating: 0 })).toBeTruthy()
    expect(validateReview({ rating: 3.5 })).toBeTruthy()
    expect(validateReview({ rating: 5, text: '' })).toBeNull()
  })
  it('limits the comment length', () => {
    expect(validateReview({ rating: 5, text: 'a'.repeat(MAX_REVIEW_TEXT + 1) })).toBeTruthy()
    expect(validateReview({ rating: 5, text: 'a'.repeat(MAX_REVIEW_TEXT) })).toBeNull()
  })
})

describe('reviewId / sortReviews', () => {
  it('joins app and user', () => {
    expect(reviewId('goal', 'u1')).toBe('goal_u1')
  })
  it('puts the newest first, unsaved (no timestamp yet) on top', () => {
    const t = (n) => ({ toMillis: () => n })
    const out = sortReviews([{ id: 'a', updatedAt: t(1) }, { id: 'b', updatedAt: t(5) }, { id: 'c' }])
    expect(out.map((r) => r.id)).toEqual(['c', 'b', 'a'])
  })
})
