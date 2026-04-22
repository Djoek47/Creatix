'use client'

import type { MutableRefObject } from 'react'
import { Loader2, Mic } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { VoiceInputButton } from '@/components/voice-input-button'
import type { VoiceSessionContextValue } from '@/components/divine/voice-session-context'
import { compressImageForVision } from '@/components/ai/caption-media-utils'

export type PhotoEnhancerRunnerInputsProps = {
  easy: boolean
  photoEditImageDataUrl: string | null
  setPhotoEditImageDataUrl: (v: string | null) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  voiceSession: VoiceSessionContextValue | null
  photoVoiceImageRef: MutableRefObject<string | null>
}

export function PhotoEnhancerRunnerInputs({
  easy,
  photoEditImageDataUrl,
  setPhotoEditImageDataUrl,
  contentDescription,
  setContentDescription,
  voiceSession,
  photoVoiceImageRef,
}: PhotoEnhancerRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Photo</Label>
          {photoEditImageDataUrl ? (
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
              <img
                src={photoEditImageDataUrl}
                alt="Photo to edit"
                className="max-h-48 w-full object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setPhotoEditImageDataUrl(null)}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              className="cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const compressed = await compressImageForVision(file)
                  setPhotoEditImageDataUrl(compressed)
                } catch {
                  const reader = new FileReader()
                  reader.onload = () => setPhotoEditImageDataUrl(reader.result as string)
                  reader.readAsDataURL(file)
                }
              }}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>What should change?</Label>
          <Textarea
            placeholder="e.g. blur background, brighten face, add subtle glow…"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[88px]"
          />
          <p className="text-[11px] text-muted-foreground">Pro mode adds voice touch-up and more controls.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Upload photo (JPEG / PNG)</Label>
        {photoEditImageDataUrl ? (
          <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
            <img src={photoEditImageDataUrl} alt="Photo to edit" className="max-h-56 w-full object-contain" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setPhotoEditImageDataUrl(null)}
            >
              Remove
            </Button>
          </div>
        ) : (
          <Input
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp"
            className="cursor-pointer"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const compressed = await compressImageForVision(file)
                setPhotoEditImageDataUrl(compressed)
              } catch {
                const reader = new FileReader()
                reader.onload = () => setPhotoEditImageDataUrl(reader.result as string)
                reader.readAsDataURL(file)
              }
            }}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Say what you want in plain language — e.g. &quot;blur the background more&quot;, &quot;brighter&quot;,
          &quot;heart emoji top right&quot;. Mic uses voice-to-text (same idea as Mimic interview).
        </p>
      </div>
      {voiceSession && (
        <div className="space-y-2 rounded-lg border border-sky-500/25 bg-sky-500/5 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-sky-700 dark:text-sky-300">
            <Mic className="h-3.5 w-3.5" />
            OpenAI Realtime voice (like Mimic interview)
          </div>
          <p className="text-[11px] text-muted-foreground">
            Speak naturally; the assistant calls the same safe edit pipeline. Keep this tab open. Results appear below
            when a tool applies.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={
                !photoEditImageDataUrl ||
                voiceSession.status === 'connecting' ||
                voiceSession.status === 'connected'
              }
              onClick={() =>
                void voiceSession.startVoiceCall({
                  realtimePath: '/api/ai/photo-touchup-realtime',
                  toolPath: '/api/ai/photo-touchup-voice-tool',
                  getToolBodyExtras: () => ({
                    imageBase64: photoVoiceImageRef.current || '',
                  }),
                })
              }
            >
              {voiceSession.status === 'connecting' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span className="ml-1.5">
                {voiceSession.status === 'connected' ? 'Voice active' : 'Start voice session'}
              </span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={voiceSession.status !== 'connected'}
              onClick={() => voiceSession.endVoiceCall()}
            >
              End voice
            </Button>
            <Badge variant="outline" className="text-[10px] capitalize">
              {voiceSession.status}
            </Badge>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>How should we touch up this photo?</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
            showTooltip={true}
          />
        </div>
        <Textarea
          placeholder="e.g. Soften the whole image for privacy, brighten slightly, add a sparkle emoji near the corner…"
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}
