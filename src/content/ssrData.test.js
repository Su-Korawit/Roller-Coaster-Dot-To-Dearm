// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readSsrData } from './ssrData'

const put = (text) => {
  document.body.innerHTML = `<script id="hub-data" type="application/json">${text}</script>`
}
beforeEach(() => {
  document.body.innerHTML = ''
})

describe('readSsrData', () => {
  it('returns null when the page was not server-rendered', () => {
    expect(readSsrData()).toBeNull()
  })

  it('parses the embedded JSON', () => {
    put('{"article":{"slug":"a-1"}}')
    expect(readSsrData()).toEqual({ article: { slug: 'a-1' } })
  })

  it('ignores malformed or non-object data', () => {
    put('{oops')
    expect(readSsrData()).toBeNull()
    put('"text"')
    expect(readSsrData()).toBeNull()
  })
})
