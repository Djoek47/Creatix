import { cn } from '@/lib/utils'

/** Inset plan / estimate panels — matches pricing summary aside (settings billing). */
export const BILLING_INSET_PANEL_CLASS = cn(
  'rounded-[1.75rem] border',
  'border-zinc-200/55 bg-gradient-to-b from-white/90 to-zinc-50/80',
  'shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_24px_48px_-32px_rgba(15,23,42,0.12)]',
  'dark:border-white/[0.07] dark:from-zinc-950/80 dark:to-zinc-950/40',
  'dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.035),0_28px_56px_-36px_rgba(0,0,0,0.65)]',
  'transition-[box-shadow,border-color,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
)

/** Primary Subscribe / checkout — same CTA as pricing calculator (gradient + hover bloom). */
const BILLING_PRIMARY_PAY_CTA_BASE = cn(
  'relative isolate overflow-hidden rounded-2xl border-0 font-semibold tracking-tight text-white',
  'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500',
  'shadow-[0_1px_0_0_rgba(255,255,255,0.14)_inset,0_14px_44px_-18px_rgba(124,58,237,0.5)]',
  'transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'hover:brightness-[1.06] hover:shadow-[0_0_0_1px_rgba(253,230,138,0.35),0_0_52px_-6px_rgba(167,139,250,0.55),0_20px_60px_-14px_rgba(245,158,11,0.38)]',
  'hover:scale-[1.015]',
  'active:scale-[0.985]',
  'motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:shadow-none',
)

export const BILLING_PRIMARY_CHECKOUT_CTA_CLASS = cn(
  BILLING_PRIMARY_PAY_CTA_BASE,
  'h-12 w-full justify-center px-6 text-[15px]',
)

/** Bundled OF+Fansly + Protection add-on — applied with `BILLING_PRIMARY_CHECKOUT_CTA_CLASS` (see globals.css). */
export const BILLING_TRIPLE_STACK_CHECKOUT_CTA_CLASS = 'billing-checkout-cta-triple-stack'

export const BILLING_PRIMARY_TRIAL_CTA_CLASS = cn(BILLING_PRIMARY_PAY_CTA_BASE, 'h-11 gap-2 px-7 text-[15px]')
