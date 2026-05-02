'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { FooterSupportSocial, SUPPORT_EMAIL } from '@/components/marketing/footer-support-social'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const fieldClass =
  'h-12 rounded-xl border-border/50 bg-background/80 text-[15px] shadow-none transition-[border-color,box-shadow] duration-200 focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

const textareaClass =
  'min-h-[10.5rem] rounded-xl border-border/50 bg-background/80 py-3 text-[15px] leading-relaxed shadow-none transition-[border-color,box-shadow] duration-200 focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export default function ContactPage() {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : 'Message could not be sent. Try again or use the email address above.',
        )
      } else {
        setSent(true)
        setFormData({ name: '', email: '', subject: '', message: '' })
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Message could not be sent. Try again or use the email address above.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground antialiased">
      <header className="sticky top-0 z-40 border-b border-border/25 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5 sm:px-8">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-10 gap-2 rounded-full px-3 text-[15px] font-normal text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            Back
          </Button>
          <Link
            href="/"
            className="rounded-full p-0.5 outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/60"
            aria-label="Home"
          >
            <ThemedLogo width={28} height={28} className="rounded-full" priority />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 pb-28 pt-14 sm:px-8 sm:pt-16 md:max-w-lg">
        <div className="space-y-5 sm:space-y-6">
          <h1 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[2.375rem]">
            Contact
          </h1>
          <p className="max-w-[40ch] text-[1.0625rem] leading-[1.5] text-muted-foreground sm:text-[1.125rem] sm:leading-relaxed">
            Account, billing, or product questions—write here or email us directly.
          </p>
          <p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline text-[0.9375rem] font-medium text-foreground underline decoration-border/80 underline-offset-[5px] transition-colors hover:decoration-primary hover:text-primary sm:text-[15px]"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <section className="mt-14 sm:mt-16" aria-labelledby="contact-form-label">
          <span id="contact-form-label" className="sr-only">
            Contact form
          </span>

          <div className="rounded-2xl border border-border/35 bg-muted/[0.08] p-7 sm:p-9">
            {sent ? (
              <div className="flex flex-col items-center py-10 text-center sm:py-12">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-primary/[0.07]"
                  aria-hidden
                >
                  <Check className="h-5 w-5 text-primary" strokeWidth={2.25} />
                </div>
                <p className="mt-6 text-[1.125rem] font-medium tracking-[-0.02em] text-foreground">Message received</p>
                <p className="mt-2 max-w-[32ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
                  We&apos;ll reply by email. If it&apos;s urgent, send a follow-up to the address above.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-8 h-10 rounded-full px-5 text-[15px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setSent(false)}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-7 sm:space-y-8">
                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/25 bg-destructive/[0.07] px-4 py-3 text-[0.9375rem] leading-snug text-destructive"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="grid gap-7 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-0">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name" className="text-[13px] font-medium text-foreground/90">
                      Name
                    </Label>
                    <Input
                      id="contact-name"
                      autoComplete="name"
                      placeholder=""
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-[13px] font-medium text-foreground/90">
                      Email
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      placeholder=""
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-subject" className="text-[13px] font-medium text-foreground/90">
                    Topic <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Select
                    value={formData.subject || undefined}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger id="contact-subject" className={cn(fieldClass, 'h-12 w-full')}>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="support">Technical</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="press">Press</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-[13px] font-medium text-foreground/90">
                    Message
                  </Label>
                  <Textarea
                    id="contact-message"
                    placeholder=""
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className={textareaClass}
                  />
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={sending}
                    className="h-12 w-full rounded-xl text-[15px] font-semibold tracking-[-0.01em] shadow-none"
                  >
                    {sending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin opacity-80" aria-hidden />
                        Sending…
                      </span>
                    ) : (
                      'Send'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/25 py-10 sm:py-12">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <nav
            className="flex flex-wrap justify-center gap-x-9 gap-y-3 text-[13px] text-muted-foreground"
            aria-label="Legal"
          >
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-foreground">
              Cookies
            </Link>
            <Link href="/about" className="transition-colors hover:text-foreground">
              About
            </Link>
          </nav>
          <FooterSupportSocial className="mt-8 text-[13px]" />
        </div>
      </footer>
    </div>
  )
}
