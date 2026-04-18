/** Parse forensic recipient_key for display (e.g. onlyfans:12345 vs custom label). */
export function parseAriadneRecipientKey(recipientKey: string): {
  kind: 'onlyfans_fan' | 'custom'
  platform?: string
  fanId?: string
  displayLine: string
} {
  const k = recipientKey.trim()
  const m = /^([a-z]+):([a-zA-Z0-9_-]+)$/i.exec(k)
  if (m && m[1].toLowerCase() === 'onlyfans') {
    return {
      kind: 'onlyfans_fan',
      platform: 'onlyfans',
      fanId: m[2],
      displayLine: `OnlyFans fan id ${m[2]}`,
    }
  }
  return { kind: 'custom', displayLine: k || '(empty)' }
}
