import { MAX_MESSAGE_LENGTH } from './config.js'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Convert Markdown text to Telegram-compatible HTML.
 * Telegram supports: <b>, <i>, <code>, <pre>, <s>, <a>, <u>
 */
export function formatForTelegram(text: string): string {
  const blocks: string[] = []

  // 1. Extract and protect fenced code blocks
  let result = text.replace(/```[\w]*\n?([\s\S]*?)```/g, (_match, code: string) => {
    const idx = blocks.length
    blocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`)
    return `\x00BLK${idx}\x00`
  })

  // 2. Extract and protect inline code
  result = result.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const idx = blocks.length
    blocks.push(`<code>${escapeHtml(code)}</code>`)
    return `\x00BLK${idx}\x00`
  })

  // 3. Escape HTML special chars in remaining text
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 4. Apply markdown conversions (safe now that we've escaped raw text)
  // Headings
  result = result.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>')

  // Bold (must come before italic)
  result = result.replace(/\*\*(.+?)\*\*/gs, '<b>$1</b>')
  result = result.replace(/__(.+?)__/gs, '<b>$1</b>')

  // Italic
  result = result.replace(/\*([^*\n]+)\*/g, '<i>$1</i>')
  result = result.replace(/(?<![_])_([^_\n]+)_(?![_])/g, '<i>$1</i>')

  // Strikethrough
  result = result.replace(/~~(.+?)~~/gs, '<s>$1</s>')

  // Links
  result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')

  // Checkboxes
  result = result.replace(/- \[ \]/g, '☐')
  result = result.replace(/- \[x\]/gi, '☑')

  // Strip horizontal rules
  result = result.replace(/^-{3,}$/gm, '')
  result = result.replace(/^\*{3,}$/gm, '')

  // 5. Restore protected blocks
  result = result.replace(/\x00BLK(\d+)\x00/g, (_, i: string) => blocks[parseInt(i)] ?? '')

  return result.trim()
}

export function splitMessage(text: string, limit = MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= limit) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf('\n', limit)
    if (splitAt <= 0) splitAt = remaining.lastIndexOf(' ', limit)
    if (splitAt <= 0) splitAt = limit
    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }

  if (remaining.length > 0) chunks.push(remaining)
  return chunks
}
