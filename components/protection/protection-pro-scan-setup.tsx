'use client'

import Link from 'next/link'
import { ChevronDown, Loader2 } from 'lucide-react'
import { ScanHandlePicker } from '@/components/dashboard/scan-handle-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ScanContentTitleRow, ScanIdentityHandleRow } from '@/hooks/use-scan-identity'
import { cn } from '@/lib/utils'

const enter =
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500 motion-reduce:animate-none'

type Props = {
  displayHandles: ScanIdentityHandleRow[]
  useAllLeakHandles: boolean
  onUseAllLeakHandlesChange: (v: boolean) => void
  selectedLeakHandles: Set<string>
  onToggleLeakHandle: (value: string) => void
  includeContentTitles: boolean
  onIncludeContentTitlesChange: (v: boolean) => void
  strictScan: boolean
  onStrictScanChange: (v: boolean) => void
  advancedOpen: boolean
  onAdvancedOpenChange: (v: boolean) => void
  aliasInput: string
  onAliasInputChange: (v: string) => void
  formerInput: string
  onFormerInputChange: (v: string) => void
  titleHintsInput: string
  onTitleHintsInputChange: (v: string) => void
  saveIdentityLoading: boolean
  onSaveIdentity: () => void | Promise<void>
  onClearSavedHints: () => void | Promise<void>
  contentTitles: ScanContentTitleRow[]
  focusContentId: string
  onFocusContentIdChange: (v: string) => void
  focusTitleFilter: string
  onFocusTitleFilterChange: (v: string) => void
  focusHostsInput: string
  onFocusHostsInputChange: (v: string) => void
  scanFocusMedia: 'all' | 'video' | 'photo'
  onScanFocusMediaChange: (v: 'all' | 'video' | 'photo') => void
}

function SectionTitle({ kicker, title, hint }: { kicker: string; title: string; hint: string }) {
  return (
    <header className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">{kicker}</p>
      <h2 className="text-[22px] font-semibold tracking-tight text-foreground sm:text-[23px]">{title}</h2>
      <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground/85">{hint}</p>
    </header>
  )
}

function SettingsRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  delayClass,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  delayClass?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border/30 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8',
        enter,
        delayClass,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor={id} className="text-[15px] font-medium tracking-tight text-foreground">
          {label}
        </Label>
        <p className="text-[13px] leading-relaxed text-muted-foreground/85">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="shrink-0 scale-110" />
    </div>
  )
}

