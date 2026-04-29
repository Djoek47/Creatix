'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'

export type ContentIdeasRunnerInputsProps = {
  easy: boolean
  niche: string
  setNiche: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
}

export function ContentIdeasRunnerInputs({
  easy,
  niche,
  setNiche,
  platform,
  setPlatform,
  contentDescription,
  setContentDescription,
}: ContentIdeasRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>What do you post about?</Label>
          <Input
            placeholder="e.g. cosplay, fitness, GFE…"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
        </div>
        <div className="space-y-2">
          <Label>Anything trending on your mind? (optional)</Label>
          <Textarea
            placeholder="Optional — holidays, memes, collabs…"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Your Niche</Label>
          <Input placeholder="e.g., fitness, cosplay, GFE..." value={niche} onChange={(e) => setNiche(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Any specific trends or themes to explore? (optional)</Label>
        <Textarea
          placeholder="Current trends you've noticed, or themes you want to try..."
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
    </div>
  )
}
