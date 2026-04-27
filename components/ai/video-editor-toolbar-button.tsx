'use client'

import { useState } from 'react'
import { Clapperboard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VaultQuickAdd } from '@/components/ai/vault-quick-add'
import { cn } from '@/lib/utils'

type VaultListItem = {
  id: string
  title: string
  content_type: string | null
  file_url: string | null
  vault_storage_path?: string | null
}

function isVideoRow(r: VaultListItem) {
  const t = (r.content_type || '').toLowerCase()
  return t === 'video' || t.includes('video')
}

function hasVaultVideoFile(r: VaultListItem) {
  if (r.vault_storage_path && r.vault_storage_path.length > 0) return true
  return Boolean(r.file_url && /^https?:\/\//i.test(r.file_url.trim()))
}

export function VideoEditorToolbarButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<VaultListItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [launchingId, setLaunchingId] = useState<string | null>(null)
  const [launchMsg, setLaunchMsg] = useState<string | null>(null)

  const loadItems = async () => {
    setLoading(true)
    setLoadError(null)
    setLaunchMsg(null)
    try {
      const res = await fetch('/api/content/vault')
      const j = (await res.json()) as { items?: VaultListItem[]; error?: string }
      if (!res.ok) {
        setLoadError(j.error || 'Could not load vault')
        setItems([])
        return
      }
      setItems(Array.isArray(j.items) ? j.items : [])
    } catch {
      setLoadError('Network error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const openEditor = async (id: string) => {
    setLaunchingId(id)
    setLaunchMsg(null)
    try {
      const res = await fetch(`/api/content/vault/${id}/frame-session`)
      const j = (await res.json()) as {
        error?: string
        frameLaunchUrl?: string | null
        assetProxyUrl?: string
        frameConfigured?: boolean
      }
      if (!res.ok) {
        setLaunchMsg(j.error || 'Could not start editor session')
        return
      }
      const url = j.frameLaunchUrl || j.assetProxyUrl
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      if (!j.frameConfigured) {
        setLaunchMsg(
          'NEXT_PUBLIC_FRAME_URL is not set — opened the asset proxy only. Deploy Frame separately, or use Replace video in the vault item.',
        )
      } else {
        setOpen(false)
      }
    } catch {
      setLaunchMsg('Network error')
    } finally {
      setLaunchingId(null)
    }
  }

  const playable = items.filter((r) => isVideoRow(r) && hasVaultVideoFile(r))

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) void loadItems()
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'group relative h-auto overflow-hidden rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/[0.1] via-card/85 to-purple-500/[0.12] px-4 py-3 text-sm font-medium',
            'shadow-[inset_0_0_0_1px_rgba(251,191,36,0.22),0_0_18px_-6px_rgba(168,85,247,0.28),0_0_14px_-4px_rgba(251,191,36,0.2)]',
            'transition-all duration-300',
            'hover:border-amber-400/50 hover:bg-gradient-to-br hover:from-amber-500/[0.14] hover:via-card/90 hover:to-purple-500/[0.16]',
            'hover:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35),0_0_24px_-4px_rgba(168,85,247,0.38),0_0_18px_-2px_rgba(251,191,36,0.28)]',
            'dark:border-amber-500/30 dark:from-amber-500/[0.12] dark:via-card/80 dark:to-purple-500/[0.14] dark:hover:from-amber-500/[0.16] dark:hover:via-card/85 dark:hover:to-purple-500/[0.18]',
            'sm:py-2.5',
            className,
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <Clapperboard
              className="h-4 w-4 shrink-0 text-amber-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.45)] transition-all group-hover:text-amber-200 group-hover:drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
              aria-hidden
            />
            <span>Video editor</span>
            <span className="rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-0 text-[0.7rem] uppercase leading-none tracking-wide text-amber-500">
              Beta
            </span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit a vault video</DialogTitle>
          <DialogDescription>
            Opens the Frame bridge in a new tab. Pick a video below, or add one to your Creatix vault first.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70vh,480px)] pr-3">
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : playable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No videos with a hosted file yet. Create a vault item below and attach an MP4, or open an item in Media
                &amp; vault and use Replace video.
              </p>
            ) : (
              <ul className="space-y-2">
                {playable.map((r) => (
                  <li key={r.id}>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-auto w-full justify-between gap-2 py-2 text-left font-normal"
                      disabled={launchingId !== null}
                      onClick={() => void openEditor(r.id)}
                    >
                      <span className="line-clamp-2 min-w-0 flex-1">{r.title || 'Untitled'}</span>
                      {launchingId === r.id ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">Open</span>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Add to Creatix vault</p>
              <VaultQuickAdd
                compact
                onSuccess={() => {
                  void loadItems()
                }}
              />
            </div>
          </div>
        </ScrollArea>
        {launchMsg && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-950 dark:text-amber-100">
            {launchMsg}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