export function ProtectionProScanSetup({
  displayHandles,
  useAllLeakHandles,
  onUseAllLeakHandlesChange,
  selectedLeakHandles,
  onToggleLeakHandle,
  includeContentTitles,
  onIncludeContentTitlesChange,
  strictScan,
  onStrictScanChange,
  advancedOpen,
  onAdvancedOpenChange,
  aliasInput,
  onAliasInputChange,
  formerInput,
  onFormerInputChange,
  titleHintsInput,
  onTitleHintsInputChange,
  saveIdentityLoading,
  onSaveIdentity,
  onClearSavedHints,
  contentTitles,
  focusContentId,
  onFocusContentIdChange,
  focusTitleFilter,
  onFocusTitleFilterChange,
  focusHostsInput,
  onFocusHostsInputChange,
  scanFocusMedia,
  onScanFocusMediaChange,
}: Props) {
  if (displayHandles.length === 0) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[1.375rem] border border-white/[0.08] bg-gradient-to-b from-muted/25 to-transparent px-8 py-14 text-center dark:from-muted/15',
          enter,
        )}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" aria-hidden />
        <p className="text-[19px] font-semibold tracking-tight text-foreground">No connected identities</p>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground/85">
          Link a platform under Integrations to unlock handles and run a Pro scan.
        </p>
        <Button asChild variant="outline" className="mt-8 h-11 rounded-full border-border/60 px-8 text-[14px] font-medium tracking-tight transition-colors">
          <Link href="/dashboard/settings?tab=integrations">Open Integrations</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-14 sm:space-y-16">
      <section className={cn('space-y-6', enter, 'motion-safe:delay-[40ms]')}>
        <SectionTitle
          kicker="Scope"
          title="Who to include"
          hint="Handles and aliases that participate in this run. Everything below respects this set."
        />
        <ScanHandlePicker
          handles={displayHandles}
          useAll={useAllLeakHandles}
          onUseAllChange={onUseAllLeakHandlesChange}
          selected={selectedLeakHandles}
          onToggle={onToggleLeakHandle}
          idPrefix="leak-scan"
          className="rounded-[1.125rem] border border-white/[0.07] bg-background/40 p-5 shadow-none backdrop-blur-[2px] dark:bg-background/25"
          allCheckboxClassName="border-foreground/25 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
        />
      </section>

      <section className={cn('space-y-6', enter, 'motion-safe:delay-[100ms]')}>
        <SectionTitle kicker="Matching" title="Signals" hint="Tune what enters the query and how tightly results fit." />
        <div className="rounded-[1.125rem] border border-white/[0.07] bg-background/30 px-1 sm:px-2 dark:bg-background/20">
          <SettingsRow
            id="include-content-titles"
            label="Library titles"
            description="Fold in titles from your vault when building queries. Usage caps apply on some plans."
            checked={includeContentTitles}
            onCheckedChange={onIncludeContentTitlesChange}
            delayClass="motion-safe:delay-[120ms]"
          />
          <SettingsRow
            id="strict-scan"
            label="Strict mode"
            description="Drop soft matches—AI-assisted on supported plans; keyword checks elsewhere. Manual URLs are never dropped."
            checked={strictScan}
            onCheckedChange={onStrictScanChange}
            delayClass="motion-safe:delay-[140ms]"
          />
        </div>
      </section>

      <Collapsible open={advancedOpen} onOpenChange={onAdvancedOpenChange} className={cn(enter, 'motion-safe:delay-[140ms]')}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'group flex w-full items-center justify-between gap-5 rounded-2xl border border-border/35 bg-background/35 px-6 py-5 text-left outline-none',
              'transition-[background-color,border-color,box-shadow] duration-200 ease-out',
              'hover:border-border/45 hover:bg-background/45',
              'focus-visible:border-border/50 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'dark:border-white/[0.06] dark:bg-background/[0.06] dark:hover:border-white/[0.09] dark:hover:bg-background/[0.1]',
              advancedOpen
                ? [
                    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(96,165,250,0.22),0_0_28px_-8px_rgba(59,130,246,0.22),0_0_52px_-14px_rgba(139,92,246,0.14)]',
                    'hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(96,165,250,0.32),0_0_34px_-8px_rgba(59,130,246,0.28),0_0_60px_-14px_rgba(167,139,250,0.18)]',
                    'dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(147,197,253,0.16),0_0_36px_-8px_rgba(96,165,250,0.26),0_0_68px_-16px_rgba(167,139,250,0.16)]',
                    'dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(147,197,253,0.22),0_0_42px_-8px_rgba(96,165,250,0.34),0_0_76px_-18px_rgba(167,139,250,0.22)]',
                  ]
                : [
                    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_0_0_1px_rgba(148,163,184,0.14),0_0_22px_-10px_rgba(59,130,246,0.14),0_0_44px_-14px_rgba(139,92,246,0.08)]',
                    'hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(96,165,250,0.22),0_0_28px_-10px_rgba(59,130,246,0.2),0_0_52px_-14px_rgba(167,139,250,0.12)]',
                    'dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_0_0_1px_rgba(255,255,255,0.06),0_0_28px_-10px_rgba(96,165,250,0.18),0_0_52px_-16px_rgba(167,139,250,0.1)]',
                    'dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(147,197,253,0.12),0_0_34px_-10px_rgba(96,165,250,0.26),0_0_64px_-16px_rgba(167,139,250,0.16)]',
                  ],
            )}
          >
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="block text-[1.0625rem] font-semibold tracking-[-0.015em] text-foreground">
                Alternate names & titles
              </span>
              <span className="block max-w-[42rem] text-[0.8125rem] leading-[1.45] text-muted-foreground">
                List <span className="text-foreground/80">multiple</span> usernames, handles, and phrases—each scan can use a
                different mix. Saved to your profile; skip this section anytime.
              </span>
            </span>
            <ChevronDown
              className={cn(
                'h-[1.125rem] w-[1.125rem] shrink-0 text-muted-foreground/70 transition-transform duration-200 ease-out motion-safe:duration-300',
                advancedOpen && 'rotate-180',
              )}
              strokeWidth={2}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=open]:motion-safe:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:motion-safe:duration-300 motion-reduce:data-[state=open]:animate-none">
          <div className="mt-5 space-y-8 rounded-2xl border border-border/30 bg-muted/[0.08] px-6 py-7 dark:bg-muted/[0.06]">
            <div className="space-y-2">
              <Label htmlFor="alias-input-pro" className="text-[13px] font-medium text-foreground">
                Aliases & handles
              </Label>
              <p className="text-[12px] leading-relaxed text-muted-foreground/85">
                Many entries welcome—comma or new lines. Merged with linked platforms when you run a scan.
              </p>
              <Textarea
                id="alias-input-pro"
                value={aliasInput}
                onChange={(e) => onAliasInputChange(e.target.value)}
                placeholder="@handles or alternate names"
                className="min-h-[72px] rounded-xl border-border/45 bg-background/60 text-[14px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="former-input-pro" className="text-[13px] font-medium text-foreground">
                Former usernames
              </Label>
              <p className="text-[12px] leading-relaxed text-muted-foreground/85">
                Past handles—list as many as apply. Kept on your profile for later scans.
              </p>
              <Textarea
                id="former-input-pro"
                value={formerInput}
                onChange={(e) => onFormerInputChange(e.target.value)}
                placeholder="Previous handles before a rebrand"
                className="min-h-[56px] rounded-xl border-border/45 bg-background/60 text-[14px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title-hints-pro" className="text-[13px] font-medium text-foreground">
                Title phrases
              </Label>
              <p className="text-[12px] leading-relaxed text-muted-foreground/85">
                One phrase per line when library titles are included—you can add several.
              </p>
              <Textarea
                id="title-hints-pro"
                value={titleHintsInput}
                onChange={(e) => onTitleHintsInputChange(e.target.value)}
                placeholder="Phrases that may appear on infringing pages"
                className="min-h-[72px] rounded-xl border-border/45 bg-background/60 text-[14px]"
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-border/35 pt-5 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-full px-6"
                disabled={saveIdentityLoading}
                onClick={onSaveIdentity}
              >
                {saveIdentityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save to profile
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 rounded-full px-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={saveIdentityLoading}
                onClick={onClearSavedHints}
              >
                Clear saved hints
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <section className={cn('space-y-10', enter, 'motion-safe:delay-[180ms]')}>
        <SectionTitle
          kicker="Precision"
          title="Scope this discovery"
          hint="Optionally bias toward certain sites or media—then tighten which vault titles feed the query builder."
        />

        <div className="space-y-8">
          <div className="space-y-4">
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-foreground">Channels & formats</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/85">
                Filter indexed URLs before strict review. Applies to automated hits only—not manual reports.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Any'],
                  ['video', 'Video'],
                  ['photo', 'Photos'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onScanFocusMediaChange(value)}
                  className={cn(
                    'rounded-full px-5 py-2 text-[13px] font-medium tracking-tight transition-colors motion-safe:duration-200',
                    scanFocusMedia === value
                      ? 'bg-foreground text-background shadow-sm'
                      : 'border border-border/40 bg-background/25 text-muted-foreground hover:bg-background/35 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Video vs. photos uses URL path and file-extension hints—it may omit ambiguous pages.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus-hosts-pro" className="text-[13px] font-medium text-foreground">
              Hosts to favor
            </Label>
            <p className="text-[12px] leading-relaxed text-muted-foreground/85">
              Comma or new line. Only keep hits whose domain contains one of these tokens (e.g. erome, simpcity, bunkr).
            </p>
            <Input
              id="focus-hosts-pro"
              value={focusHostsInput}
              onChange={(e) => onFocusHostsInputChange(e.target.value)}
              placeholder="erome, coomer, simpcity…"
              className="h-11 rounded-xl border-border/45 bg-background/50 text-[14px]"
            />
          </div>

          <div className="border-t border-border/25 pt-8">
            <div className="mb-5">
              <p className="text-[13px] font-semibold tracking-tight text-foreground">Vault titles</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/85">
                Narrow which library material shapes search queries—not your saved defaults.
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-foreground">One library item</Label>
                <p className="text-[12px] text-muted-foreground/80">Prefer a single vault title for this scan.</p>
                <Select
                  value={focusContentId || '__none__'}
                  onValueChange={(v) => onFocusContentIdChange(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/45 bg-background/50 text-[14px]">
                    <SelectValue placeholder="Entire library" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No single-item focus</SelectItem>
                    {contentTitles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title.length > 64 ? `${c.title.slice(0, 64)}…` : c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="focus-title-filter-pro" className="text-[13px] font-medium text-foreground">
                  Title phrases required
                </Label>
                <p className="text-[12px] text-muted-foreground/80">Each line must appear somewhere in merged titles.</p>
                <Textarea
                  id="focus-title-filter-pro"
                  value={focusTitleFilter}
                  onChange={(e) => onFocusTitleFilterChange(e.target.value)}
                  placeholder="One phrase per line"
                  className="min-h-[88px] rounded-xl border-border/45 bg-background/50 text-[14px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
