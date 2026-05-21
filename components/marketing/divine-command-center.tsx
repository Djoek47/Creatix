'use client'

import { motion } from 'framer-motion'
import { Mic, Sparkles, Wand2, MessageCircle, BarChart3, Send, Volume2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const INTENT_ICONS = [MessageCircle, BarChart3, Send, Wand2] as const
const INTENT_HUES = [
  'from-circe/30 to-circe-light/10',
  'from-primary/30 to-gold/10',
  'from-violet-500/20 to-circe/15',
  'from-fuchsia-500/20 to-primary/15',
] as const

export function DivineCommandCenter({ className }: { className?: string }) {
  const t = useTranslations('marketing')

  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card/90 via-card/50 to-circe/[0.07] p-4 shadow-2xl backdrop-blur-md sm:rounded-3xl sm:p-8 lg:p-12',
        'marketing-glow-ring',
        className,
      )}
    >
      <div
        className="marketing-rainbow-edge absolute inset-x-0 top-0 h-[3px] opacity-90"
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-circe/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative grid min-w-0 gap-8 lg:grid-cols-2 lg:items-center lg:gap-10">
        <div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center sm:max-w-[280px] lg:mx-0"
          >
            <div className="marketing-hero-halo absolute inset-4 rounded-full bg-gradient-to-br from-primary/40 via-circe/30 to-fuchsia-500/25 blur-2xl" />
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-primary/40 bg-gradient-to-br from-background/80 to-card/90 shadow-xl sm:h-52 sm:w-52">
              <div className="absolute inset-0 rounded-full border border-circe/30" />
              <Mic className="relative z-10 h-16 w-16 text-primary sm:h-20 sm:w-20" strokeWidth={1.25} />
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="absolute -right-1 top-8 h-6 w-6 text-circe-light opacity-80" />
              </motion.div>
            </div>
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  className="block h-8 w-1.5 rounded-full bg-gradient-to-t from-circe to-primary"
                  animate={{ scaleY: [0.35, 1, 0.35] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: 'easeInOut',
                  }}
                  style={{ transformOrigin: 'bottom' }}
                />
              ))}
            </div>
          </motion.div>
          <p className="mt-6 text-center text-xs text-muted-foreground lg:text-left">
            <Volume2 className="mb-1 inline h-3.5 w-3.5 align-middle text-primary" aria-hidden />{' '}
            {t('divineCommandCenter.footnote')}
          </p>
        </div>

        <div className="space-y-6">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-circe-light">
              {t('divineCommandCenter.eyebrow')}
            </p>
            <h2 className="text-balance font-serif text-2xl font-semibold tracking-tight sm:text-4xl">
              {t('divineCommandCenter.headlineBefore')}{' '}
              <span className="text-primary">{t('divineCommandCenter.headlineAccent')}</span>
            </h2>
            <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              {t.rich('divineCommandCenter.body', {
                bold: (chunks) => <span className="text-foreground/90">{chunks}</span>,
              })}
            </p>
          </div>
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {INTENT_ICONS.map((Icon, index) => {
              const label = t(`divineCommandCenter.pillars.${index}`)
              const hue = INTENT_HUES[index] ?? INTENT_HUES[0]
              return (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-to-br p-4 text-sm font-medium',
                    hue,
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60 ring-1 ring-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  {label}
                </motion.li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
