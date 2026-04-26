'use client'

import { useCallback, useState } from 'react'

type UseFrameExportInput = {
  hasVaultBridge: boolean
  importUrl: string
  exportUrl: string
  exportToken: string
}

export function useFrameExport(input: UseFrameExportInput) {
  const { hasVaultBridge, importUrl, exportUrl, exportToken } = input
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [exportBusy, setExportBusy] = useState(false)

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
      } catch (error) {
        setExportStatus(error instanceof Error ? error.message : 'Upload failed')
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
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? `${error.message} — If CORS failed, confirm NEXT_PUBLIC_FRAME_URL on Creatix matches this host.`
          : 'Could not fetch source',
      )
      setExportBusy(false)
    }
  }, [hasVaultBridge, importUrl, pushFile])

  return {
    exportStatus,
    exportBusy,
    pushFile,
    sendSourceToVault,
  }
}

