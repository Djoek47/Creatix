'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function MobileLaunchListForm() {
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
        <Label htmlFor="launch-message">What do you want first in mobile? (optional)</Label>
        <Textarea
          id="launch-message"
          rows={4}
          placeholder="Messages, AI Studio, protection workflows, analytics, or something else."
          value={form.message}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
        />
      </div>
      <Button type="submit" className="h-11 w-full gap-2 rounded-full" disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {sending ? 'Joining...' : 'Join launch list'}
      </Button>
    </form>
  )
}
