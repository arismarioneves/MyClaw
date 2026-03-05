import { describe, it, expect } from 'vitest'
import { formatForTelegram, splitMessage } from './format.js'

// isAuthorised depends on ALLOWED_CHAT_ID from config which reads .env
// When .env doesn't exist (or ALLOWED_CHAT_ID is empty), it returns true (first-run mode)
// We test that logic directly here without importing bot.ts (which has sqlite dependency)
function isAuthorised(chatId: number | string, allowedId: string): boolean {
  if (!allowedId) return true
  return String(chatId) === String(allowedId)
}

describe('formatForTelegram', () => {
  it('converts bold markdown to HTML', () => {
    expect(formatForTelegram('**hello**')).toBe('<b>hello</b>')
  })

  it('converts italic markdown to HTML', () => {
    expect(formatForTelegram('*hello*')).toBe('<i>hello</i>')
  })

  it('converts inline code', () => {
    expect(formatForTelegram('use `npm install`')).toBe('use <code>npm install</code>')
  })

  it('converts fenced code block', () => {
    const input = '```\nconsole.log("hi")\n```'
    const result = formatForTelegram(input)
    expect(result).toContain('<pre><code>')
    expect(result).toContain('console.log')
    expect(result).toContain('</code></pre>')
  })

  it('escapes HTML in code blocks', () => {
    const result = formatForTelegram('```\n<script>alert(1)</script>\n```')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<script>')
  })

  it('converts strikethrough', () => {
    expect(formatForTelegram('~~deleted~~')).toBe('<s>deleted</s>')
  })

  it('converts headings to bold', () => {
    expect(formatForTelegram('# My Heading')).toBe('<b>My Heading</b>')
  })

  it('converts links', () => {
    expect(formatForTelegram('[click](https://example.com)')).toBe(
      '<a href="https://example.com">click</a>'
    )
  })

  it('converts unchecked checkbox', () => {
    expect(formatForTelegram('- [ ] todo')).toBe('☐ todo')
  })

  it('converts checked checkbox', () => {
    expect(formatForTelegram('- [x] done')).toBe('☑ done')
  })

  it('strips horizontal rules', () => {
    const result = formatForTelegram('before\n---\nafter')
    expect(result).not.toContain('---')
    expect(result).toContain('before')
    expect(result).toContain('after')
  })

  it('escapes & < > in plain text', () => {
    const result = formatForTelegram('A & B < C > D')
    expect(result).toContain('&amp;')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
  })

  it('escapes HTML inside code spans', () => {
    const result = formatForTelegram('`a & b`')
    expect(result).toBe('<code>a &amp; b</code>')
  })
})

describe('splitMessage', () => {
  it('returns single chunk when under limit', () => {
    expect(splitMessage('hello world', 100)).toEqual(['hello world'])
  })

  it('splits long text into chunks within limit', () => {
    const long = Array.from({ length: 20 }, (_, i) => `Line number ${i}`).join('\n')
    const chunks = splitMessage(long, 50)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(50)
    }
  })

  it('all content is preserved across chunks', () => {
    const original = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n')
    const chunks = splitMessage(original, 50)
    const joined = chunks.join('\n')
    for (let i = 0; i < 20; i++) {
      expect(joined).toContain(`Line ${i}`)
    }
  })
})

describe('isAuthorised', () => {
  it('returns true when no allowed ID configured (first-run mode)', () => {
    expect(isAuthorised(12345, '')).toBe(true)
  })

  it('returns true when chat ID matches', () => {
    expect(isAuthorised(12345, '12345')).toBe(true)
  })

  it('returns false when chat ID does not match', () => {
    expect(isAuthorised(99999, '12345')).toBe(false)
  })
})
