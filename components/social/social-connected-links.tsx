'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink } from 'lucide-react'

export type SocialConnectionRow = {
  platform: string
  platform_username: string
  is_connected: boolean
}

interface SocialConnectedLinksProps {
  connections: SocialConnectionRow[]
}

export function SocialConnectedLinks({ connections }: SocialConnectedLinksProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const connectedPlatformLinks = connections.map((c) => ({
    platform: c.platform,
    username: c.platform_username,
    url:
      c.platform === 'onlyfans'
        ? `https://onlyfans.com/${c.platform_username}`
        : c.platform === 'fansly'
          ? `https://fansly.com/${c.platform_username}`
          : '',
  }))

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const bioBlock =
    connectedPlatformLinks
      .filter((l) => l.url)
      .map(
        (link) =>
          `${link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}: ${link.url}`,
      )
      .join('\n') || 'Connect your platforms to generate bio links'

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-none">
        <CardHeader className="space-y-1 pb-3 pt-6 sm:pt-7">
          <CardTitle className="text-base font-semibold tracking-tight">Creator platform links</CardTitle>
          <CardDescription className="text-[15px] leading-relaxed">
            OnlyFans and Fansly URLs for bios, DMs, and cross-posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-6 sm:px-6 sm:pb-7">
          {connectedPlatformLinks.filter((l) => l.url).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No platforms connected yet. Connect in Settings, then return here.
            </p>
          ) : (
            connectedPlatformLinks
              .filter((l) => l.url)
              .map((link) => (
                <div
                  key={link.platform}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium capitalize">{link.platform}</p>
                    <p className="text-sm text-muted-foreground">@{link.username}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="hidden max-w-[min(100%,28rem)] truncate rounded-md bg-muted px-2 py-1 text-xs sm:block">
                      {link.url}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-border/70 shadow-none"
                      onClick={() => copyToClipboard(link.url, link.platform)}
                      aria-label={`Copy ${link.platform} URL`}
                    >
                      {copied === link.platform ? (
                        <Check className="h-4 w-4" aria-hidden />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-border/70 shadow-none"
                      onClick={() => window.open(link.url, '_blank')}
                      aria-label={`Open ${link.platform} in new tab`}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-none">
        <CardHeader className="space-y-1 pb-3 pt-6 sm:pt-7">
          <CardTitle className="text-base font-semibold tracking-tight">Bio block</CardTitle>
          <CardDescription className="text-[15px] leading-relaxed">
            One copy-paste block for link-in-bio tools and social bios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-6 sm:px-6 sm:pb-7">
          <div className="rounded-xl border border-border/60 bg-background/50 p-4 font-mono text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
            {bioBlock}
          </div>
          {connectedPlatformLinks.filter((l) => l.url).length > 0 && (
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl border-border/70 shadow-none"
              onClick={() => copyToClipboard(bioBlock, 'bio')}
              aria-label="Copy all platform links for bio"
            >
              {copied === 'bio' ? (
                <>
                  <Check className="mr-2 h-4 w-4" aria-hidden />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" aria-hidden />
                  Copy all
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
