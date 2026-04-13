'use client'

import Link from 'next/link'
import {
  Calendar,
  Camera,
  Crown,
  Eye,
  Gift,
  Heart,
  Lightbulb,
  ListTree,
  MessageSquare,
  MessagesSquare,
  Moon,
  PenTool,
  Scroll,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getToolMeta } from '@/lib/ai-tools-data'
import { listFeaturedToolCandidates } from '@/lib/dashboard/featured-tool-options'

const ICON_BY_TOOL: Partial<Record<string, LucideIcon>> = {
  'caption-generator': Wand2,
  'fantasy-writer': PenTool,
  'content-ideas': Lightbulb,
  'photo-enhancer': Camera,
  'ai-chatter': MessageSquare,
  commenter: MessagesSquare,
  housekeeping: ListTree,
  'gift-suggester': Gift,
  'whale-whisperer': Crown,
  'churn-predictor': Moon,
  'income-predictor': TrendingUp,
  'retention-tease': Calendar,
  'leak-scanner': Shield,
  'dmca-automator': Scroll,
  'competitor-analysis': Eye,
  'circe-protection-shield': Shield,
  'venus-cupid': Target,
  'standard-of-attraction': Heart,
}

function toolHref(toolId: string): string {
  return `/dashboard/ai-studio/tools/${encodeURIComponent(toolId)}`
}

type Props = {
  toolId: string
  onToolIdChange: (nextId: string) => void
}

export function DashboardFeaturedToolWidget({ toolId, onToolIdChange }: Props) {
  const meta = getToolMeta(toolId) ?? getToolMeta('standard-of-attraction')!
  const Icon = ICON_BY_TOOL[toolId] ?? Sparkles
  const candidates = listFeaturedToolCandidates()

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="dashboard-featured-tool" className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Pinned tool
          </Label>
          <Select value={toolId} onValueChange={onToolIdChange}>
            <SelectTrigger
              id="dashboard-featured-tool"
              className="dashboard-featured-tool-picker h-9 w-full max-w-full text-left text-sm sm:max-w-[min(100%,320px)]"
            >
              <SelectValue placeholder="Choose a tool" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[min(60vh,360px)]">
              {candidates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.isPro ? ' (Pro)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden border-gold/35 bg-gradient-to-r from-gold/[0.08] via-amber-500/[0.04] to-transparent shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-serif text-lg text-gold md:text-xl">
              <span className="rounded-lg border border-gold/30 bg-gold/10 p-2">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {meta.name}
              {meta.isPro ? (
                <span className="rounded border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[10px] font-sans font-normal uppercase tracking-wide text-gold">
                  Pro
                </span>
              ) : null}
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm">
              {meta.longDescription || meta.description}
            </CardDescription>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 bg-gradient-to-r from-circe to-venus text-white hover:opacity-90"
          >
            <Link href={toolHref(toolId)}>Open tool</Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}
