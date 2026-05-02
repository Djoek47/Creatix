# Rainbow Sparkle Pill (CTA)

Saved spec for the pill control: **animated rainbow border**, **Lucide `Sparkles`** (amber + soft violet glow), **gradient label** (hidden on xs, shown from `sm`).

## Code

- **Component:** `components/dashboard/rainbow-sparkle-pill.tsx` — `RainbowSparklePill`
- **Ring + animation:** `app/globals.css` — `.header-tools-rainbow-wrap`, keyframes `header-tools-rainbow-shift`
- **Marketing hero “Start free trial”:** same gradient + motion, applied only on `:hover` / `:focus-within` via `.cta-trial-rainbow-shell` in `app/globals.css` (see `app/[locale]/(marketing)/page.tsx`).

## Usage

```tsx
import { RainbowSparklePill } from '@/components/dashboard/rainbow-sparkle-pill'

<RainbowSparklePill
  href="/dashboard/settings?tab=billing"
  label={t('trialCtaLabel')}
  title={t('trialCtaTitle')}
  aria-label={t('trialCtaAria')}
/>
```

## Visual reference

Pixel reference (browser capture of the Start trial control): `rainbow-sparkle-pill-reference.png` (same folder as this file).
