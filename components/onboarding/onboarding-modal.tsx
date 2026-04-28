'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckoutEmbed } from '@/components/stripe/checkout'
import { TRIAL_PLAN_ID } from '@/lib/billing/access'
import { TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemedLogo } from '@/components/themed-logo'
import Link from 'next/link'
import Image from 'next/image'
import { ONLYFANS_LOGO_SRC } from '@/lib/platform-logos'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Star,
  Moon,
  Sun,
  LayoutDashboard,
  MessageSquare,
  Shield,
  Sparkles,
  Link2,
  Zap,
  BookOpen,
  Crown,
  HeartPulse,
  Activity,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Quiet, hardware-precise rows for onboarding (Apple-like restraint). */
const obRow =
  'flex items-start gap-3.5 rounded-[1.125rem] border border-border/45 bg-muted/15 px-3.5 py-3.5'
const obIconWell =
  'flex size-10 shrink-0 items-center justify-center rounded-[0.65rem] bg-muted/60 text-foreground/50'
const obBody = 'text-[15px] leading-relaxed text-muted-foreground'
const obLink =
  'font-medium text-foreground/90 underline-offset-4 transition-colors hover:text-foreground hover:underline'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  content: React.ReactNode
}

interface OnboardingModalProps {
  open: boolean
  onComplete: () => void
  userName?: string
}

function OnboardingCompleteContent({ onComplete }: { onComplete: () => void }) {
  const router = useRouter()
  const [trialCardComplete, setTrialCardComplete] = useState(false)

  return (
    <div className="flex flex-col items-center px-1 pb-2 text-center">
      <div className="mb-8 flex size-14 items-center justify-center rounded-full bg-muted/70 ring-1 ring-border/60">
        <Check className="size-7 text-foreground/80" strokeWidth={2} aria-hidden />
      </div>
      <h3 className="font-serif text-xl font-medium leading-snug tracking-[-0.02em] text-foreground sm:text-2xl">
        You&apos;re ready
      </h3>
      <p className="mx-auto mt-4 max-w-[22rem] text-[15px] leading-relaxed text-muted-foreground">
        Take the full guided tour—sidebar, AI Studio, retention, protection—about thirty short stops. Replay anytime with{' '}
        <span className="font-medium text-foreground/90">Start live tour</span> in the header.
      </p>

      <div className="mt-8 w-full max-w-md text-left">
        <p className="text-center text-[13px] font-medium leading-snug text-foreground">
          Activate trial credits
        </p>
        <p className="mx-auto mt-1.5 max-w-[22rem] text-center text-[12px] leading-relaxed text-muted-foreground">
          Add a card with Stripe below—same flow as billing. Credits unlock as soon as setup completes; billing follows
          your trial terms.
        </p>
        {trialCardComplete ? (
          <p
            className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-center text-[13px] font-medium leading-snug text-emerald-800 dark:text-emerald-200"
            role="status"
          >
            Card on file — trial credits are activating. You can continue in a few seconds.
          </p>
        ) : (
          <div className="mt-4 min-h-[22rem] w-full overflow-hidden rounded-xl border border-border/50 bg-muted/10 p-1 sm:min-h-[24rem]">
            <CheckoutEmbed
              rootId="onboarding-trial-checkout"
              productId={TRIAL_PLAN_ID}
              className="min-h-[20rem] w-full"
              onComplete={() => {
                setTrialCardComplete(true)
                void router.refresh()
              }}
            />
          </div>
        )}
      </div>

      <Button
        type="button"
        className="mt-9 h-11 w-full max-w-sm rounded-full font-medium tracking-tight shadow-sm"
        onClick={() => {
          onComplete()
          router.push('/dashboard/welcome?openTour=1')
        }}
      >
        <BookOpen className="size-[15px]" aria-hidden />
        Take full tour
      </Button>
      <p className="mt-7 max-w-[20rem] text-[12px] leading-relaxed text-muted-foreground">
        Or finish with <span className="font-medium text-foreground">Get Started</span> below—then explore freely.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Badge
          variant="outline"
          className="onboarding-credits-bait-badge inline-flex items-center gap-1 border-border/55 bg-muted/25 px-2.5 py-1 font-normal text-[11px]"
        >
          <Zap
            className="size-3 shrink-0 text-amber-400 motion-safe:animate-pulse motion-reduce:opacity-80"
            aria-hidden
          />
          <span className="onboarding-credits-bait-num tabular-nums">
            {TRIAL_AI_CREDITS_LIMIT.toLocaleString()} AI credits
          </span>
          <span className="text-muted-foreground">· after card</span>
        </Badge>
        <Badge
          variant="outline"
          className="border-border/55 bg-muted/25 px-2.5 py-1 font-normal text-[11px] text-muted-foreground"
        >
          <Star className="mr-1 size-3 opacity-70" aria-hidden />
          2-day trial · card required
        </Badge>
      </div>
      <p className="mt-4 max-w-[22rem] text-[11px] leading-relaxed text-muted-foreground">
        Credits unlock after Stripe setup; subscription renews unless you cancel before the trial ends.
      </p>
      <Link
        href="/dashboard/guide"
        className="mt-6 inline-flex items-center gap-2 text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <BookOpen className="size-[15px]" aria-hidden />
        Open the Guide
      </Link>
    </div>
  )
}

