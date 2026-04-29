'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'
import { VoiceInputButton } from '@/components/voice-input-button'
import {
  compressImageForVision,
  extractVideoFrameAsDataUrl,
} from '@/components/ai/caption-media-utils'

export type CaptionGeneratorRunnerInputsProps = {
  easy: boolean
  platform: string
  setPlatform: (v: string) => void
  contentType: string
  setContentType: (v: string) => void
  captionImageDataUrl: string | null
  setCaptionImageDataUrl: (v: string | null) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
}

export function CaptionGeneratorRunnerInputs({
  easy,
  platform,
  setPlatform,
  contentType,
  setContentType,
  captionImageDataUrl,
  setCaptionImageDataUrl,
  contentDescription,
  setContentDescription,
}: CaptionGeneratorRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Platform</Label>
          <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
        </div>
        <div className="space-y-2">
          <Label>Upload a photo (or describe below)</Label>
          {captionImageDataUrl ? (
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
              <img
                src={captionImageDataUrl}
                alt="Preview for caption"
                className="max-h-40 w-full object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setCaptionImageDataUrl(null)}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4,video/quicktime,video/webm"
              className="cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  if (file.type.startsWith('video/')) {
                    const frame = await extractVideoFrameAsDataUrl(file)
                    const blob = await fetch(frame).then((r) => r.blob())
                    const compressed = await compressImageForVision(
                      new File([blob], 'frame.jpg', { type: 'image/jpeg' }),
                    )
                    setCaptionImageDataUrl(compressed)
                  } else {
                    const dataUrl = await compressImageForVision(file)
                    setCaptionImageDataUrl(dataUrl)
                  }
                } catch {
                  const reader = new FileReader()
                  reader.onload = () => setCaptionImageDataUrl(reader.result as string)
                  reader.readAsDataURL(file)
                }
              }}
            />
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>What should the post say? (optional if you added a photo)</Label>
            <VoiceInputButton
              onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
              size="sm"
              variant="ghost"
              showTooltip={true}
            />
          </div>
          <Textarea
            placeholder="e.g. flirty gym selfie, teasing PPV drop tonight…"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[88px]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="photoset">Photo Set</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="livestream">Livestream</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Upload photo or video (AI sees the frame)</Label>
        {captionImageDataUrl ? (
          <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
            <img
              src={captionImageDataUrl}
              alt="Preview for caption"
              className="max-h-48 w-full object-contain"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setCaptionImageDataUrl(null)}
            >
              Remove
            </Button>
          </div>
        ) : (
          <Input
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4,video/quicktime,video/webm"
            className="cursor-pointer"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                if (file.type.startsWith('video/')) {
                  const frame = await extractVideoFrameAsDataUrl(file)
                  const blob = await fetch(frame).then((r) => r.blob())
                  const compressed = await compressImageForVision(
                    new File([blob], 'frame.jpg', { type: 'image/jpeg' }),
                  )
                  setCaptionImageDataUrl(compressed)
                } else {
                  const dataUrl = await compressImageForVision(file)
                  setCaptionImageDataUrl(dataUrl)
                }
              } catch {
                const reader = new FileReader()
                reader.onload = () => setCaptionImageDataUrl(reader.result as string)
                reader.readAsDataURL(file)
              }
            }}
          />
        )}
        <p className="text-xs text-muted-foreground">
          For video we use one representative frame. In the box below you can ask for post copy—or a short script
          structure (hook, beats, on-screen text, CTA) for Reels/teasers.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Describe your content (optional if you uploaded media)</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
            showTooltip={true}
          />
        </div>
        <Textarea
          placeholder="Optional: tone and angle for captions — or ask for a tight video outline (hook → beats → CTA). Example: “30s Reels teaser, flirty, end with PPV link…”"
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}
