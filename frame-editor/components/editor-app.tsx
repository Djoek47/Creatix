'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/client'
import { isPaidSubscription } from '@/lib/billing'
import presetsData from '@/lib/data/frame-edit-presets.json'

const CREATIX = process.env.NEXT_PUBLIC_CREATIX_APP_URL || 'https://www.circeetvenus.com'

type Preset = {
  id: string
  label: string
  description: string
  tags: string[]
}

export function EditorApp() {
  const sp = useSearchParams()
  const importUrl = sp.get('importUrl') || ''
  const exportUrl = sp.get('exportUrl') || ''
  const exportToken = sp.get('exportToken') || ''
  const contentId = sp.get('contentId') || ''

  const hasVaultBridge = Boolean(importUrl && exportUrl && exportToken)

  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [paid, setPaid] = useState<boolean | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [entitlementReady, setEntitlementReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUserId(session?.user?.id ?? null)
      setAuthReady(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (!sessionUserId) {
      setPaid(null)
      setEntitlementReady(true)
      return
    }
    setEntitlementReady(false)
    const supabase = createClient()
    void supabase
      .from('subscriptions')
      .select('plan_id,status')
      .eq('user_id', sessionUserId)
      .maybeSingle()
      .then(({ data }) => {
        setPaid(isPaidSubscription(data))
        setEntitlementReady(true)
      })
  }, [authReady, sessionUserId])

  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [exportBusy, setExportBusy] = useState(false)
  const [traceRecipientKey, setTraceRecipientKey] = useState('')
  const [traceBatchRaw, setTraceBatchRaw] = useState('')
  const [traceBusy, setTraceBusy] = useState(false)
  const [traceStatus, setTraceStatus] = useState<string | null>(null)

  const canManualExport = hasVaultBridge
  const tracedExportEnabled = process.env.NEXT_PUBLIC_FRAMER_TRACED_EXPORT_ENABLED === 'true'
  const canTrace = tracedExportEnabled && Boolean(contentId && traceRecipientKey.trim())

  const pushFile = useCallback(
    async (file: File) => {
      if (!hasVaultBridge) return
      setExportBusy(true)
      setExportStatus(null)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('exportUrl', exportUrl)
        fd.append('exportToken', exportToken)
        const res = await fetch('/api/export', { method: 'POST', body: fd })
        const text = await res.text()
        if (!res.ok) {
          setExportStatus(`Upload failed (${res.status}): ${text.slice(0, 400)}`)
        } else {
          setExportStatus('Saved to your vault. Refresh Media & vault on Circe et Venus.')
        }
      } catch (e) {
        setExportStatus(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setExportBusy(false)
      }
    },
    [exportToken, exportUrl, hasVaultBridge],
  )

  const sendSourceToVault = useCallback(async () => {
    if (!importUrl || !hasVaultBridge) return
    setExportBusy(true)
    setExportStatus(null)
    try {
      const res = await fetch(importUrl, { method: 'GET', mode: 'cors' })
      if (!res.ok) {
        setExportStatus(`Could not read source (${res.status}).`)
        setExportBusy(false)
        return
      }
      const blob = await res.blob()
      const file = new File([blob], 'from-frame.mp4', { type: blob.type || 'video/mp4' })
      await pushFile(file)
    } catch (e) {
      setExportStatus(
        e instanceof Error
          ? `${e.message} — If CORS failed, confirm NEXT_PUBLIC_FRAME_URL on Creatix matches this host.`
          : 'Could not fetch source',
      )
      setExportBusy(false)
    }
  }, [hasVaultBridge, importUrl, pushFile])

  const runTraceExport = useCallback(
    async (recipientKey: string) => {
      if (!contentId || !exportToken) throw new Error('Missing contentId/exportToken for traced export')
      const res = await fetch(`${CREATIX}/api/ariadne/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${exportToken}`,
          'x-idempotency-key': `frame_editor_trace:${contentId}:${recipientKey}`,
        },
        body: JSON.stringify({
          contentId,
          recipientKey,
          source: 'frame_export',
          lineage: {
            pipelineVersion: 'frame-editor',
            encoderProfile: 'h264-main',
          },
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as { error?: string; payloadId?: string }
      if (!res.ok) throw new Error(payload.error || `Trace export failed (${res.status})`)
      return payload.payloadId || '(unknown payload id)'
    },
    [contentId, exportToken],
  )

  const handleSingleTrace = useCallback(async () => {
    const key = traceRecipientKey.trim()
    if (!key) return
    setTraceBusy(true)
    setTraceStatus(null)
    try {
      const payloadId = await runTraceExport(key)
      setTraceStatus(`Traced export created for ${key}. Payload: ${payloadId}`)
    } catch (error) {
      setTraceStatus(error instanceof Error ? error.message : 'Traced export failed')
    } finally {
      setTraceBusy(false)
    }
  }, [runTraceExport, traceRecipientKey])

  const handleBatchTrace = useCallback(async () => {
    const keys = traceBatchRaw
      .split(/\r?\n/)
      .map((k) => k.trim())
      .filter(Boolean)
    if (!keys.length) return
    setTraceBusy(true)
    setTraceStatus(null)
    try {
      const results: string[] = []
      for (const key of keys) {
        const payloadId = await runTraceExport(key)
        results.push(`${key} -> ${payloadId}`)
      }
      setTraceStatus(`Batch traced exports complete:\n${results.join('\n')}`)
    } catch (error) {
      setTraceStatus(error instanceof Error ? error.message : 'Batch traced export failed')
    } finally {
      setTraceBusy(false)
    }
  }, [runTraceExport, traceBatchRaw])

  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'assistant'; text: string }[]>([])
  const chatMessagesRef = useRef(chatMessages)
  useEffect(() => {
    chatMessagesRef.current = chatMessages
  }, [chatMessages])
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  /** AI debits credits on Creatix; vault bridge token or signed-in session both work. */
  const canUseAi = hasVaultBridge || Boolean(sessionUserId)

  const runAssist = useCallback(
    async (userText: string) => {
      if (!canUseAi || aiBusy) return
      const userMsg = { id: crypto.randomUUID(), role: 'user' as const, text: userText }
      const next = [...chatMessagesRef.current, userMsg]
      setChatMessages(next)
      chatMessagesRef.current = next
      setAiBusy(true)
      setAiError(null)
      try {
        const ui: UIMessage[] = next.map((m) => ({
          id: m.id,
          role: m.role,
          parts: [{ type: 'text', text: m.text }],
        }))
        const res = await fetch('/api/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ messages: ui, vaultExportToken: exportToken || undefined }),
        })
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string }
        if (!res.ok) {
          setAiError(data.error || res.statusText)
          return
        }
        const reply = typeof data.text === 'string' ? data.text : ''
        const withAssistant = [
          ...next,
          { id: crypto.randomUUID(), role: 'assistant' as const, text: reply || '(empty response)' },
        ]
        setChatMessages(withAssistant)
        chatMessagesRef.current = withAssistant
      } catch (e) {
        setAiError(e instanceof Error ? e.message : 'Request failed')
      } finally {
        setAiBusy(false)
      }
    },
    [aiBusy, canUseAi, exportToken],
  )

  const presets = useMemo(() => (presetsData as { presets: Preset[] }).presets || [], [])
  const taxonomy = useMemo(
    () => (presetsData as { tagTaxonomy?: string[] }).tagTaxonomy || [],
    [],
  )

  const insertPreset = (p: Preset) => {
    const hint = `Preset "${p.label}": ${p.description}. Tags: ${p.tags.join(', ')}.`
    void runAssist(hint)
  }

  /** Direct visit without vault bridge: require sign-in + active paid plan */
  const gateBlocked =
    !hasVaultBridge && entitlementReady && (sessionUserId === null || paid === false)

  return (
    <div className="bg-gradient-frame min-h-screen">
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-serif-display text-primary text-lg font-semibold tracking-wider">CIRCE ET VENUS</p>
            <p className="text-muted-foreground text-xs">Frame — video bridge</p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href={`${CREATIX}/dashboard/ai-studio`}
              className="text-[var(--circe-light)] hover:underline"
            >
              AI Studio
            </a>
            <a href={`${CREATIX}/dashboard`} className="text-[var(--circe-light)] hover:underline">
              Dashboard
            </a>
            <a href={`${CREATIX}/dashboard/settings`} className="text-[var(--circe-light)] hover:underline">
              Subscription
            </a>
            <span className="text-muted-foreground">|</span>
            {sessionUserId ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  await createClient().auth.signOut()
                  setSessionUserId(null)
                  setPaid(null)
                }}
              >
                Sign out
              </button>
            ) : (
              <Link href="/auth/sign-in" className="text-[var(--gold)] font-medium hover:underline">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {!hasVaultBridge && (!authReady || !entitlementReady) ? (
        <p className="text-muted-foreground px-4 py-20 text-center text-sm">Loading…</p>
      ) : gateBlocked ? (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h2 className="font-serif-display mb-3 text-xl">
            {sessionUserId ? 'Subscription required' : 'Sign in required'}
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Open Frame from <strong>Media &amp; vault</strong> with a bridge link (manual export is free; AI uses
            credits). Or sign in here with an <strong>active paid</strong> Circe et Venus plan to use Frame from this
            URL directly.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {!sessionUserId ? (
              <Link
                href="/auth/sign-in"
                className="bg-primary text-primary-foreground inline-block rounded-lg px-5 py-2.5 text-sm font-semibold"
              >
                Sign in
              </Link>
            ) : null}
            <a
              href={`${CREATIX}/dashboard/settings`}
              className="border inline-block rounded-lg px-5 py-2.5 text-sm"
              style={{ borderColor: 'var(--border)' }}
            >
              Manage subscription
            </a>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="font-serif-display text-lg font-semibold">Preview &amp; manual export</h2>
            <p className="text-muted-foreground text-sm">
              <strong>No credits</strong> for uploads using the buttons below. Credits apply to{' '}
              <strong>Frame Assist</strong> (chat) and future automated scene/audio tools.
            </p>

            {!importUrl ? (
              <div
                className="rounded-xl border p-6 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
              >
                No <code className="text-[var(--circe-light)]">importUrl</code>. Launch from{' '}
                <a href={`${CREATIX}/dashboard/ai-studio`} className="text-[var(--circe-light)] underline">
                  Media &amp; vault
                </a>{' '}
                on the main site.
              </div>
            ) : (
              <div
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: 'var(--border)', background: '#000' }}
              >
                <video key={importUrl} src={importUrl} controls playsInline className="max-h-[55vh] w-full" />
              </div>
            )}

            <div
              className="flex flex-wrap gap-2 rounded-xl border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <button
                type="button"
                disabled={!canManualExport || exportBusy}
                onClick={() => void sendSourceToVault()}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                Send source file to vault
              </button>
              <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  disabled={!canManualExport || exportBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void pushFile(f)
                    e.target.value = ''
                  }}
                />
                Upload edited file…
              </label>
            </div>
            {exportStatus ? (
              <p className="text-muted-foreground rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                {exportStatus}
              </p>
            ) : null}
          </section>

          <section className="space-y-4">
            <h2 className="font-serif-display text-lg font-semibold">Frame Assist</h2>
            <p className="text-muted-foreground text-sm">
              Uses your <strong>AI credits</strong> on Circe et Venus (same metering as the dashboard). Sign in, or open
              from the vault so the bridge token applies. Divine Manager can steer workflows from the main app — this
              panel is the in-editor assistant.
            </p>

            <div
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Presets &amp; tags</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => insertPreset(p)}
                    disabled={!canUseAi || aiBusy}
                    className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-white/5 disabled:opacity-40"
                    style={{ borderColor: 'var(--border)' }}
                    title={p.description}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">Taxonomy: {taxonomy.join(' · ')}</p>
            </div>

            <div
              className="flex min-h-[220px] flex-col rounded-xl border"
              style={{ borderColor: 'var(--border)', background: 'oklch(0.1 0.01 285)' }}
            >
              <div className="max-h-64 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
                {chatMessages.length === 0 ? (
                  <p className="text-muted-foreground">
                    Ask for cuts, pacing, hooks, captions, or library tags — tuned for adult creator workflows.
                  </p>
                ) : (
                  chatMessages.map((m) => (
                    <div key={m.id} className={m.role === 'user' ? 'text-foreground' : 'text-[var(--circe-light)]'}>
                      <span className="text-muted-foreground text-xs uppercase">{m.role}</span>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  ))
                )}
              </div>
              <form
                className="border-t p-2"
                style={{ borderColor: 'var(--border)' }}
                onSubmit={(e) => {
                  e.preventDefault()
                  const t = chatInput.trim()
                  if (!t || !canUseAi) return
                  void runAssist(t)
                  setChatInput('')
                }}
              >
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={canUseAi ? 'Ask Frame Assist…' : 'Sign in or use vault bridge for AI'}
                    disabled={!canUseAi || aiBusy}
                    className="focus:ring-primary flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-40"
                    style={{ borderColor: 'var(--border)', background: 'oklch(0.12 0.01 285)' }}
                  />
                  <button
                    type="submit"
                    disabled={!canUseAi || aiBusy || !chatInput.trim()}
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
            {aiError ? <p className="text-sm text-red-400">{aiError}</p> : null}

            <div
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <h3 className="font-serif-display mb-2 text-base font-semibold">Ariadne Trace</h3>
              <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                Per-recipient <strong>forensic marking</strong>: invisible, signal-level identifiers embedded in exports
                so leaked copies can be traced — aligned with DMCA workflows. Not a visible watermark; designed for
                detection after re-encode. Configure recipient keys from the vault / Ariadne flows on the main site.
              </p>
              {tracedExportEnabled ? (
                <div className="mb-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={traceRecipientKey}
                      onChange={(e) => setTraceRecipientKey(e.target.value)}
                      placeholder="Recipient key (single export)"
                      className="flex-1 rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSingleTrace()}
                      disabled={!canTrace || traceBusy}
                      className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
                    >
                      Export traced copy
                    </button>
                  </div>
                  <textarea
                    value={traceBatchRaw}
                    onChange={(e) => setTraceBatchRaw(e.target.value)}
                    placeholder="Batch traced variants: one recipient key per line"
                    rows={4}
                    className="w-full rounded-lg border px-3 py-2 text-xs"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleBatchTrace()}
                    disabled={!traceBatchRaw.trim() || traceBusy || !contentId || !exportToken}
                    className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Batch export traced variants
                  </button>
                  {traceStatus ? (
                    <p
                      className="text-muted-foreground whitespace-pre-wrap rounded border p-2 text-xs"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      {traceStatus}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <a
                href={`${CREATIX}/dashboard/ai-studio`}
                className="text-[var(--circe-light)] text-sm underline"
              >
                Open Ariadne &amp; protection tools →
              </a>
            </div>

            <div
              className="rounded-xl border border-dashed p-4"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="text-muted-foreground text-xs leading-relaxed">
                <strong>Roadmap:</strong> auto-clips from scene changes, audio peaks, and motion (adult workflow
                presets), voice-driven edits via Divine, and deeper NexGuard-style robustness for Ariadne Trace.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