export function OnboardingModal({ open, onComplete, userName = 'Creator' }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: OnboardingStep[] = useMemo(
    () => [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Circe et Venus',
      icon: Star,
      iconColor: 'text-primary',
      content: (
        <div className="flex flex-col items-center pb-1 text-center">
          <p className="mb-8 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Circe et Venus
          </p>
          <div className="mb-11 flex justify-center">
            <div className="rounded-full p-[1px] ring-1 ring-border/40 shadow-[0_14px_50px_-18px_rgba(0,0,0,0.45)]">
              <ThemedLogo width={108} height={108} className="rounded-full" />
            </div>
          </div>
          <h3 className="font-serif text-[clamp(1.5625rem,4.75vw,1.875rem)] font-medium leading-[1.14] tracking-[-0.025em] text-foreground">
            Welcome, {userName}.
          </h3>
          <p className="mx-auto mt-5 max-w-[26rem] text-[15px] leading-[1.65] text-muted-foreground">
            Two companions in one tranquil workspace—Circe deepens loyalty, Venus brings thoughtful growth forward.
          </p>
          <div className="mt-14 grid w-full max-w-[19rem] grid-cols-2 gap-2">
            <div className="flex flex-col gap-2 rounded-[1.125rem] border border-border/45 bg-muted/15 px-3 py-[1rem]">
              <Moon className="mx-auto size-[17px] text-foreground/45" aria-hidden strokeWidth={1.75} />
              <span className="text-[13px] font-medium tracking-tight text-foreground">Circe</span>
            </div>
            <div className="flex flex-col gap-2 rounded-[1.125rem] border border-border/45 bg-muted/15 px-3 py-[1rem]">
              <Sun className="mx-auto size-[17px] text-foreground/45" aria-hidden strokeWidth={1.75} />
              <span className="text-[13px] font-medium tracking-tight text-foreground">Venus</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'dashboard',
      title: 'Your dashboard',
      description: 'Command center',
      icon: LayoutDashboard,
      iconColor: 'text-slate-400',
      content: (
        <div className="space-y-6">
          <p className={obBody}>
            One calm surface for signal: performance, guidance, and what needs attention—without the noise.
          </p>
          <div className="grid gap-2.5">
            <div className={obRow}>
              <div className={obIconWell}>
                <LayoutDashboard className="size-[18px] stroke-[1.75]" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13px] font-medium tracking-tight text-foreground">Overview</p>
                <p className="text-[13px] leading-snug text-muted-foreground">
                  Revenue, fans, and messages—structured for a single glance.
                </p>
              </div>
            </div>
            <div className={obRow}>
              <div className={obIconWell}>
                <Moon className="size-[18px] stroke-[1.75]" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13px] font-medium tracking-tight text-foreground">Circe &amp; Venus</p>
                <p className="text-[13px] leading-snug text-muted-foreground">
                  Consult either guide from the same place—no context switching.
                </p>
              </div>
            </div>
            <div className={obRow}>
              <div className={obIconWell}>
                <Sparkles className="size-[18px] stroke-[1.75]" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13px] font-medium tracking-tight text-foreground">Alerts</p>
                <p className="text-[13px] leading-snug text-muted-foreground">
                  Leaks and mentions surface here so nothing important lingers unseen.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'connect',
      title: 'Connect platforms',
      description: 'Secure links',
      icon: Link2,
      iconColor: 'text-primary',
      content: (
        <div className="space-y-6">
          <p className={obBody}>
            Link the accounts you want Circe to work with—read‑only integrations; credentials aren&apos;t stored on our
            servers.
          </p>
          <div className="grid gap-2.5">
            <div className="flex items-center justify-between gap-3 rounded-[1.125rem] border border-border/45 bg-muted/10 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.65rem] bg-zinc-950 ring-1 ring-border/40">
                  <Image
                    src={ONLYFANS_LOGO_SRC}
                    alt="OnlyFans"
                    width={120}
                    height={28}
                    className="h-6 w-auto max-w-[7rem] object-contain object-left"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium tracking-tight text-foreground">OnlyFans</p>
                  <p className="text-[12px] text-muted-foreground">Recommended</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-9 shrink-0 rounded-full border-border/55 px-4 text-[12px] font-medium">
                Connect
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[1.125rem] border border-border/45 bg-muted/10 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[0.65rem] bg-muted/70 ring-1 ring-border/45">
                  <span className="text-[15px] font-semibold tabular-nums text-foreground/75">F</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium tracking-tight text-foreground">Fansly</p>
                  <p className="text-[12px] text-muted-foreground">Recommended</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-9 shrink-0 rounded-full border-border/55 px-4 text-[12px] font-medium">
                Connect
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[1.125rem] border border-border/45 bg-muted/10 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.65rem] bg-zinc-950 ring-1 ring-border/40">
                  <Image src="/mym-logo.png" alt="MYM" width={40} height={40} className="size-8 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium tracking-tight text-foreground">MYM</p>
                  <p className="text-[12px] text-muted-foreground">Optional</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-9 shrink-0 rounded-full border-border/55 px-4 text-[12px] font-medium">
                Connect
              </Button>
            </div>
          </div>
          <div className="rounded-[1.125rem] border border-border/40 bg-muted/15 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">OnlyFans</p>
            <ul className="mt-3 list-none space-y-2.5 text-[12px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5 pl-0">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/25" aria-hidden />
                First login can take up to a minute—we wait until it completes.
              </li>
              <li className="flex gap-2.5 pl-0">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/25" aria-hidden />
                Stuck? Use &quot;Start fresh login&quot; and try another proxy (US or UK).
              </li>
              <li className="flex gap-2.5 pl-0">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/25" aria-hidden />
                2FA or a quick verification step can appear—we walk you through it.
              </li>
              <li className="flex gap-2.5 pl-0">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/25" aria-hidden />
                Expired sessions disconnect for safety; reconnect whenever you like.
              </li>
              <li className="flex gap-2.5 pl-0">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/25" aria-hidden />
                Partners see your Circe profile (or email)—not your platform password.
              </li>
            </ul>
          </div>
          <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
            Connect anytime in Settings. More detail in the{' '}
            <Link href="/dashboard/guide" className={obLink}>
              Guide
            </Link>
            .
          </p>
        </div>
      ),
    },
    {
      id: 'divine-manager',
      title: 'Divine Manager',
      description: 'One companion',
      icon: Crown,
      iconColor: 'text-amber-500',
      content: (
        <div className="space-y-6">
          <p className={obBody}>
            Talk or type—protocols stay visible when you want them; notifications align with your bell. You stay approval-first
            for anything fan-facing.
          </p>
          <div className="rounded-[1.125rem] border border-border/45 bg-muted/12 px-4 py-4">
            <ul className="space-y-3.5 text-[13px] leading-snug text-muted-foreground">
              <li className="flex gap-3">
                <Check className="mt-0.5 size-[15px] shrink-0 stroke-[2] text-foreground/35" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Voice · </span>
                  Tap the crown for live conversation.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 size-[15px] shrink-0 stroke-[2] text-foreground/35" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Text · </span>
                  Same continuity when typing suits you.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 size-[15px] shrink-0 stroke-[2] text-foreground/35" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Protocols · </span>
                  Briefings tuck away when you need space.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 size-[15px] shrink-0 stroke-[2] text-foreground/35" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Mimic · </span>
                  Train tone; drafts wait for review.
                </span>
              </li>
            </ul>
          </div>
          <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
            Deep dive:{' '}
            <Link href="/dashboard/guide#divine-manager" className={obLink}>
              Guide · Divine Manager
            </Link>
          </p>
        </div>
      ),
    },
    {
      id: 'ai-studio',
      title: 'Circe and Venus',
      description: 'Two guides',
      icon: Sparkles,
      iconColor: 'text-circe-light',
      content: (
          <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.125rem] border border-border/45 bg-muted/10 px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <Moon className="size-5 shrink-0 text-foreground/45" strokeWidth={1.75} aria-hidden />
              <h4 className="text-[14px] font-medium tracking-tight text-foreground">Circe</h4>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Retention-first: deepen loyalty where attention already exists.
            </p>
            <ul className="mt-4 space-y-2 text-[11px] text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-foreground/30" aria-hidden>
                  –
                </span>
                Signals &amp; guardrails around churn
              </li>
              <li className="flex gap-2">
                <span className="text-foreground/30" aria-hidden>
                  –
                </span>
                Leak awareness surfaced in workflow
              </li>
              <li className="flex gap-2">
                <span className="text-foreground/30" aria-hidden>
                  –
                </span>
                Churn predictor in AI Studio
              </li>
            </ul>
          </div>
          <div className="rounded-[1.125rem] border border-border/45 bg-muted/10 px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <Sun className="size-5 shrink-0 text-foreground/45" strokeWidth={1.75} aria-hidden />
              <h4 className="text-[14px] font-medium tracking-tight text-foreground">Venus</h4>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Growth-facing: widen reach without losing your voice.
            </p>
            <ul className="mt-4 space-y-2 text-[11px] text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-foreground/30" aria-hidden>
                  –
                </span>
                Acquisition ideas &amp; experiments
              </li>
              <li className="flex gap-2">
                <span className="text-foreground/30" aria-hidden>
                  –
                </span>
                Reputation cues in context
              </li>
              <li className="flex gap-2">
                <span className="text-foreground/30" aria-hidden>
                  –
                </span>
                Complements—not replaces—how you operate
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Where things live',
      description: 'A quick map',
      icon: Zap,
      iconColor: 'text-primary',
      content: (
        <div className="grid gap-2">
          <div className={obRow}>
            <div className={obIconWell}>
              <Crown className="size-[18px] stroke-[1.65]" aria-hidden />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13px] font-medium tracking-tight text-foreground">Divine Manager</p>
              <p className="text-[12px] leading-snug text-muted-foreground">Crown · voice · text · Mimic · protocols</p>
            </div>
          </div>
          <div className={obRow}>
            <div className={obIconWell}>
              <MessageSquare className="size-[18px] stroke-[1.65]" aria-hidden />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13px] font-medium tracking-tight text-foreground">Messages</p>
              <p className="text-[12px] leading-snug text-muted-foreground">Unified inbox, AI drafts, fan focus tools</p>
            </div>
          </div>
          <div className={obRow}>
            <div className={obIconWell}>
              <Sparkles className="size-[18px] stroke-[1.65]" aria-hidden />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13px] font-medium tracking-tight text-foreground">AI Studio</p>
              <p className="text-[12px] leading-snug text-muted-foreground">Vault · tool library · credits · Pro</p>
            </div>
          </div>
          <div className={obRow}>
            <div className={obIconWell}>
              <HeartPulse className="size-[18px] stroke-[1.65]" aria-hidden />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13px] font-medium tracking-tight text-foreground">Well-being</p>
              <p className="text-[12px] leading-snug text-muted-foreground">Load snapshots · lunar calendar · breathing room</p>
            </div>
          </div>
          <div className={obRow}>
            <div className={obIconWell}>
              <Activity className="size-[18px] stroke-[1.65]" aria-hidden />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13px] font-medium tracking-tight text-foreground">Retention</p>
              <p className="text-[12px] leading-snug text-muted-foreground">Churn hub · digests · predictor</p>
            </div>
          </div>
          <div className={obRow}>
            <div className={obIconWell}>
              <Shield className="size-[18px] stroke-[1.65]" aria-hidden />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13px] font-medium tracking-tight text-foreground">Protection</p>
              <p className="text-[12px] leading-snug text-muted-foreground">Leaks · scans · escalation support</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'complete',
      title: 'Ready',
      description: 'Continue',
      icon: Check,
      iconColor: 'text-green-500',
      content: <OnboardingCompleteContent onComplete={onComplete} />,
    },
  ],
    [userName, onComplete],
  )

  const progress = ((currentStep + 1) / steps.length) * 100
  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const suppressStepHeading =
    currentStepData.id === 'welcome' || currentStepData.id === 'complete'

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="fixed inset-0 z-50 bg-neutral-950/45 backdrop-blur-[2px] dark:bg-black/55"
        className={cn(
          'flex max-h-[min(92dvh,44rem)] flex-col gap-0 overflow-hidden rounded-[1.375rem]',
          'border-border/45 bg-background/95 shadow-[0_26px_80px_-32px_rgba(0,0,0,0.55)]',
          'duration-300 sm:max-w-[26rem]',
          'p-0',
          currentStepData.id === 'complete' &&
            'max-h-[min(96dvh,58rem)] sm:max-w-[min(100%,32rem)]',
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{currentStepData.title}</DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        <header className="shrink-0 px-8 pt-[1.875rem]">
          <div className="flex items-start justify-between gap-6">
            <p className="pt-0.5 tabular-nums text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </p>
            <div className="flex shrink-0 items-center gap-1 pr-[2px] sm:gap-1.5">
              <Link
                href="/dashboard/guide"
                className="rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                Guide
              </Link>
              <span className="select-none px-0.5 text-[11px] text-border" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close onboarding"
              >
                <X className="size-4 stroke-[1.75]" aria-hidden />
              </button>
            </div>
          </div>
          <div
            className="mt-[1.35rem] h-[2px] w-full overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-foreground/88 transition-[width] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-2 pt-10">
          <div
            key={currentStep}
            className="animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
          >
            {!suppressStepHeading ? (
              <>
                <div className="mb-10 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {currentStepData.description}
                  </p>
                  <h2 className="font-serif text-[1.375rem] font-medium leading-snug tracking-[-0.02em] text-foreground sm:text-[1.5rem]">
                    {currentStepData.title}
                  </h2>
                </div>
                <div className="space-y-4 pb-px">{currentStepData.content}</div>
              </>
            ) : (
              currentStepData.content
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-6 border-t border-border/35 px-8 py-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-[0.22]',
              currentStep > 0 && 'hover:bg-muted/50',
            )}
          >
            <ArrowLeft className="size-[15px] stroke-[1.75]" aria-hidden />
            Back
          </button>
          <Button
            type="button"
            onClick={handleNext}
            className="h-11 min-w-[8.75rem] gap-2 rounded-full px-7 font-medium tracking-tight shadow-sm"
          >
            {isLastStep ? (
              'Get Started'
            ) : (
              <>
                Next
                <ArrowRight className="size-[15px] stroke-[2]" aria-hidden />
              </>
            )}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
