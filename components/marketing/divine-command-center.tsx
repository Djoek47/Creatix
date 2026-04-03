'use client'

import { motion } from 'framer-motion'
import { Mic, Sparkles, Wand2, MessageCircle, BarChart3, Send, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const intents = [
  { icon: MessageCircle, label: 'DM fans & mass outreach', hue: 'from-circe/30 to-circe-light/10' },
  { icon: BarChart3, label: 'Read stats & set prices', hue: 'from-primary/30 to-gold/10' },
  { icon: Send, label: 'Publish & schedule content', hue: 'from-violet-500/20 to-circe/15' },
  { icon: Wand2, label: 'Run AI tools & bundles', hue: 'from-fuchsia-500/20 to-primary/15' },
]

export function DivineCommandCenter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card/90 via-card/50 to-circe/[0.07] p-8 shadow-2xl backdrop-blur-md sm:p-12',
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

      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto flex aspect-square max-w-[280px] items-center justify-center lg:mx-0"
          >
            <div className="marketing-hero-halo absolute inset-4 rounded-full bg-gradient-to-br from-primary/40 via-circe/30 to-fuchsia-500/25 blur-2xl" />
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-2 border-primary/40 bg-gradient-to-br from-background/80 to-card/90 shadow-xl sm:h-52 sm:w-52">
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
            <Volume2 className="mb-1 inline h-3.5 w-3.5 align-middle text-primary" />{' '}
            Hands busy? Driving? On camera? Your empire still listens.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-circe-light">
              Divine Manager
            </p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Speak it into <span className="text-primary">existence</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              The Divine Manager is your voice-first control room: ask in plain language, get answers, and trigger
              real actions across OnlyFans, Fansly, ManyVids, and your social graph —{' '}
              <span className="text-foreground/90">often without typing a single character.</span> Dictate DMs, adjust
              bundles, queue content, and interrogate your analytics as if the platform were a person who never judges,
              never sleeps, and never misses a detail.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {intents.map(({ icon: Icon, label, hue }) => (
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
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
