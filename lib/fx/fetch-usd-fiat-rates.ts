/**
 * Live USD→fiat rates (ECB via Frankfurter). Server-only fetch; cache with Next `revalidate`.
 * https://www.frankfurter.app/docs/
 */
export type UsdFiatRatesMap = Record<string, number>

export async function fetchUsdFiatRates(): Promise<UsdFiatRatesMap | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,CAD,AUD', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { rates?: Record<string, number> }
    if (!body.rates || typeof body.rates !== 'object') return null
    return { USD: 1, ...body.rates }
  } catch {
    return null
  }
}
