import type { MarkitAttributionResult } from '@/lib/ariadne/attribution-types'

/**
 * Plain text block appended to the DMCA “description of copyrighted work” when the creator
 * ran leak-URL Ariadne attribution in Protection.
 */
export function formatAriadneAttributionForDmcaAppend(a: MarkitAttributionResult): string {
  const lines: string[] = []
  lines.push(
    a.is_markit
      ? 'A possible Markit / Ariadne forensic match was found on the file fetched from the infringing URL (verify independently before relying on this in legal correspondence).'
      : 'No Markit / Ariadne metadata or microdot marker was found on the sample fetched from the infringing URL; detection may be inconclusive for re-encoded video.',
  )
  lines.push(`Detection method: ${a.detection_method}; model confidence: ${a.confidence}.`)
  if (a.watermark_id) lines.push(`Payload / watermark id: ${a.watermark_id}.`)
  if (a.user_id) lines.push(`Trace recipient user id: ${a.user_id}.`)
  if (a.evidence?.export?.id) {
    lines.push(
      `Linked Creatix export id: ${a.evidence.export.id}` +
        (a.evidence.export.content_id ? ` (content ${a.evidence.export.content_id})` : '') +
        '.',
    )
  }
  if (a.warnings?.length) lines.push(`Scan warnings: ${a.warnings.join('; ')}.`)
  return lines.join(' ')
}
