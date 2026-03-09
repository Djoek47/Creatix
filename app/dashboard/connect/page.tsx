'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Link2, CheckCircle2 } from 'lucide-react'
import type { Platform } from '@/lib/types'

const PLATFORMS: { id: Platform; name: string; description: string }[] = [
  { id: 'onlyfans', name: 'OnlyFans', description: 'Connect your OnlyFans account to manage fans, messages, and earnings.' },
  { id: 'mym', name: 'MYM', description: 'Connect your MYM account to sync subscribers and content performance.' },
  { id: 'fansly', name: 'Fansly', description: 'Connect your Fansly account to import fans and analytics.' },
]

export default function ConnectPlatformPage() {
  const router = useRouter()
  const [connecting, setConnecting] = useState<Platform | null>(null)
  const [connected, setConnected] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/connect')
      .then((r) => r.json())
      .then((data) => data.platforms && setConnected(data.platforms))
      .finally(() => setLoading(false))
  }, [])

  async function handleConnect(platform: Platform) {
    setConnecting(platform)
    try {
      const res = await fetch(`/api/connect/${platform}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      setConnected((prev) => [...prev, platform])
      // Optionally sync data after connect
      await fetch(`/api/connect/${platform}/sync`, { method: 'POST' })
    } catch (e) {
      console.error(e)
    } finally {
      setConnecting(null)
    }
  }

  function handleContinue() {
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <Image src="/logo.png" alt="Circe and Venus" width={48} height={48} className="mx-auto h-12 w-12 rounded-xl object-contain" />
        <h2 className="text-3xl font-bold text-gray-800">Connect your platform</h2>
        <p className="text-lg text-gray-600">
          Choose the platform you want under management. We&apos;ll connect via API and pull your data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : PLATFORMS.map((platform) => {
          const isConnecting = connecting === platform.id
          const isConnected = connected.includes(platform.id)
          return (
            <Card key={platform.id} variant="visual" className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-title text-lg">{platform.name}</CardTitle>
                  {isConnected ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" /> Connected
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(platform.id)}
                      disabled={!!connecting}
                      className="gap-2"
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
                <CardDescription>{platform.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <Card variant="visual" className="border-purple-100 bg-purple-50/50 dark:bg-purple-950/20">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connecting authorizes Circe and Venus to read your account data (fans, messages, earnings) from the selected platform so we can manage and analyze it. You can disconnect anytime in Settings.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button size="lg" onClick={handleContinue} className="gap-2 px-8">
          Continue to dashboard
        </Button>
      </div>
    </div>
  )
}
