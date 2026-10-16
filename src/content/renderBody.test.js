import { describe, it, expect } from 'vitest'
import { renderBodyToHtml, parseBody, plainText, readingMinutes, EMPTY_DOC } from './renderBody'

const doc = (...content) => ({ type: 'doc', content })
const p = (...content) => ({ type: 'paragraph', content })
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })

describe('renderBodyToHtml: structure', () => {
  it('renders bold text inside a paragraph', () => {
    expect(renderBodyToHtml(doc(p(t('hi', [{ type: 'bold' }]))))).toBe('<p><strong>hi</strong></p>')
  })

  it('renders italic, line breaks, quotes and rules', () => {
    const html = renderBodyToHtml(
      doc(
        p(t('a', [{ type: 'italic' }]), { type: 'hardBreak' }, t('b')),
        { type: 'blockquote', content: [p(t('q'))] },
        { type: 'horizontalRule' },
      ),
    )
    expect(html).toBe('<p><em>a</em><br>b</p><blockquote><p>q</p></blockquote><hr>')
  })

  it('clamps heading levels to h2 and h3', () => {
    const h = (level) => ({ type: 'heading', attrs: { level }, content: [t('x')] })
    expect(renderBodyToHtml(doc(h(1)))).toBe('<h2>x</h2>')
    expect(renderBodyToHtml(doc(h(2)))).toBe('<h2>x</h2>')
    expect(renderBodyToHtml(doc(h(3)))).toBe('<h3>x</h3>')
    expect(renderBodyToHtml(doc(h(4)))).toBe('<h3>x</h3>')
  })

  it('renders bullet and ordered lists', () => {
    const li = (s) => ({ type: 'listItem', content: [p(t(s))] })
    expect(renderBodyToHtml(doc({ type: 'bulletList', content: [li('a')] }))).toBe('<ul><li><p>a</p></li></ul>')
    expect(renderBodyToHtml(doc({ type: 'orderedList', content: [li('a')] }))).toBe('<ol><li><p>a</p></li></ol>')
  })

  it('renders tables with header and body cells and a safe colspan', () => {
    const cell = (type, s, attrs) => ({ type, ...(attrs ? { attrs } : {}), content: [p(t(s))] })
    const html = renderBodyToHtml(
      doc({
        type: 'table',
        content: [
          { type: 'tableRow', content: [cell('tableHeader', 'H', { colspan: 2 }), cell('tableHeader', 'I')] },
          { type: 'tableRow', content: [cell('tableCell', 'a', { colspan: 99 }), cell('tableCell', 'b', { colspan: 'x"' })] },
        ],
      }),
    )
    expect(html).toContain('<table>')
    expect(html).toContain('<th colspan="2"><p>H</p></th>')
    expect(html).toContain('<td><p>a</p></td>')
    expect(html).toContain('<td><p>b</p></td>')
    expect(html).not.toContain('99')
  })

  it('returns an empty string for missing or invalid documents', () => {
    expect(renderBodyToHtml(null)).toBe('')
    expect(renderBodyToHtml(undefined)).toBe('')
    expect(renderBodyToHtml({ type: 'paragraph' })).toBe('')
  })
})

describe('renderBodyToHtml: injection safety', () => {
  it('escapes markup in text', () => {
    const html = renderBodyToHtml(doc(p(t('<script>alert(1)</script>'))))
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script')
  })

  it('drops javascript: links but keeps the text', () => {
    const html = renderBodyToHtml(doc(p(t('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))))
    expect(html).toBe('<p>click</p>')
    expect(html).not.toContain('javascript:')
  })

  it.each(['//evil.com', 'data:text/html,<b>x</b>', 'vbscript:x', ' javascript:alert(1)', 'JaVaScRiPt:alert(1)'])(
    'rejects link href %s',
    (href) => {
      const html = renderBodyToHtml(doc(p(t('x', [{ type: 'link', attrs: { href } }]))))
      expect(html).not.toContain('<a')
    },
  )

  it('renders https, http and mailto links with safe rel and escaped query strings', () => {
    const a = (href) => renderBodyToHtml(doc(p(t('x', [{ type: 'link', attrs: { href } }]))))
    expect(a('https://x.org/a?b=1&c=2')).toBe(
      '<p><a href="https://x.org/a?b=1&amp;c=2" rel="noopener noreferrer nofollow">x</a></p>',
    )
    expect(a('http://x.org')).toContain('href="http://x.org/"')
    expect(a('mailto:hi@x.org')).toContain('href="mailto:hi@x.org"')
  })

  it('cannot break out of the href attribute', () => {
    const html = renderBodyToHtml(
      doc(p(t('x', [{ type: 'link', attrs: { href: 'https://a.com" onclick="x' } }]))),
    )
    expect(html).not.toContain('onclick')
  })

  it('renders only https images and escapes alt text', () => {
    const img = (src, alt) => renderBodyToHtml(doc({ type: 'image', attrs: { src, alt } }))
    expect(img('data:image/png;base64,AAA', 'a')).toBe('')
    expect(img('javascript:alert(1)', 'a')).toBe('')
    expect(img('http://x.org/a.png', 'a')).toBe('')
    expect(img('https://x.org/a.png', 'say "hi"')).toBe(
      '<img src="https://x.org/a.png" alt="say &quot;hi&quot;" loading="lazy">',
    )
  })

  it('drops unknown nodes entirely, including their children', () => {
    expect(renderBodyToHtml(doc({ type: 'iframe', attrs: { src: 'https://evil' } }))).toBe('')
    expect(renderBodyToHtml(doc({ type: 'script', content: [p(t('x'))] }))).toBe('')
    expect(renderBodyToHtml(doc(p(t('keep')), { type: 'customEmbed', content: [p(t('lost'))] }))).toBe('<p>keep</p>')
  })

  it('ignores unknown marks', () => {
    expect(renderBodyToHtml(doc(p(t('x', [{ type: 'highlight', attrs: { onclick: 'y' } }]))))).toBe('<p>x</p>')
  })

  it('stops at a nesting depth of 20', () => {
    let node = p(t('deep'))
    for (let i = 0; i < 30; i++) node = { type: 'blockquote', content: [node] }
    const html = renderBodyToHtml(doc(node))
    expect(html).not.toContain('deep')
    expect((html.match(/<blockquote>/g) ?? []).length).toBeLessThanOrEqual(20)
  })
})

describe('parseBody', () => {
  it('parses a stored document string', () => {
    expect(parseBody(JSON.stringify(EMPTY_DOC))).toEqual(EMPTY_DOC)
  })

  it('returns null for invalid JSON or a non-doc root', () => {
    expect(parseBody('not json')).toBeNull()
    expect(parseBody('{"type":"x"}')).toBeNull()
    expect(parseBody('')).toBeNull()
    expect(parseBody(undefined)).toBeNull()
  })
})

describe('plainText and readingMinutes', () => {
  it('joins block text with spaces', () => {
    expect(plainText(doc(p(t('one')), p(t('two'), t('three'))))).toBe('one twothree')
  })

  it('estimates minutes at 600 characters each, minimum 1', () => {
    expect(readingMinutes(doc(p(t('x'.repeat(1201)))))).toBe(3)
    expect(readingMinutes(doc(p(t('x'))))).toBe(1)
    expect(readingMinutes(null)).toBe(1)
  })
})
