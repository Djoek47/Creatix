import { createHash } from 'crypto'

export function buildCommentIdempotencyKey(parts: string[]): string {
  return createHash('sha256').update(parts.filter(Boolean).join('\x1e')).digest('hex')
}
