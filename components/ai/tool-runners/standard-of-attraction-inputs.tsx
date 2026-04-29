'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'
import { VoiceInputButton } from '@/components/voice-input-button'
import { compressImageForVision } from '@/components/ai/caption-media-utils'

export type StandardOfAttractionRunnerInputsProps = {
  easy: boolean
  attractionImage: string | null
  setAttractionImage: (v: string | null) => void
  niche: string
  setNiche: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
}

export function StandardOfAttractionRunnerInputs({
  easy,
  attractionImage,
  setAttractionImage,
  niche,
  setNiche,
  platform,
  setPlatform,
  contentDescription,
  setContentDescription,
}: StandardOfAttractionRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Photo (or describe below)</Label>
          {attractionImage ? (
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
              <img src={attractionImage} alt="Upload" className="max-h-40 w-full object-contain" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setAttractionImage(null)}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  setAttractionImage(await compressImageForVision(file))
                } catch {
                  const reader = new FileReader()
                  reader.onload = () => setAttractionImage(reader.result as string)
                  reader.readAsDataURL(file)
                }
              }}
            />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Niche (optional)</Label>
            <Input placeholder="e.g. fitness, cosplay…" value={niche} onChange={(e) => setNiche(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Describe the shot (optional if you uploaded)</Label>
          <Textarea
            placeholder="Setting, outfit, vibe — helps the judges…"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Your Niche (optional)</Label>
          <Input
            placeholder="e.g., fitness, cosplay, GFE..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Upload your photo (Grok rates if you&apos;re up to market standards)</Label>
        {attractionImage ? (
          <div className="relative rounded-lg border border-border bg-muted/30 overflow-hidden">
            <img src={attractionImage} alt="Uploaded for rating" className="max-h-48 w-full object-contain" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setAttractionImage(null)}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const dataUrl = await compressImageForVision(file)
                  setAttractionImage(dataUrl)
                } catch {
                  const reader = new FileReader()
                  reader.onload = () => setAttractionImage(reader.result as string)
                  reader.readAsDataURL(file)
                }
              }}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Upload a photo and Grok will judge commercial attractiveness and whether you meet market standards. Or describe
          below.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Or describe your content (optional if you uploaded a photo)</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder="Describe the content you want rated: setting, outfit, mood, type (photo/video), what’s in frame... The more detail, the better Venus and Circe can judge commercial appeal."
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
    </div>
  )
}
