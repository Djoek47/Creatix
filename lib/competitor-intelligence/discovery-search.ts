import { SerperProvider } from '@/lib/leaks/search-providers'

export type DiscoveryHit = { title: string; link: string; snippet: string }

const MAX_QUERIES = 4
const PER_QUERY = 6

function dedupeByLink(hits: DiscoveryHit[]): DiscoveryHit[] {
  const seen = new Set<string>()
  const out: DiscoveryHit[] = []
  for (const h of hits) {
    const k = h.link.toLowerCase().split('#')[0]
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(h)
  }
  return out
}

/**
 * Public web discovery for competitor / market context (editorial pages, guides — not paywalled scrapes).
 */
export async function runCompetitorDiscoverySearch(params: {
  niche: string
  platform: string
}): Promise<DiscoveryHit[]> {
  const key = process.env.SERPER_API_KEY
  if (!key) return []

  const niche = params.niche.trim() || 'adult content creator'
  const plat =
    params.platform === 'fansly'
      ? 'Fansly'
      : params.platform === 'onlyfans'
        ? 'OnlyFans'
        : 'OnlyFans'

  const queries = [
    `${niche} ${plat} creator marketing tips`,
    `${niche} content creator subscriber engagement best practices`,
    `OnlyFans Fansly DM chatting tips creators professional`,
    `${plat} creator posting schedule engagement comments`,
  ].slice(0, MAX_QUERIES)

  const provider = new SerperProvider(key)
  const all: DiscoveryHit[] = []
  for (const q of queries) {
    try {
      const r = await provider.search(q, { limit: PER_QUERY })
      for (const x of r) {
        if (x.link && x.title) {
          all.push({ title: x.title, link: x.link, snippet: x.snippet || '' })
        }
      }
    } catch {
      // continue other queries
    }
  }

  return dedupeByLink(all).slice(0, 24)
}

export function hitsToPromptBlock(hits: DiscoveryHit[]): string {
  if (hits.length === 0) return '(No web results — rely on library + community digest only.)'
  return hits
    .map((h, i) => `[${i + 1}] ${h.title}\nURL: ${h.link}\n${h.snippet}`)
    .join('\n\n')
}
