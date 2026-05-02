'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2 } from 'lucide-react'

const fieldLabelClass =
  'text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground'

const fieldControlClass = cn(
  'h-11 rounded-xl border-border/50 bg-background/60 text-[15px] shadow-none transition-colors',
  'placeholder:text-muted-foreground/45',
  'focus-visible:border-border focus-visible:ring-[3px] focus-visible:ring-foreground/[0.08]',
)

const textareaClass = cn(
  fieldControlClass,
  'min-h-[112px] h-auto resize-y py-3 leading-relaxed',
)

export function MobileLaunchListForm() {
  const t = useTranslations('marketing')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    handle: '',
    message: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      // English-only body for ops / inbox routing (subject stays `mobile_launch_list`).
      const payloadMessage = [
        'Mobile Launch List Signup',
        form.handle ? `Creator handle: ${form.handle}` : '',
        '',
        form.message || 'No extra notes provided.',
      ]
        .filter(Boolean)
        .join('\n')

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: 'mobile_launch_list',
          message: payloadMessage,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : t('launchList.form.errorFallback'))
        return
      }

      setSent(true)
      setForm({ name: '', email: '', handle: '', message: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('launchList.form.errorUnexpected'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="py-1 text-center">
        <div
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/40"
          aria-hidden
        >
          <CheckCircle2 className="h-5 w-5 text-foreground/70" strokeWidth={1.75} />
        </div>
        <h3 className="mt-5 font-serif text-[1.375rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[1.5rem]">
          {t('launchList.form.successTitle')}
        </h3>
        <p className="mx-auto mt-2 max-w-[28ch] text-[14px] leading-relaxed text-muted-foreground">
          {t('launchList.form.successBody')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-[13px] leading-snug text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
        <div className="space-y-1.5">
          <Label htmlFor="launch-name" className={fieldLabelClass}>
            {t('launchList.form.name')}
          </Label>
          <Input
            id="launch-name"
            required
            placeholder={t('launchList.form.placeholderName')}
            value={form.name}
            className={fieldControlClass}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="launch-email" className={fieldLabelClass}>
            {t('launchList.form.email')}
          </Label>
          <Input
            id="launch-email"
            type="email"
            required
            placeholder={t('launchList.form.placeholderEmail')}
            value={form.email}
            className={fieldControlClass}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="launch-handle" className={fieldLabelClass}>
          {t('launchList.form.handle')}{' '}
          <span className="font-normal normal-case tracking-normal text-muted-foreground/80">
            {t('launchList.form.optional')}
          </span>
        </Label>
        <Input
          id="launch-handle"
          placeholder={t('launchList.form.placeholderHandle')}
          value={form.handle}
          className={fieldControlClass}
          onChange={(e) => setForm((prev) => ({ ...prev, handle: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="launch-message" className={fieldLabelClass}>
          {t('launchList.form.notes')}{' '}
          <span className="font-normal normal-case tracking-normal text-muted-foreground/80">
            {t('launchList.form.optional')}
          </span>
        </Label>
        <Textarea
          id="launch-message"
          rows={4}
          placeholder={t('launchList.form.placeholderNotes')}
          value={form.message}
          className={textareaClass}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
        />
      </div>
      <Button
        type="submit"
        disabled={sending}
        className={cn(
          'h-12 w-full rounded-xl bg-foreground text-background',
          'text-[14px] font-medium tracking-[-0.01em]',
          'shadow-sm hover:bg-foreground/92',
          'focus-visible:ring-[3px] focus-visible:ring-foreground/[0.12]',
          'disabled:pointer-events-none disabled:opacity-45',
        )}
      >
        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        {sending ? t('launchList.form.submitting') : t('launchList.form.submit')}
      </Button>
    </form>
  )
}
