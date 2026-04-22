'use client'

import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { VoiceInputButton } from '@/components/voice-input-button'

export type GiftSuggesterRunnerInputsProps = {
  easy: boolean
  fanMessage: string
  setFanMessage: (v: string | React.SetStateAction<string>) => void
  currentPrice: string
  setCurrentPrice: (v: string) => void
  giftUseWishlist: boolean
  setGiftUseWishlist: (v: boolean) => void
}

export function GiftSuggesterRunnerInputs({
  easy,
  fanMessage,
  setFanMessage,
  currentPrice,
  setCurrentPrice,
  giftUseWishlist,
  setGiftUseWishlist,
}: GiftSuggesterRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Who is this fan?</Label>
          <Textarea
            placeholder="Spend level, vibe, things they’ve said they like…"
            value={fanMessage}
            onChange={(e) => setFanMessage(e.target.value)}
            className="min-h-[88px]"
          />
        </div>
        <div className="space-y-2">
          <Label>Budget (optional)</Label>
          <Input placeholder="e.g. around $75" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
        </div>
        <p className="text-[11px] text-muted-foreground">Pro mode: voice input and wishlist links from your gift list.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Fan context</Label>
          <VoiceInputButton
            onTranscript={(text) => setFanMessage((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder="Who they are, spend level, interests, recent behavior…"
          value={fanMessage}
          onChange={(e) => setFanMessage(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="space-y-2">
        <Label>Budget or tier hint (optional)</Label>
        <Input
          placeholder="e.g. $50–150, or deluxe"
          value={currentPrice}
          onChange={(e) => setCurrentPrice(e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-2 rounded-md border border-border p-3">
        <Checkbox id="gift-wl" checked={giftUseWishlist} onCheckedChange={(c) => setGiftUseWishlist(c === true)} />
        <label htmlFor="gift-wl" className="text-sm cursor-pointer">
          Use my saved wishlist links (title + price){' '}
          <Link href="/dashboard/ai-studio/gifts" className="text-primary underline">
            Manage list
          </Link>
        </label>
      </div>
    </div>
  )
}
