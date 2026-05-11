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
        markitLaunchUrl?: string | null
        frameLaunchUrl?: string | null
        assetProxyUrl?: string
        markitConfigured?: boolean
        frameConfigured?: boolean
      }
      if (!res.ok) {
        setLaunchMsg(j.error || 'Could not start editor session')
        return
      }
      const url = j.markitLaunchUrl || j.frameLaunchUrl || j.assetProxyUrl
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      if (!(j.markitConfigured ?? j.frameConfigured)) {
        setLaunchMsg(
          'NEXT_PUBLIC_MARKIT_URL is not set — opened the asset proxy only. Configure Markit, or use Replace video in the vault item.',
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
            <span className="rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-0 text-[0.62rem] uppercase leading-none tracking-tight text-amber-500 sm:text-[0.7rem] sm:tracking-wide">
              Beta
            </span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent
        overlayClassName="bg-zinc-950/40 backdrop-blur-[3px]"
        className={cn(
          'gap-0 overflow-hidden rounded-[1.35rem] border border-black/[0.06] p-0 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.38)] duration-300',
          'max-w-[calc(100%-2rem)] sm:max-w-[440px]',
          'bg-white/82 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-zinc-950/78 dark:shadow-[0_28px_90px_-24px_rgba(0,0,0,0.75)]',
          '[&_[data-slot=dialog-close]]:top-5 [&_[data-slot=dialog-close]]:right-5 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:opacity-55 [&_[data-slot=dialog-close]]:ring-offset-transparent hover:[&_[data-slot=dialog-close]]:opacity-100 hover:[&_[data-slot=dialog-close]]:bg-muted/60',
        )}
      >
        <DialogHeader className="space-y-3 px-8 pb-7 pt-9 text-left sm:space-y-3.5">
          <DialogTitle className="text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[1.625rem]">
            Edit a vault video
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-[1.55] text-muted-foreground/88">
            Opens Markit with the selected vault video already loaded. Choose a video below, or add one to your vault first.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[min(58vh,432px)] px-8 pb-2 [&_[data-slot=scroll-area-viewport]]:scroll-smooth">
          <div className="space-y-8 pb-8 pr-3">
            {loading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/35" />
              </div>
            ) : loadError ? (
              <p className="text-[15px] leading-snug text-destructive">{loadError}</p>
            ) : playable.length === 0 ? (
              <p className="text-[15px] leading-[1.6] text-muted-foreground/88">
                No videos with a hosted file yet. Create a vault item below and attach an MP4, or open an item in Media
                &amp; vault and use Replace video.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {playable.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={launchingId !== null}
                      onClick={() => void openEditor(r.id)}
                      className={cn(
                        'flex w-full items-start justify-between gap-4 rounded-xl border border-border/50 bg-muted/25 px-4 py-3.5 text-left transition-[background-color,border-color,transform] duration-200',
                        'hover:border-border/70 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        'disabled:pointer-events-none disabled:opacity-45',
                        'active:scale-[0.99]',
                      )}
                    >
                      <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-medium leading-snug tracking-[-0.01em] text-foreground">
                        {r.title || 'Untitled'}
                      </span>
                      {launchingId === r.id ? (
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground/60" />
                      ) : (
                        <span className="shrink-0 pt-0.5 text-[13px] font-medium text-muted-foreground/70">Open</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-border/45 pt-8">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                Add to vault
              </p>
              <VaultQuickAdd
                compact
                presentation="modal"
                onSuccess={() => {
                  void loadItems()
                }}
              />
            </div>
          </div>
        </ScrollArea>
        {launchMsg && (
          <p className="mx-8 mb-8 mt-1 rounded-xl border border-border/55 bg-muted/35 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            {launchMsg}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
