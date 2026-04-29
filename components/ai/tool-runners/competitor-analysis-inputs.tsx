'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'
import { VoiceInputButton } from '@/components/voice-input-button'

export type CompetitorAnalysisRunnerInputsProps = {
  easy: boolean
  niche: string
  setNiche: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  competitorTargets: string
  setCompetitorTargets: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  useCompetitorWebSearch: boolean
  setUseCompetitorWebSearch: (v: boolean) => void
}

export function CompetitorAnalysisRunnerInputs({
  easy,
  niche,
  setNiche,
  platform,
  setPlatform,
  competitorTargets,
  setCompetitorTargets,
  contentDescription,
  setContentDescription,
  useCompetitorWebSearch,
  setUseCompetitorWebSearch,
}: CompetitorAnalysisRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Your niche</Label>
            <Input placeholder="e.g. fitness, cosplay…" value={niche} onChange={(e) => setNiche(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Who should we compare you to?</Label>
          <Textarea
            placeholder="@handles or links you’re OK citing (public stuff only)"
            value={competitorTargets}
            onChange={(e) => setCompetitorTargets(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <Label>What do you want to learn? (optional)</Label>
          <Textarea
            placeholder="e.g. pricing vs them, promo cadence gaps…"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px]"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Pro mode: live web discovery toggle and full methodology copy.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        We anchor you on <strong className="text-foreground">your cohort stat band</strong> (imported fans vs anonymized
        Creatix quartiles), then compare you to <strong className="text-foreground">named competitors</strong> in the{' '}
        <strong className="text-foreground">same band</strong> and contrast with{' '}
        <strong className="text-foreground">one tier above</strong> (next quartile up). Use only public marketing signals —
        no harassment or private data.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Your niche</Label>
          <Input
            placeholder="e.g., fitness, cosplay, GFE, domme…"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Primary platform</Label>
          <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Competitors to compare (required for a focused run)</Label>
        <Textarea
          placeholder="@handles, public profile links, or notes on who sits near you vs who feels one step ahead (themes, price tier if public, cadence)…"
          value={competitorTargets}
          onChange={(e) => setCompetitorTargets(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>What you want out of the comparison</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder="e.g., Where I’m weak vs peers in my band · what one-tier-up creators do on promos or DMs · gaps I can own without racing to the bottom…"
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id="competitor-web"
          checked={useCompetitorWebSearch}
          onCheckedChange={(v) => setUseCompetitorWebSearch(v === true)}
        />
        <label htmlFor="competitor-web" className="text-xs leading-snug text-muted-foreground cursor-pointer">
          Run live web discovery (Serper) for public guides and articles — adds verifiable context. Turn off to use cohort
          benchmarks + shared library + Community tips only.
        </label>
      </div>
    </div>
  )
}
