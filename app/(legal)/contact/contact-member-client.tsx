'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Check } from 'lucide-react'
import type { ContactSupportGate } from '@/lib/support/contact-support-eligibility'
import { ThemedLogo } from '@/components/themed-logo'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { cn } from '@/lib/utils'

const TOPICS = ['general', 'billing', 'technical', 'other'] as const
type TopicKey = (typeof TOPICS)[number]

type Props = { context: ContactSupportGate }

export function ContactMemberClient({ context }: Props) {
  const t = useTranslations('legal.contact')
  const tLegal = useTranslations('legal')
  const router = useRouter()
  const [topic, setTopic] = useState<TopicKey | ''>('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = message.trim()
    if (!trimmed) {
      setError(t('messageRequired'))
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topic: topic || undefined,
          message: trimmed,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
      }
      if (res.status === 401) {
        setError(t('errorSignIn'))
        return
      }
      if (res.status === 403 && data.code === 'SUPPORT_MEMBER_ONLY') {
        setError(t('errorMembersOnly'))
        return
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t('errorGeneric'))
        return
      }
      setSent(true)
      setMessage('')
      setTopic('')
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#fafafa] text-[#1d1d1f] antialiased dark:bg-[#0a0a0a] dark:text-[#f5f5f7]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fafafa]/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0a0a0a]/80">
        <div className="mx-auto flex h-[52px] max-w-[680px] items-center justify-between px-6 sm:h-14 sm:px-8">
          <button
            type="button"
            onClick={handleBack}
            className="group flex items-center gap-1.5 rounded-full py-2 pl-1 pr-2 text-[15px] font-normal text-[#6e6e73] transition-colors hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]"
          >
            <ArrowLeft
              className="h-[17px] w-[17px] opacity-70 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={2}
              aria-hidden
            />
            {tLegal('back')}
          </button>
          <Link
            href="/"
            className="rounded-full p-0.5 outline-offset-4 transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1d1d1f]/25 dark:focus-visible:outline-white/25"
            aria-label="Home"
          >
            <ThemedLogo width={28} height={28} className="rounded-full" priority />
          </Link>
        </div>
      </header>

      <motion.main
        className="mx-auto max-w-[680px] px-6 pb-32 pt-16 sm:px-8 sm:pt-20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {context.state === 'anonymous' ? (
          <Gate
            eyebrow={t('eyebrow')}
            title={t('gateSignInTitle')}
            body={t('gateSignInBody')}
            ctaHref="/auth/login?next=/contact"
            ctaLabel={t('gateSignInCta')}
          />
        ) : context.state === 'needs_subscription' ? (
          <Gate
            eyebrow={t('eyebrow')}
            title={t('gateSubscribeTitle')}
            body={t('gateSubscribeBody')}
            ctaHref="/pricing"
            ctaLabel={t('gateSubscribeCta')}
          />
        ) : sent ? (
          <div className="mx-auto max-w-md text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#1d1d1f]/10 bg-white dark:border-white/10 dark:bg-white/[0.04]"
              aria-hidden
            >
              <Check className="h-6 w-6 text-[#1d1d1f] dark:text-white" strokeWidth={2} />
            </div>
            <h1 className="mt-10 font-sans text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
              {t('successTitle')}
            </h1>
            <p className="mx-auto mt-4 max-w-[28ch] text-[17px] leading-[1.47] text-[#6e6e73] dark:text-[#a1a1a6]">
              {t('successBody')}
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-12 text-[17px] font-medium text-[#0071e3] transition-opacity hover:opacity-70 dark:text-[#2997ff]"
            >
              {t('sendAnother')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b] dark:text-[#6e6e73]">
              {t('eyebrow')}
            </p>
            <h1 className="mt-3 font-sans text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[44px] sm:leading-[1.05]">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-[36ch] text-[17px] leading-[1.47] text-[#6e6e73] dark:text-[#a1a1a6]">
              {t('subtitle')}
            </p>

            <div className="mt-12 h-px w-full bg-black/[0.08] dark:bg-white/[0.1]" aria-hidden />

            <div className="mt-10">
              <p className="text-[13px] font-medium text-[#86868b] dark:text-[#6e6e73]">{t('signedInAs')}</p>
              <p className="mt-1 text-[17px] font-medium tracking-[-0.01em]">{context.displayName}</p>
              <p className="mt-0.5 text-[15px] text-[#6e6e73] dark:text-[#a1a1a6]">{context.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-14 space-y-10">
              {error ? (
                <p
                  role="alert"
                  className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-[15px] leading-snug text-[#8b0000] dark:bg-[#3a1515] dark:text-[#ffb4b4]"
                >
                  {error}
                </p>
              ) : null}

              <div>
                <p className="text-[13px] font-medium text-[#86868b] dark:text-[#6e6e73]">{t('topicLabel')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TOPICS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTopic((prev) => (prev === key ? '' : key))}
                      className={cn(
                        'rounded-full px-4 py-2 text-[14px] font-medium transition-[background-color,color,transform] duration-200',
                        topic === key
                          ? 'bg-[#1d1d1f] text-white dark:bg-white dark:text-[#0a0a0a]'
                          : 'bg-black/[0.05] text-[#1d1d1f] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-[#f5f5f7] dark:hover:bg-white/[0.12]',
                      )}
                    >
                      {t(`topics.${key}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="support-message" className="text-[13px] font-medium text-[#86868b] dark:text-[#6e6e73]">
                  {t('messageLabel')}
                </label>
                <textarea
                  id="support-message"
                  name="message"
                  rows={7}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('messagePlaceholder')}
                  className="mt-3 w-full resize-y rounded-2xl border-0 bg-white px-4 py-4 text-[17px] leading-[1.5] text-[#1d1d1f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] outline-none transition-shadow placeholder:text-[#aeaeb2] focus:shadow-[inset_0_0_0_2px_#1d1d1f] dark:bg-white/[0.06] dark:text-[#f5f5f7] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] dark:placeholder:text-[#636366] dark:focus:shadow-[inset_0_0_0_2px_#f5f5f7]"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={sending}
                  className="h-[52px] w-full rounded-full bg-[#1d1d1f] text-[17px] font-medium text-white transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-[#0a0a0a]"
                >
                  {sending ? t('submitting') : t('submit')}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.main>

      <footer className="border-t border-black/[0.06] py-12 dark:border-white/[0.08]">
        <div className="mx-auto max-w-[680px] px-6 sm:px-8">
          <nav
            className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[12px] text-[#6e6e73] dark:text-[#a1a1a6]"
            aria-label={t('footerLegalAria')}
          >
            <Link href="/terms" className="transition-colors hover:text-[#1d1d1f] dark:hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-[#1d1d1f] dark:hover:text-white">
              Privacy
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-[#1d1d1f] dark:hover:text-white">
              Cookies
            </Link>
            <Link href="/about" className="transition-colors hover:text-[#1d1d1f] dark:hover:text-white">
              About
            </Link>
          </nav>
          <FooterSupportSocial className="mt-8 text-[12px] text-[#86868b]" />
        </div>
      </footer>
    </div>
  )
}

function Gate({
  eyebrow,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string
  title: string
  body: string
  ctaHref: string
  ctaLabel: string
}) {
  return (
    <div className="mx-auto max-w-md text-center sm:text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b] dark:text-[#6e6e73]">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-sans text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[40px]">{title}</h1>
      <p className="mt-4 text-[17px] leading-[1.47] text-[#6e6e73] dark:text-[#a1a1a6]">{body}</p>
      <Link
        href={ctaHref}
        className="mt-10 inline-flex h-[52px] min-w-[180px] items-center justify-center rounded-full bg-[#1d1d1f] px-8 text-[17px] font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-[#0a0a0a]"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
