'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isPaidSubscription } from '@/lib/billing'
import { AssistPanel } from '@/components/frame-workspace/assist-panel'
import { DivineActionPanel } from '@/components/frame-workspace/divine-action-panel'
import { ManualExportPanel } from '@/components/frame-workspace/manual-export-panel'
import { RouteNav, viewTitle } from '@/components/frame-workspace/route-nav'
import { TracePanel } from '@/components/frame-workspace/trace-panel'
import type { EditorView, Preset } from '@/components/frame-workspace/types'
import type { BrandWatermarkDefaults } from '@/lib/brand/brand-profile-types'
import presetsData from '@/lib/data/frame-edit-presets.json'
import { applyDivineEditorActions, dryRunDivineEditorActions, type AppliedDivineAction } from '@/lib/frame/divine/action-applier'
import type { DivineEditorAction } from '@/lib/frame/divine/actions'
import { useFrameExport } from '@/lib/frame/use-frame-export'
import { useFrameRender } from '@/lib/frame/use-frame-render'
import { useFrameTrace } from '@/lib/frame/use-frame-trace'
import { useFrameAssist } from '@/lib/frame/use-frame-assist'
import { buildEditPlan, type AspectPreset, type EditOutputFormat } from '@/lib/frame/export/edit-plan'
import { hashPlanJson } from '@/lib/frame/export/plan-hash'
import {
  FRAME_LIBRARY_SELECTION_KEY,
  type LibrarySelectionItem,
  useProjectDraft,
} from '@/lib/frame/timeline/use-project-draft'

const CREATIX = process.env.NEXT_PUBLIC_CREATIX_APP_URL || 'https://www.circeetvenus.com'
const MARKIT_BRIDGE_CONTEXT_KEY = 'markit:bridge-context:v1'
const MARKIT_TRACE_OPERATIONS_ENABLED = process.env.NEXT_PUBLIC_MARKIT_TRACE_OPERATIONS_ENABLED !== 'false'
const MARKIT_RENDER_QUEUE_ENABLED = process.env.NEXT_PUBLIC_MARKIT_RENDER_QUEUE_ENABLED !== 'false'
const MARKIT_DIVINE_ACTIONS_ENABLED = process.env.NEXT_PUBLIC_MARKIT_DIVINE_ACTIONS_ENABLED === 'true'

type EditorShellMode = 'simple' | 'pro'

