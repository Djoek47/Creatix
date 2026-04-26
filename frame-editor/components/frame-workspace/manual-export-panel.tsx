type ManualExportPanelProps = {
  showSetup: boolean
  creatixBase: string
  importUrl: string
  hasVaultBridge: boolean
  sessionUserId: string | null
  paid: boolean | null
  contentId: string
  canManualExport: boolean
  exportBusy: boolean
  exportStatus: string | null
  sendSourceToVault: () => Promise<void>
  pushFile: (file: File) => Promise<void>
}

export function ManualExportPanel({
  showSetup,
  creatixBase,
  importUrl,
  hasVaultBridge,
  sessionUserId,
  paid,
  contentId,
  canManualExport,
  exportBusy,
  exportStatus,
  sendSourceToVault,
  pushFile,
}: ManualExportPanelProps) {
  return (
    <section className="space-y-4">
      <h2 className="font-serif-display text-lg font-semibold">
        {showSetup ? 'Bridge and source check' : 'Preview & manual export'}
      </h2>
      <p className="text-muted-foreground text-sm">
        {showSetup ? (
          <>Validate bridge details before editing, exporting, or running recipient trace workflows.</>
        ) : (
          <>
            <strong>No credits</strong> for manual uploads. Credits apply to AI and trace operations.
          </>
        )}
      </p>

      {!importUrl ? (
        <div
          className="rounded-xl border p-6 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          No <code className="text-[var(--circe-light)]">importUrl</code>. Launch from{' '}
          <a href={`${creatixBase}/dashboard/ai-studio`} className="text-[var(--circe-light)] underline">
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

      {showSetup ? (
        <div
          className="rounded-xl border p-4 text-xs"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <p className="text-muted-foreground mb-2 text-sm">Session checks</p>
          <div className="space-y-1">
            <p>Vault bridge: {hasVaultBridge ? 'connected' : 'missing'}</p>
            <p>Signed in user: {sessionUserId ? sessionUserId : '(none)'}</p>
            <p>Paid plan: {paid ? 'yes' : 'no / unknown'}</p>
            <p>Content id: {contentId || '(missing)'}</p>
          </div>
        </div>
      ) : null}

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
  )
}

