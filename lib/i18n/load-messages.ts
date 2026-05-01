import type { AbstractIntlMessages } from 'use-intl'
import type { Phase1Locale } from '@/lib/i18n/routing'
import deepmerge from '@/lib/i18n/deepmerge'

async function namespaceJson(locale: Phase1Locale, ns: string): Promise<Record<string, unknown>> {
  try {
    switch (locale) {
      case 'en':
      case 'es':
      case 'pt':
      case 'fr':
        break
      default:
        throw new Error('invalid locale')
    }
    const mod = await import(`../../messages/${locale}/${ns}.json`)
    return (mod as { default: Record<string, unknown> }).default
  } catch {
    try {
      const fallback = await import(`../../messages/en/${ns}.json`)
      return (fallback as { default: Record<string, unknown> }).default
    } catch {
      return {}
    }
  }
}

/**
 * Loads next-intl message tree: `{ [namespace]: { ...keys } }`.
 */
export async function loadMessagesForNamespaces(
  locale: Phase1Locale,
  namespaces: readonly string[],
): Promise<AbstractIntlMessages> {
  return namespaces.reduce(async (accP, ns) => {
    const acc = await accP
    acc[ns] = (await namespaceJson(locale, ns)) as AbstractIntlMessages
    return acc
  }, Promise.resolve({}) as Promise<AbstractIntlMessages>)
}

export async function loadAppMessages(locale: Phase1Locale): Promise<AbstractIntlMessages> {
  const ns = [
    'common',
    'navigation',
    'dashboard',
    'billing',
    'auth',
    'errors',
    'ai-tools',
    'onboarding',
    'settings',
    'toasts',
    'marketing',
  ] as const
  return loadMessagesForNamespaces(locale, ns)
}

export async function loadMarketingMessages(locale: Phase1Locale): Promise<AbstractIntlMessages> {
  return loadMessagesForNamespaces(locale, ['common', 'navigation', 'marketing', 'auth', 'errors'])
}

function pseudoLocalizeString(s: string): string {
  return `[~~ ${s} ~~]`
}

function mapMessageLeaves(
  input: AbstractIntlMessages,
  fn: (s: string) => string,
): AbstractIntlMessages {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return fn(v)
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(o)) {
        out[k] = walk(o[k])
      }
      return out
    }
    if (Array.isArray(v)) {
      return v.map((x) => walk(x))
    }
    return v
  }
  return walk(input) as AbstractIntlMessages
}

/** Development-only: stretch strings to catch layout breaks. */
export function applyPseudoLocalization(messages: AbstractIntlMessages): AbstractIntlMessages {
  if (process.env.NODE_ENV !== 'development') return messages
  if (process.env.NEXT_PUBLIC_I18N_PSEUDO_LOCALE !== '1') return messages
  return mapMessageLeaves(messages, pseudoLocalizeString)
}

export function mergeEnglishFallback(
  english: AbstractIntlMessages,
  active: AbstractIntlMessages,
): AbstractIntlMessages {
  return deepmerge(english, active) as AbstractIntlMessages
}