export function EditorApp({
  initialView = 'setup',
  shellPath,
  editorMode = 'pro',
}: {
  initialView?: EditorView
  shellPath?: string
  editorMode?: EditorShellMode
}) {
  const sp = useSearchParams()
  const importUrl = sp.get('importUrl') || ''
  const exportUrl = sp.get('exportUrl') || ''
  const exportToken = sp.get('exportToken') || ''
  const contentId = sp.get('contentId') || ''
  const viewParam = (sp.get('view') || '').toLowerCase()
  const focusClipId = sp.get('focusClip') || ''
  const activeView: EditorView =
    viewParam === 'setup' || viewParam === 'edit' || viewParam === 'export' || viewParam === 'detect'
      ? (viewParam as EditorView)
      : initialView

  const hasVaultBridge = Boolean(importUrl && exportUrl && exportToken)

  useEffect(() => {
    if (!contentId || !exportToken) return
    const payload = {
      contentId,
      exportToken,
      importUrl,
      exportUrl,
      savedAt: new Date().toISOString(),
    }
    const serialized = JSON.stringify(payload)
    try {
      window.sessionStorage.setItem(MARKIT_BRIDGE_CONTEXT_KEY, serialized)
    } catch {
      // best-effort persistence
    }
    try {
      window.localStorage.setItem(MARKIT_BRIDGE_CONTEXT_KEY, serialized)
    } catch {
      // best-effort persistence
    }
  }, [contentId, exportToken, importUrl, exportUrl])

  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [paid, setPaid] = useState<boolean | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [entitlementReady, setEntitlementReady] = useState(false)
  const [libraryHydrated, setLibraryHydrated] = useState(false)
  const [librarySyncNotice, setLibrarySyncNotice] = useState<string | null>(null)
  const [autoRecipientClipId, setAutoRecipientClipId] = useState<string | null>(null)

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

  useEffect(() => {
    if (!authReady) return
    let cancelled = false
    void fetch('/api/brand/profile', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (cancelled || !data?.profile?.watermarkDefaults) return
        const defaults = data.profile.watermarkDefaults as BrandWatermarkDefaults
        setBrandWatermarkDefaults(defaults)
        if (defaults.traceRecipientPrefix) {
          setTraceRecipientKey((prev) => (prev.trim() ? prev : `${defaults.traceRecipientPrefix}-`))
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [authReady])

  const [brandWatermarkDefaults, setBrandWatermarkDefaults] = useState<BrandWatermarkDefaults | null>(null)

  const canManualExport = hasVaultBridge
  const tracedExportEnabled = process.env.NEXT_PUBLIC_FRAMER_TRACED_EXPORT_ENABLED === 'true'
  const traceOperationsEnabled = tracedExportEnabled && MARKIT_TRACE_OPERATIONS_ENABLED
  const renderQueueEnabled = MARKIT_RENDER_QUEUE_ENABLED
  const divineActionsEnabled = MARKIT_DIVINE_ACTIONS_ENABLED && editorMode === 'pro'
  const { exportStatus, exportBusy, pushFile, sendSourceToVault } = useFrameExport({
    hasVaultBridge,
    importUrl,
    exportUrl,
    exportToken,
  })

  /** AI debits credits on Creatix; vault bridge token or signed-in session both work. */
  const canUseAi = hasVaultBridge || Boolean(sessionUserId)
  const { chatInput, setChatInput, chatMessages, aiBusy, aiError, runAssist, submitChat } = useFrameAssist({
    canUseAi,
    vaultExportToken: exportToken,
  })
  const {
    project,
    setProjectName,
    resetProject,
    addPlaceholderClip,
    importLibrarySelection,
    setImageClipDuration,
    setClipTrim,
    setClipCrop,
    summary: projectSummary,
    lastSavedAt,
  } = useProjectDraft()
  const focusedClip = useMemo(() => {
    if (!focusClipId) return null
    const clip = project.timeline.clips.find((item) => item.id === focusClipId)
    if (!clip) return null
    const media = project.media.find((item) => item.id === clip.mediaId)
    const track = project.timeline.tracks.find((item) => item.id === clip.trackId)
    return {
      id: clip.id,
      mediaName: media?.name || 'Imported clip',
      trackLabel: track?.label || 'Track',
      startSec: clip.startSec,
      endSec: clip.outSec,
      durationSec: Math.max(0, clip.outSec - clip.inSec),
    }
  }, [focusClipId, project.media, project.timeline.clips, project.timeline.tracks])
  const [exportFormat, setExportFormat] = useState<EditOutputFormat>('mp4')
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('9:16-of')
  const editPlan = useMemo(
    () => buildEditPlan(project, { format: exportFormat, aspect: aspectPreset }),
    [aspectPreset, exportFormat, project],
  )
  const editPlanJson = useMemo(() => JSON.stringify(editPlan, null, 2), [editPlan])
  const planHash = useMemo(() => hashPlanJson(editPlanJson), [editPlanJson])
  const encoderProfile = useMemo(() => `${exportFormat}-${aspectPreset}`, [aspectPreset, exportFormat])
  const {
    traceRecipientKey,
    setTraceRecipientKey,
    traceBatchRaw,
    setTraceBatchRaw,
    traceBusy,
    traceStatus,
    detectFile,
    setDetectFile,
    detectBusy,
    detectResult,
    setDetectResult,
    traceHistory,
    traceRuns,
    canTrace,
    canRunDetect,
    handleSingleTrace,
    handleBatchTrace,
    retryTraceRun,
    runDetect,
  } = useFrameTrace({
    creatixBase: CREATIX,
    tracedExportEnabled,
    contentId,
    exportToken,
    brandWatermarkDefaults,
    encoderProfile,
    planHash,
    focusedClip,
  })
  const { renderRuns, renderBusy, renderStatus, queueRender, retryRenderRun } = useFrameRender({
    contentId,
    exportToken,
    editPlan,
    encoderProfile,
    planHash,
    exportFormat,
    aspectPreset,
    focusedClip,
  })

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
  const availableViews: EditorView[] =
    editorMode === 'simple' ? ['setup', 'edit', 'export'] : ['setup', 'edit', 'export', 'detect']
  const fallbackView = availableViews.includes(initialView) ? initialView : availableViews[0]
  const resolvedView = availableViews.includes(activeView) ? activeView : fallbackView

  const routeWithBridge = (view: EditorView) => {
    const nextParams = new URLSearchParams(sp.toString())
    if (view === 'setup') {
      nextParams.delete('view')
    } else {
      nextParams.set('view', view)
    }
    if (shellPath) {
      const query = nextParams.toString()
      return `${shellPath}${query ? `?${query}` : ''}`
    }
    if (view === 'setup') {
      const query = nextParams.toString()
      return `/${query ? `?${query}` : ''}`
    }
    const query = nextParams.toString()
    return `/${view}${query ? `?${query}` : ''}`
  }
  const modeRoute = (mode: EditorShellMode) => {
    const query = sp.toString()
    return `/editor/${mode}${query ? `?${query}` : ''}`
  }
  const focusClipInExport = useCallback(
    (clipId: string) => {
      const params = new URLSearchParams(sp.toString())
      params.set('view', 'export')
      params.set('focusClip', clipId)
      const targetPath = shellPath || '/editor'
      window.location.href = `${targetPath}?${params.toString()}`
    },
    [shellPath, sp],
  )
  const applyDivineActions = useCallback(
    (actions: DivineEditorAction[]): AppliedDivineAction[] =>
      applyDivineEditorActions(actions, {
        setProjectName,
        addPlaceholderClip,
        setExportFormat,
        setAspectPreset,
        setTraceRecipientKey,
        setTraceBatchRaw,
        focusClipInExport,
        setImageClipDuration,
        setClipTrim,
        setClipCrop,
        hasClip: (clipId: string) => project.timeline.clips.some((clip) => clip.id === clipId),
        hasImageClip: (clipId: string) => {
          const clip = project.timeline.clips.find((item) => item.id === clipId)
          if (!clip) return false
          return project.media.some((item) => item.id === clip.mediaId && item.kind === 'image')
        },
        hasVisualClip: (clipId: string) => {
          const clip = project.timeline.clips.find((item) => item.id === clipId)
          if (!clip) return false
          return project.media.some((item) => item.id === clip.mediaId && (item.kind === 'image' || item.kind === 'video'))
        },
      }),
    [
      addPlaceholderClip,
      focusClipInExport,
      project.timeline.clips,
      project.media,
      setAspectPreset,
      setExportFormat,
      setTraceBatchRaw,
      setImageClipDuration,
      setClipTrim,
      setClipCrop,
      setProjectName,
      setTraceRecipientKey,
    ],
  )
  const previewDivineActions = useCallback(
    (actions: DivineEditorAction[]): AppliedDivineAction[] =>
      dryRunDivineEditorActions(actions, {
        hasClip: (clipId: string) => project.timeline.clips.some((clip) => clip.id === clipId),
        hasImageClip: (clipId: string) => {
          const clip = project.timeline.clips.find((item) => item.id === clipId)
          if (!clip) return false
          return project.media.some((item) => item.id === clip.mediaId && item.kind === 'image')
        },
        hasVisualClip: (clipId: string) => {
          const clip = project.timeline.clips.find((item) => item.id === clipId)
          if (!clip) return false
          return project.media.some((item) => item.id === clip.mediaId && (item.kind === 'image' || item.kind === 'video'))
        },
      }),
    [project.timeline.clips, project.media],
  )

  useEffect(() => {
    if (libraryHydrated) return
    if (sp.get('from') !== 'library') return
    setLibraryHydrated(true)
    try {
      const raw = window.sessionStorage.getItem(FRAME_LIBRARY_SELECTION_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { items?: LibrarySelectionItem[]; timestamp?: number }
      if (!parsed.items || parsed.items.length === 0) return
      importLibrarySelection(parsed.items)
      setLibrarySyncNotice(`Imported ${parsed.items.length} library item${parsed.items.length === 1 ? '' : 's'} into draft`)
    } catch {
      setLibrarySyncNotice('Library import was unavailable in this session')
    }
  }, [importLibrarySelection, libraryHydrated, sp])

  const showSetup = resolvedView === 'setup'
  const showEdit = resolvedView === 'edit'
  const showExport = resolvedView === 'export'
  const showDetect = resolvedView === 'detect'
  const showManualExport = showSetup || showExport
  const showTracePanel = editorMode === 'pro' && (showExport || showDetect)
  const focusClipInPlan = useMemo(
    () => (focusedClip ? editPlan.clips.some((clip) => clip.id === focusedClip.id) : false),
    [editPlan.clips, focusedClip],
  )

  useEffect(() => {
    if (!showExport || !focusedClip) return
    if (autoRecipientClipId === focusedClip.id) return
    if (traceRecipientKey.trim()) return
    const projectPart = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18)
    const mediaPart = focusedClip.mediaName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18)
    const clipPart = focusedClip.id.replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase()
    const generated = [projectPart || 'project', mediaPart || 'clip', clipPart || 'focus'].join('-')
    setTraceRecipientKey(generated)
    setAutoRecipientClipId(focusedClip.id)
  }, [autoRecipientClipId, focusedClip, project.name, setTraceRecipientKey, showExport, traceRecipientKey])

  return (
    <div className="bg-gradient-frame min-h-screen">
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-serif-display text-primary text-lg font-semibold tracking-wider">CIRCE ET VENUS</p>
            <p className="text-muted-foreground text-xs">Frame — video bridge</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground rounded-full border p-1 text-[11px]" style={{ borderColor: 'var(--border)' }}>
              <Link
                href={modeRoute('simple')}
                className={`rounded-full px-3 py-1 ${editorMode === 'simple' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                Simple
              </Link>
              <Link
                href={modeRoute('pro')}
                className={`rounded-full px-3 py-1 ${editorMode === 'pro' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                Pro
              </Link>
            </div>
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
      <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <h1 className="font-serif-display text-base font-semibold sm:text-lg">{viewTitle(resolvedView)}</h1>
          <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
            {editorMode}
          </span>
        </div>
        <RouteNav activeView={resolvedView} routeWithBridge={routeWithBridge} views={availableViews} />
      </div>
      {librarySyncNotice ? (
        <div className="mx-auto mt-2 max-w-7xl px-4">
          <p className="text-muted-foreground rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border)' }}>
            {librarySyncNotice}
          </p>
        </div>
      ) : null}

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
          {showManualExport ? (
            <ManualExportPanel
              showSetup={showSetup}
              creatixBase={CREATIX}
              importUrl={importUrl}
              hasVaultBridge={hasVaultBridge}
              sessionUserId={sessionUserId}
              paid={paid}
              contentId={contentId}
              canManualExport={canManualExport}
              exportBusy={exportBusy}
              exportStatus={exportStatus}
              sendSourceToVault={sendSourceToVault}
              pushFile={pushFile}
            />
          ) : (
            <section className="space-y-4">
              <div
                className="rounded-xl border border-dashed p-4 text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-muted-foreground">
                  This workspace is focused on {showEdit ? 'editing' : 'detection'}.
                </p>
              </div>
            </section>
          )}

          <section className="space-y-4">
            {showEdit ? (
              <AssistPanel
                presets={presets}
                taxonomy={taxonomy}
                canUseAi={canUseAi}
                aiBusy={aiBusy}
                aiError={aiError}
                chatInput={chatInput}
                chatMessages={chatMessages}
                setChatInput={setChatInput}
                insertPreset={insertPreset}
                submitChat={submitChat}
                projectName={project.name}
                projectSummary={projectSummary}
                editorMode={editorMode}
                mediaItems={project.media}
                timelineTracks={project.timeline.tracks}
                timelineClips={project.timeline.clips}
                focusClipInExport={focusClipInExport}
                setProjectName={setProjectName}
                addPlaceholderClip={addPlaceholderClip}
                setImageClipDuration={setImageClipDuration}
                resetProject={resetProject}
                lastSavedAt={lastSavedAt}
              />
            ) : null}
            {showEdit && editorMode === 'pro' ? (
              <DivineActionPanel enabled={divineActionsEnabled} onPreview={previewDivineActions} onApply={applyDivineActions} />
            ) : null}
            {showEdit && editorMode === 'simple' ? (
              <div className="rounded-xl border border-dashed p-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Simple mode keeps editing lightweight. Divine action streams and advanced trace/render automation are Pro-only.
                </p>
                <Link
                  href={routeWithBridge('edit').replace('/editor/simple', '/editor/pro')}
                  className="mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Switch to Pro mode
                </Link>
              </div>
            ) : null}

            {showTracePanel ? (
              <TracePanel
                showExport={showExport}
                creatixBase={CREATIX}
                tracedExportEnabled={tracedExportEnabled}
                traceOperationsEnabled={traceOperationsEnabled}
                renderQueueEnabled={renderQueueEnabled}
                brandWatermarkDefaults={brandWatermarkDefaults}
                traceRecipientKey={traceRecipientKey}
                setTraceRecipientKey={setTraceRecipientKey}
                traceBatchRaw={traceBatchRaw}
                setTraceBatchRaw={setTraceBatchRaw}
                traceBusy={traceBusy}
                traceStatus={traceStatus}
                canTrace={canTrace}
                canRunDetect={canRunDetect}
                detectBusy={detectBusy}
                detectResult={detectResult}
                setDetectFile={setDetectFile}
                setDetectResult={setDetectResult}
                handleSingleTrace={handleSingleTrace}
                handleBatchTrace={handleBatchTrace}
                runDetect={runDetect}
                contentId={contentId}
                exportToken={exportToken}
                exportFormat={exportFormat}
                setExportFormat={setExportFormat}
                aspectPreset={aspectPreset}
                setAspectPreset={setAspectPreset}
                editPlanJson={editPlanJson}
                encoderProfile={encoderProfile}
                planHash={planHash}
                traceHistory={traceHistory}
                traceRuns={traceRuns}
                retryTraceRun={retryTraceRun}
                renderRuns={renderRuns}
                renderBusy={renderBusy}
                renderStatus={renderStatus}
                queueRender={queueRender}
                retryRenderRun={retryRenderRun}
                focusedClip={focusedClip}
                focusClipInPlan={focusClipInPlan}
              />
            ) : (
              <div className="rounded-xl border border-dashed p-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {editorMode === 'simple'
                    ? 'Simple mode keeps export lightweight. Open Pro mode for trace generation and leak detection.'
                    : 'Use Export and Detect views for trace generation and attribution.'}
                </p>
                {editorMode === 'simple' ? (
                  <Link
                    href={routeWithBridge('edit').replace('/editor/simple', '/editor/pro')}
                    className="mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Open Pro mode
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}
      <footer className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-muted-foreground mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em]">
          <p>
            <span className="text-[var(--primary)]">●</span> Ready · {projectSummary.clips} clip
            {projectSummary.clips === 1 ? '' : 's'}
          </p>
          <p>
            <span className="text-[var(--gold)]">●</span> {editorMode} mode · {projectSummary.durationSec}s timeline
          </p>
        </div>
      </footer>
    </div>
  )
}
