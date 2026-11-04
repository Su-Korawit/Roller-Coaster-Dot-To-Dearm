import { describe, it, expect } from 'vitest'
import { hubArticleUrl } from './hubUrl'

describe('hubArticleUrl', () => {
  it('points to the production hub article route', () => {
    expect(hubArticleUrl('abc123', false)).toBe('https://ilovetcas.com/blog/abc123')
  })

  it('stays on the dev origin, selecting the hub site, in development', () => {
    expect(hubArticleUrl('abc123', true)).toBe('/blog/abc123?site=hub')
  })

  it('encodes the id', () => {
    expect(hubArticleUrl('a b/c', false)).toBe('https://ilovetcas.com/blog/a%20b%2Fc')
  })
})
