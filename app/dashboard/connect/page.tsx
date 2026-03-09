'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Link2, CheckCircle2, RefreshCw, Unplug } from 'lucide-react'
import type { Platform } from '@/lib/types'

const PLATFORMS: { id: Platform; name: string; description: string }[] = [
  { id: 'onlyfans', name: 'OnlyFans', description: 'Connect your OnlyFans account to manage fans, messages, and earnings.' },
  { id: 'mym', name: 'MYM', description: 'Connect your MYM account to sync subscribers and content performance.' },
  { id: 'fansly', name: 'Fansly', description: 'Connect your Fansly account to import fans and analytics.' },
]

export default function ConnectPlatformPage() {
  const router = useRouter()
  const [connecting, setConnecting] = useState<Platform | null>(null)
  const [syncing, setSyncing] = useState<Platform | null>(null)
  const [disconnecting, setDisconnecting] = useState<Platform | null>(null)
  const [connected, setConnected] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)

  function refreshConnected() {
    return fetch('/api/connect')
      .then((r) => r.json())
      .then((data) => data.platforms && setConnected(data.platforms || []))
  }

  useEffect(() => {
    refreshConnected().finally(() => setLoading(false))
  }, [])

  async function handleConnect(platform: Platform) {
    setConnecting(platform)
    try {
      const res = await fetch(`/api/connect/${platform}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      setConnected((prev) => [...prev, platform])
      await fetch(`/api/connect/${platform}/sync`, { method: 'POST' })
    } catch (e) {
      console.error(e)
    } finally {
      setConnecting(null)
    }
  }

  async function handleSync(platform: Platform) {
    setSyncing(platform)
    try {
      const res = await fetch(`/api/connect/${platform}/sync`, { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      await refreshConnected()
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(null)
    }
  }

  async function handleDisconnect(platform: Platform) {
    setDisconnecting(platform)
    try {
      const res = await fetch(`/api/connect/${platform}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Disconnect failed')
      setConnected((prev) => prev.filter((p) => p !== platform))
    } catch (e) {
      console.error(e)
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid gap-4 sm:grid-cols-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : PLATFORMS.map((platform) => {
          const isConnecting = connecting === platform.id
          const isConnected = connected.includes(platform.id)
          const isSyncing = syncing === platform.id
          const isDisconnecting = disconnecting === platform.id
          return (
            <Card key={platform.id} variant="brand" className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="font-title text-lg">{platform.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" /> Connected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(platform.id)}
                          disabled={!!syncing || !!disconnecting}
                          className="gap-1.5"
                        >
                          {isSyncing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Sync
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={!!syncing || !!disconnecting}
                          className="gap-1.5 text-muted-foreground hover:text-destructive"
                        >
                          {isDisconnecting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Unplug className="h-3.5 w-3.5" />
                          )}
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(platform.id)}
                        disabled={!!connecting}
                        className="brand-button gap-2"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Connecting…
                          </>
                        ) : (
                          <>
                            <Link2 className="h-4 w-4" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>{platform.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <Card variant="brand" className="bg-accent/10">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Connecting authorizes Circe and Venus to read your account data (fans, messages, earnings) from the selected platform so we can manage and analyze it. You can disconnect anytime in Settings.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button size="lg" onClick={handleContinue} className="brand-button gap-2 px-8">
          Continue to dashboard
        </Button>
      </div>
    </div>
  )
}
