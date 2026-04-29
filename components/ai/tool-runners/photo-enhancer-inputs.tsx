'use client'

import type { MutableRefObject } from 'react'
import { Loader2, Mic } from 'lucide-react'
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
          Describe what to change in plain language — blur, brighten, stickers, and similar edits work well.
        </p>
      </div>
      {voiceSession && (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-sm text-muted-foreground">
              <span className="sr-only">OpenAI Realtime voice. </span>
              <span className="tabular-nums capitalize" aria-live="polite">
                {voiceSession.status === 'idle' && 'Ready'}
                {voiceSession.status === 'connecting' && 'Connecting'}
                {voiceSession.status === 'connected' && 'Live'}
                {voiceSession.status === 'error' && 'Error'}
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="default"
                className="h-10 w-10 rounded-full"
                disabled={
                  !photoEditImageDataUrl ||
                  voiceSession.status === 'connecting' ||
                  voiceSession.status === 'connected'
                }
                aria-label={
                  voiceSession.status === 'connecting'
                    ? 'Connecting voice session'
                    : voiceSession.status === 'connected'
                      ? 'Voice session active'
                      : 'Start OpenAI Realtime voice session'
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
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                disabled={voiceSession.status !== 'connected'}
                aria-label="End voice session"
                onClick={() => voiceSession.endVoiceCall()}
              >
                End
              </Button>
            </div>
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
