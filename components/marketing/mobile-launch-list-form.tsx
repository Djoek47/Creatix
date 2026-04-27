'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'

export function MobileLaunchListForm() {
  /** Treat `null` as motion OK (SSR / first paint). */
  const reduceMotion = useReducedMotion() === true
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
        setError(typeof data?.error === 'string' ? data.error : 'Unable to join launch list right now.')
        return
      }

      setSent(true)
      setForm({ name: '', email: '', handle: '', message: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error while submitting form.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <h3 className="mt-3 font-serif text-2xl font-semibold">You are on the list.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We will email you first when mobile access opens.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="launch-name">Name</Label>
          <Input
            id="launch-name"
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="launch-email">Email</Label>
          <Input
            id="launch-email"
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="launch-handle">Creator handle (optional)</Label>
        <Input
          id="launch-handle"
          placeholder="@yourhandle"
          value={form.handle}
          onChange={(e) => setForm((prev) => ({ ...prev, handle: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="launch-message"
          className="flex cursor-default flex-wrap items-center gap-x-2 gap-y-1 text-left leading-snug"
        >
          {reduceMotion ? (
            <Sparkles className="h-4 w-4 shrink-0 text-amber-200/90" aria-hidden />
          ) : (
            <motion.span
              aria-hidden
              className="inline-flex shrink-0"
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="h-4 w-4 text-violet-200 drop-shadow-[0_0_8px_rgba(167,139,250,0.55)]" />
            </motion.span>
          )}
          {reduceMotion ? (
            <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-amber-200 bg-clip-text text-base font-semibold text-transparent">
              Any request
            </span>
          ) : (
            <motion.span
              className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-amber-200 bg-[length:220%_auto] bg-clip-text text-base font-semibold tracking-tight text-transparent motion-safe:animate-gradient-x"
              animate={{ y: [0, -2.5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              Any request
            </motion.span>
          )}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="launch-message"
          rows={4}
          placeholder="Messages, AI Studio, protection workflows, analytics, or something else."
          value={form.message}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
        />
      </div>
      <Button
        type="submit"
        variant="ghost"
        disabled={sending}
        className={cn(
          'relative h-11 w-full gap-2 overflow-hidden rounded-full border border-transparent font-semibold uppercase tracking-[0.14em] text-white shadow-lg',
          '!bg-gradient-to-r !from-violet-600 !via-fuchsia-600 !to-amber-400 !bg-[length:200%_auto] !text-white motion-safe:animate-gradient-x',
          'shadow-violet-900/35 hover:!opacity-[0.96] hover:shadow-[0_0_28px_-6px_rgba(139,92,246,0.45),0_0_22px_-8px_rgba(251,191,36,0.28)]',
          'hover:!bg-gradient-to-r hover:!from-violet-600 hover:!via-fuchsia-600 hover:!to-amber-400 hover:!text-white focus-visible:!text-white',
          'disabled:!opacity-50',
        )}
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {sending ? 'Joining…' : 'Join launch'}
      </Button>
    </form>
  )
}
