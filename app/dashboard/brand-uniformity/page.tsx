'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_BRAND_PROFILE, type BrandProfileV1 } from '@/lib/brand/brand-profile-types'

type VersionRow = {
  id: string
  profile_version: number
  markdown: string
  created_at: string
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function joinCsv(value: string[]): string {
  return value.join(', ')
}

export default function BrandUniformityPage() {
  const [profile, setProfile] = useState<BrandProfileV1>(DEFAULT_BRAND_PROFILE)
  const [markdown, setMarkdown] = useState('')
  const [version, setVersion] = useState(1)
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lintDraft, setLintDraft] = useState('')
  const [lintResult, setLintResult] = useState<null | {
    score: number
    verdict: string
    strengths: string[]
    issues: string[]
    rewrite: string
  }>(null)

  async function loadProfile() {
    const res = await fetch('/api/brand/profile', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setProfile(data.profile ?? DEFAULT_BRAND_PROFILE)
    setMarkdown(typeof data.markdown === 'string' ? data.markdown : '')
    setVersion(Number(data.version) || 1)
  }

  async function loadVersions() {
    const res = await fetch('/api/brand/profile/versions', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setVersions(Array.isArray(data.versions) ? data.versions : [])
  }

  useEffect(() => {
    void loadProfile()
    void loadVersions()
  }, [])

  const compactPreview = useMemo(() => {
    const line = [
      `Brand: ${profile.brandName || 'Creator Brand'}`,
      profile.tagline ? `Tagline: ${profile.tagline}` : '',
      `Tone: ${profile.toneTags.join(', ')}`,
      profile.doSay.length ? `Say: ${profile.doSay.slice(0, 4).join('; ')}` : '',
      profile.dontSay.length ? `Avoid: ${profile.dontSay.slice(0, 4).join('; ')}` : '',
      `Palette: ${profile.palette.primary}/${profile.palette.secondary}/${profile.palette.accent}`,
    ]
      .filter(Boolean)
      .join('\n')
    return line
  }, [profile])

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) || null,
    [selectedVersionId, versions],
  )

  const diffSummary = useMemo(() => {
    if (!selectedVersion) return null
    const currentLines = new Set(markdown.split('\n').map((x) => x.trim()).filter(Boolean))
    const oldLines = new Set(selectedVersion.markdown.split('\n').map((x) => x.trim()).filter(Boolean))
    let added = 0
    let removed = 0
    for (const line of currentLines) if (!oldLines.has(line)) added += 1
    for (const line of oldLines) if (!currentLines.has(line)) removed += 1
    return { added, removed }
  }, [markdown, selectedVersion])

  async function saveProfile() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/brand/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || 'Could not save profile')
      } else {
        setMessage('Brand profile saved.')
        setProfile(data.profile ?? profile)
        setMarkdown(data.markdown ?? markdown)
        setVersion(Number(data.version) || version)
        await loadVersions()
      }
    } finally {
      setBusy(false)
    }
  }

  async function downloadMarkdown() {
    const res = await fetch('/api/brand/profile/render', { credentials: 'include' })
    if (!res.ok) return
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `brand-uniformity-v${version}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  }

  async function restoreVersion(versionId: string) {
    const res = await fetch('/api/brand/profile/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId }),
    })
    if (!res.ok) return
    await loadProfile()
    await loadVersions()
    setMessage('Version restored.')
  }

  async function runLint() {
    if (!lintDraft.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/ai/brand-lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: lintDraft, channel: 'social-post' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setLintResult(data)
      else setMessage(data.error || 'Brand lint failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Branding</h1>
          <p className="text-sm text-muted-foreground">
            Define your brand once and reuse it across captions, ideas, and exports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Beta</Badge>
          <Badge variant="outline">v{version}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>Core brand identity used in `design.md` export and AI context.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Brand name</Label>
            <Input value={profile.brandName} onChange={(e) => setProfile((p) => ({ ...p, brandName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={profile.tagline || ''} onChange={(e) => setProfile((p) => ({ ...p, tagline: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Audience</Label>
            <Input value={profile.audience || ''} onChange={(e) => setProfile((p) => ({ ...p, audience: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Social handles (platform:@handle, comma separated)</Label>
            <Input
              value={Object.entries(profile.socialHandles).map(([k, v]) => `${k}:${v}`).join(', ')}
              onChange={(e) => {
                const map: Record<string, string> = {}
                for (const row of parseCsv(e.target.value)) {
                  const [k, v] = row.split(':')
                  if (!k || !v) continue
                  map[k.trim().toLowerCase()] = v.trim()
                }
                setProfile((p) => ({ ...p, socialHandles: map }))
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice</CardTitle>
          <CardDescription>Guidance for copy generation and brand governance checks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tone tags (comma separated)</Label>
            <Input value={joinCsv(profile.toneTags)} onChange={(e) => setProfile((p) => ({ ...p, toneTags: parseCsv(e.target.value) as BrandProfileV1['toneTags'] }))} />
          </div>
          <div className="space-y-2">
            <Label>Do say (comma separated)</Label>
            <Textarea value={joinCsv(profile.doSay)} onChange={(e) => setProfile((p) => ({ ...p, doSay: parseCsv(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label>Do not say (comma separated)</Label>
            <Textarea value={joinCsv(profile.dontSay)} onChange={(e) => setProfile((p) => ({ ...p, dontSay: parseCsv(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label>Hard banned phrases (comma separated)</Label>
            <Textarea value={joinCsv(profile.bannedPhrases)} onChange={(e) => setProfile((p) => ({ ...p, bannedPhrases: parseCsv(e.target.value) }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visual system + watermark defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Primary</Label>
            <Input value={profile.palette.primary} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, primary: e.target.value } }))} />
          </div>
          <div className="space-y-2">
            <Label>Secondary</Label>
            <Input value={profile.palette.secondary} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, secondary: e.target.value } }))} />
          </div>
          <div className="space-y-2">
            <Label>Accent</Label>
            <Input value={profile.palette.accent} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, accent: e.target.value } }))} />
          </div>
          <div className="space-y-2">
            <Label>Background</Label>
            <Input value={profile.palette.background} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, background: e.target.value } }))} />
          </div>
          <div className="space-y-2">
            <Label>Text</Label>
            <Input value={profile.palette.text} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, text: e.target.value } }))} />
          </div>
          <div className="space-y-2">
            <Label>Watermark placement</Label>
            <Select
              value={profile.watermarkDefaults.placement}
              onValueChange={(v) =>
                setProfile((p) => ({ ...p, watermarkDefaults: { ...p.watermarkDefaults, placement: v as BrandProfileV1['watermarkDefaults']['placement'] } }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-left">Top left</SelectItem>
                <SelectItem value="top-right">Top right</SelectItem>
                <SelectItem value="bottom-left">Bottom left</SelectItem>
                <SelectItem value="bottom-right">Bottom right</SelectItem>
                <SelectItem value="center">Center</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Opacity %</Label>
            <Input
              type="number"
              value={profile.watermarkDefaults.opacityPct}
              onChange={(e) => setProfile((p) => ({ ...p, watermarkDefaults: { ...p.watermarkDefaults, opacityPct: Number(e.target.value) || 70 } }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Scale %</Label>
            <Input
              type="number"
              value={profile.watermarkDefaults.scalePct}
              onChange={(e) => setProfile((p) => ({ ...p, watermarkDefaults: { ...p.watermarkDefaults, scalePct: Number(e.target.value) || 16 } }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Trace recipient prefix</Label>
            <Input
              value={profile.watermarkDefaults.traceRecipientPrefix}
              onChange={(e) => setProfile((p) => ({ ...p, watermarkDefaults: { ...p.watermarkDefaults, traceRecipientPrefix: e.target.value } }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Governance</CardTitle>
          <CardDescription>Warn or block off-brand text in integrated publishing flows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Use brand context for AI</p>
              <p className="text-sm text-muted-foreground">Applies to captioning and content ideas routes.</p>
            </div>
            <Switch
              checked={profile.useBrandContextForAi}
              onCheckedChange={(checked) => setProfile((p) => ({ ...p, useBrandContextForAi: checked }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Enforcement mode</Label>
            <Select
              value={profile.governance.enforcementMode}
              onValueChange={(v) =>
                setProfile((p) => ({ ...p, governance: { ...p.governance, enforcementMode: v as BrandProfileV1['governance']['enforcementMode'] } }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="block">Block</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Editor user IDs (comma separated, beta)</Label>
            <Input
              value={joinCsv(profile.governance.editorUserIds || [])}
              onChange={(e) => setProfile((p) => ({ ...p, governance: { ...p.governance, editorUserIds: parseCsv(e.target.value) } }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Approver user IDs (comma separated, beta)</Label>
            <Input
              value={joinCsv(profile.governance.approverUserIds || [])}
              onChange={(e) => setProfile((p) => ({ ...p, governance: { ...p.governance, approverUserIds: parseCsv(e.target.value) } }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand lint preview</CardTitle>
          <CardDescription>Optional QA score for a draft before publishing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Paste a draft caption or post idea..."
            value={lintDraft}
            onChange={(e) => setLintDraft(e.target.value)}
          />
          <Button variant="outline" onClick={runLint} disabled={busy || !lintDraft.trim()}>
            Run brand lint
          </Button>
          {lintResult && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                Score {lintResult.score} / 100 ({lintResult.verdict})
              </p>
              <p className="mt-2 text-muted-foreground">Strengths: {lintResult.strengths.join(' • ') || '—'}</p>
              <p className="mt-2 text-muted-foreground">Issues: {lintResult.issues.join(' • ') || '—'}</p>
              <Separator className="my-2" />
              <p className="font-medium">Suggested rewrite</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{lintResult.rewrite}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export, compact context, and version history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveProfile} disabled={busy}>Save profile</Button>
            <Button variant="outline" onClick={downloadMarkdown}>Download design.md</Button>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Compact context preview</Label>
              <Textarea value={compactPreview} readOnly className="min-h-[130px]" />
            </div>
            <div className="space-y-2">
              <Label>Markdown preview</Label>
              <Textarea value={markdown} readOnly className="min-h-[130px]" />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Saved versions</Label>
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                  <div>
                    <p className="font-medium">v{v.profile_version}</p>
                    <p className="text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedVersionId(v.id)}>
                      Diff
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => restoreVersion(v.id)}>
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
              {!versions.length && <p className="text-sm text-muted-foreground">No saved versions yet.</p>}
            </div>
          </div>
          {selectedVersion ? (
            <div className="space-y-2">
              <Label>Diff preview vs v{selectedVersion.profile_version}</Label>
              <p className="text-xs text-muted-foreground">
                Approximate line delta: +{diffSummary?.added ?? 0} / -{diffSummary?.removed ?? 0}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Textarea value={selectedVersion.markdown} readOnly className="min-h-[180px]" />
                <Textarea value={markdown} readOnly className="min-h-[180px]" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

