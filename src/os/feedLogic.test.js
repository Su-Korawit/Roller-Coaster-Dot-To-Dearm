import { describe, it, expect } from 'vitest'
import { validatePost, filterFeed, searchFeed, rankFeed, countLikes, profileStats, likeId } from './feedLogic'

const H = 3600000
const post = (id, hoursAgo, extra = {}) => ({ id, text: `post ${id}`, name: 'A', uid: 'u1', createdAtMs: 1000 * H - hoursAgo * H, ...extra })

describe('validatePost', () => {
  it('needs text, short, and an https image link when given', () => {
    expect(validatePost({ text: '  ' })).toBeTruthy()
    expect(validatePost({ text: 'x'.repeat(501) })).toBeTruthy()
    expect(validatePost({ text: 'hi', imageUrl: 'http://x.com/a.png' })).toBeTruthy()
    expect(validatePost({ text: 'hi', imageUrl: 'https://x.com/a.png' })).toBeNull()
    expect(validatePost({ text: 'hi' })).toBeNull()
  })
})

describe('filter and search', () => {
  const posts = [post('a', 1), post('b', 2, { imageUrl: 'https://x/y.png', name: 'Bee' })]
  it('splits text and media posts', () => {
    expect(filterFeed(posts, 'text').map((p) => p.id)).toEqual(['a'])
    expect(filterFeed(posts, 'media').map((p) => p.id)).toEqual(['b'])
    expect(filterFeed(posts, 'all')).toHaveLength(2)
  })
  it('searches text or author name', () => {
    expect(searchFeed(posts, 'bee').map((p) => p.id)).toEqual(['b'])
    expect(searchFeed(posts, 'POST a').map((p) => p.id)).toEqual(['a'])
  })
})

describe('rankFeed', () => {
  it('newest first without likes; likes can lift an older post', () => {
    const posts = [post('old', 6), post('new', 0)]
    const now = 1000 * H
    expect(rankFeed(posts, {}, now).map((p) => p.id)).toEqual(['new', 'old'])
    expect(rankFeed(posts, { old: 5 }, now).map((p) => p.id)).toEqual(['old', 'new'])
  })
})

describe('likes and profile', () => {
  it('counts likes per post and sums them per author', () => {
    const counts = countLikes([{ postId: 'a' }, { postId: 'a' }, { postId: 'b' }])
    expect(counts).toEqual({ a: 2, b: 1 })
    expect(profileStats([post('a', 1), post('b', 1, { uid: 'u2' })], 'u1', counts)).toEqual({ posts: 1, likes: 2 })
    expect(likeId('p', 'u')).toBe('p_u')
  })
})
