/**
 * Decode common HTML entities so escaped markup (e.g. &lt;a …&gt;) is unwrapped
 * before tag stripping. Runs in a loop so &amp;lt; becomes a real tag after a few passes.
 */
function decodeHtmlEntitiesForStripping(s: string): string {
  let text = s
  for (let pass = 0; pass < 6; pass++) {
    const prev = text
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&amp;/g, '&')
    if (text === prev) break
  }
  return text
}

/**
 * Strips HTML tags from text while preserving emojis and converting
 * common HTML elements to their text equivalents
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''

  let text = decodeHtmlEntitiesForStripping(html)

  // Convert <br> and <br /> to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n')

  // Convert </p> to double newline (paragraph break)
  text = text.replace(/<\/p>/gi, '\n\n')

  // Anchors: href in single/double quotes (OnlyFans often uses href='…')
  text = text.replace(
    /<a\b[^>]*\bhref\s*=\s*(["'])([^"']*)\1[^>]*>([\s\S]*?)<\/a>/gi,
    (_: string, _q: string, url: string, inner: string) => {
      const innerPlain = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      return innerPlain ? `${innerPlain} (${url})` : url
    },
  )

  // OnlyFans / rich HTML: trailing <o>…</o> wrappers (often a single “O” marker). Remove whole blocks first
  // so inner text is not left behind when <o> and </o> are stripped separately.
  text = text.replace(/<o\b[^>]*>[\s\S]*?<\/o>/gi, '')
  text = text.replace(/<o\b[^>]*\/?>/gi, '')
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Any entities left in plain text (e.g. &amp; in copy)
  text = decodeHtmlEntitiesForStripping(text)
  
  // Clean up extra whitespace but preserve intentional line breaks
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  // Remove trailing line(s) that are only the digit 0 (platform/HTML artifact; not "…score is 0" mid-message)
  const lines = text.split(/\r?\n/)
  while (lines.length > 0 && lines[lines.length - 1].trim() === '0') {
    lines.pop()
  }
  text = lines.join('\n').trimEnd()

  return text
}

/**
 * Strips HTML for preview purposes (single line, truncated)
 */
export function stripHtmlForPreview(html: string | null | undefined, maxLength: number = 100): string {
  const text = stripHtml(html)
  // Replace all newlines with spaces for preview
  const singleLine = text.replace(/\n+/g, ' ').trim()
  if (singleLine.length <= maxLength) return singleLine
  return singleLine.slice(0, maxLength).trim() + '...'
}
