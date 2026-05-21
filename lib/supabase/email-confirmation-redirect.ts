import { getAppUrl } from '@/lib/site-url'

/** Path users land on after clicking the Supabase confirmation link (session in hash). */
const EMAIL_CONFIRM_PATH = '/auth/sign-up-success'

/**
 * Server-side redirect URL for `signUp({ options: { emailRedirectTo } })`.
 */
export function getEmailConfirmationRedirectUrl(): string {
  return `${getAppUrl()}${EMAIL_CONFIRM_PATH}`
}

/**
 * Client-side redirect URL (matches the tab origin on Vercel preview vs production).
 */
export function getEmailConfirmationRedirectUrlClient(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${EMAIL_CONFIRM_PATH}`
  }
  return getEmailConfirmationRedirectUrl()
}
