'use client'

import { Calendar, Users } from 'lucide-react'
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
import type { UpcomingCosmicEvent } from '@/lib/calendar/upcoming-cosmic-events'
import { formatFantasyRunnerDate } from '@/lib/calendar/format-fantasy-runner-date'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'

export type FantasyFanPickerRow = {
  id: string
  username: string | null
  platform_username: string | null
  display_name: string | null
  total_spent: number | null
  platform: string
  notes: string | null
  tags: unknown
}

export type FantasyScheduledRow = {
  id: string
  title: string
  description: string | null
  scheduled_at: string | null
  status: string
}

export type FantasyWriterRunnerInputsProps = {
  easy: boolean
  contentType: string
  setContentType: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  upcomingCosmicEvents: UpcomingCosmicEvent[]
  fantasyHolidayEventId: string
  setFantasyHolidayEventId: (v: string) => void
  fantasyContentId: string
  setFantasyContentId: (v: string) => void
  fantasyFanId: string
  setFantasyFanId: (v: string) => void
  fantasyFans: FantasyFanPickerRow[]
  fantasyScheduledContent: FantasyScheduledRow[]
  crmFansMeta: CrmFansResponse['meta'] | null
}

export function FantasyWriterRunnerInputs({
  easy,
  contentType,
  setContentType,
  platform,
  setPlatform,
  contentDescription,
  setContentDescription,
  upcomingCosmicEvents,
  fantasyHolidayEventId,
  setFantasyHolidayEventId,
  fantasyContentId,
  setFantasyContentId,
  fantasyFanId,
  setFantasyFanId,
  fantasyFans,
  fantasyScheduledContent,
  crmFansMeta,
}: FantasyWriterRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="romantic">Romantic</SelectItem>
                <SelectItem value="playful">Playful</SelectItem>
                <SelectItem value="mysterious">Mysterious</SelectItem>
                <SelectItem value="dominant">Dominant</SelectItem>
                <SelectItem value="submissive">Submissive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Scene or vibe</Label>
          <Textarea
            placeholder="What should happen in the fantasy? (You can use the mic.)"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[100px]"
          />
          <p className="text-[11px] text-muted-foreground">
            Pro mode: tie to calendar events, a planned post, or one fan from CRM.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tone/Style</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="romantic">Romantic</SelectItem>
              <SelectItem value="playful">Playful</SelectItem>
              <SelectItem value="mysterious">Mysterious</SelectItem>
              <SelectItem value="dominant">Dominant</SelectItem>
              <SelectItem value="submissive">Submissive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <OfFanslyPlatformSelect value={platform} onValueChange={setPlatform} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Cosmic calendar event (next ~90 days)
        </Label>
        <Select
          value={fantasyHolidayEventId || 'none'}
          onValueChange={(v) => setFantasyHolidayEventId(v === 'none' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Optional — tie fantasy to a holiday / event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {upcomingCosmicEvents.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {formatFantasyRunnerDate(ev.date)} — {ev.holiday.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Your scheduled content (content calendar)</Label>
        <Select value={fantasyContentId || 'none'} onValueChange={(v) => setFantasyContentId(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Optional — match a planned post" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {fantasyScheduledContent.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.title}
                {row.scheduled_at ? ` · ${formatFantasyRunnerDate(new Date(row.scheduled_at))}` : ''} ({row.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fantasyScheduledContent.length === 0 && (
          <p className="text-xs text-muted-foreground">No items in your content calendar yet. Add posts under Content.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Fan profile (personalize for one fan)
        </Label>
        <Select value={fantasyFanId || 'none'} onValueChange={(v) => setFantasyFanId(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Optional — fantasy tailored to this fan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {fantasyFans.map((f) => {
              const h = f.username || f.platform_username || 'fan'
              return (
                <SelectItem key={f.id} value={f.id}>
                  @{h} · {f.platform}
                  {f.total_spent != null ? ` · ~$${f.total_spent}` : ''}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {crmFansMeta?.warnings?.length ? (
          <p className="text-xs text-amber-600 dark:text-amber-500">{crmFansMeta.warnings.join(' ')}</p>
        ) : null}
        {fantasyFans.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {crmFansMeta == null
              ? 'Could not load fans. Refresh the page or try again.'
              : crmFansMeta.onlyFansConnected || crmFansMeta.fanslyConnected
                ? 'No CRM rows or live subscribers loaded yet. Open Fans and refresh sync, or check Integrations if a session expired.'
                : 'Connect OnlyFans or Fansly in Settings, then open Fans to sync subscribers into this list.'}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Scenario or theme (optional if you picked calendar / fan / scheduled post above)</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder="e.g. masquerade strangers, slow burn, exclusive VIP vibe — or leave blank and rely on calendar + fan context."
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}
