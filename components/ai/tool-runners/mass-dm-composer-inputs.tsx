'use client'

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

export type MassDmComposerRunnerInputsProps = {
  easy: boolean
  campaignGoal: string
  setCampaignGoal: (v: string) => void
  contentType: string
  setContentType: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  audienceSegment: string
  setAudienceSegment: (v: string) => void
}

export function MassDmComposerRunnerInputs({
  easy,
  campaignGoal,
  setCampaignGoal,
  contentType,
  setContentType,
  contentDescription,
  setContentDescription,
  audienceSegment,
  setAudienceSegment,
}: MassDmComposerRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>What&apos;s this blast for?</Label>
          <Input
            placeholder="e.g. win-back lapsed subs, tease new PPV…"
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="flirty">Flirty</SelectItem>
              <SelectItem value="urgent">Urgent / FOMO</SelectItem>
              <SelectItem value="exclusive">Exclusive / VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>What should they do after reading? (optional)</Label>
          <Textarea
            placeholder="e.g. reply with an emoji, unlock the bundle…"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px]"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Pro mode: audience segment (whales, expiring, etc.) and full campaign fields.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Audience Segment</Label>
          <Select value={audienceSegment} onValueChange={setAudienceSegment}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subscribers</SelectItem>
              <SelectItem value="new">New Fans (Last 7 days)</SelectItem>
              <SelectItem value="inactive">Inactive (30+ days)</SelectItem>
              <SelectItem value="whales">Top Spenders</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="flirty">Flirty</SelectItem>
              <SelectItem value="urgent">Urgent/FOMO</SelectItem>
              <SelectItem value="exclusive">Exclusive/VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Campaign Goal</Label>
        <Input
          placeholder="e.g., Promote new PPV, Re-engage inactive fans..."
          value={campaignGoal}
          onChange={(e) => setCampaignGoal(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Call to Action</Label>
        <Textarea
          placeholder="What do you want fans to do after reading?"
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[60px]"
        />
      </div>
    </div>
  )
}
