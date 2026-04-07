# Revenue tier transition plan (Focus / Unified billing)

## Implemented (2026)

1. **Canonical pricing** — `lib/circe-venus-pricing.ts` (revenue bands 0–10, additive Focus bundles, Unified = OF + $25). `lib/pricing-matrix.ts` is the facade for checkout and UI.
2. **Tier index from revenue** — `tierIndexFromMonthlyRevenue` / `getTierByRevenue` use the same half-open bands as checkout (`revenueMax` exclusive).
3. **API enforcement** — `lib/billing/onlyfans-billing-gate.ts` blocks paid users whose `subscriptions.revenue_tier` is below the tier implied by **scoped** OnlyFans and/or Fansly `platform_connections` observations (`REVENUE_TIER_MISMATCH`).
4. **Stripe alignment job** — `GET /api/cron/revenue-tier-stripe-align` (Vercel Cron: `15 4 * * *` UTC). Secured with `CRON_SECRET` / `x-vercel-cron: true`. For each **active/trialing** `cev-paid` subscription with a Stripe id, computes `requiredTier = max(OF, Fansly)` from observations; if it differs from `revenue_tier`, updates the subscription item with `price_data` + metadata and **`proration_behavior: 'none'`** so the new unit amount applies on the **next invoice**. Supabase stays in sync via `customer.subscription.updated` webhooks.
5. **Fansly connect** — After OAuth success, `refreshFanslyObservedRevenueForBilling` runs so MTD revenue is stored before gated routes rely on it.

## Goals (retained)

1. Align subscription price with the creator’s **business scale** (revenue band).
2. Apply tier moves on a **predictable schedule** — next invoice, not mid-cycle proration (see cron above).
3. Notify creators on band moves — **not implemented** (Phase 4 below).
4. Downgrades use the same cron path as upgrades.

## Definitions

- **Revenue band / tier index** — `0..10` matching `lib/circe-venus-pricing.ts` → `PRICING_TIERS` and `tierIndexFromMonthlyRevenue(monthlyRevenueUsd)`.
- **Monthly revenue (for tiering)** — **Platform-reported month-to-date-style** earnings stored on `platform_connections` (`observed_monthly_revenue_usd`), not a closed accounting month unless we change the observation pipeline. OnlyFans uses API “this month” / chart fallbacks; Fansly uses UTC month-to-date totals. Early in the month, MTD can sit below a full-month run rate; late disconnects can leave **stale** observations until the next sync or disconnect cleanup.
- **Effective date** — Next Stripe invoice after cron updates the subscription (`proration_behavior: 'none'`).

## Schema touchpoints

- `public.subscriptions`: `revenue_tier`, `revenue_band_label`, `billing_variant`, `billing_focus_platforms`, Stripe ids.
- Stripe checkout / webhook: metadata patches tier fields (`app/api/stripe/webhook/route.ts`, `app/actions/stripe.ts`).

## Remaining phases

### Phase 4 — Creator notifications

- When `computedTier > previousTier`, send in-app or email with new band, price, effective date.
- Idempotency: e.g. `last_tier_congrats_at` + `last_congrats_tier` or `billing_tier_events` table.

### Phase 5 — Edge cases (partially done)

- [x] Trial / active: cron updates **trialing** and **active** alike.
- [ ] **past_due** — skip or use last known tier (cron currently skips non-active/trialing).
- [ ] **Manual override** — `tier_locked_until` or support flag to skip cron.
- [x] **Multi-platform revenue** — tier for gating uses **max** of OnlyFans-required and Fansly-required tiers from each platform’s own observation (not a single blended dollar amount).

## References

- `lib/circe-venus-pricing.ts` — tier thresholds and USD prices.
- `lib/pricing-matrix.ts` — `tierIndexFromMonthlyRevenue`, `getMonthlyPriceUsd`, `getMonthlyPriceCents`.
- `app/api/cron/revenue-tier-stripe-align/route.ts` — scheduled Stripe updates.
- Public **pricing calculator** (`/pricing`) uses `pricing-matrix`; checkout must stay aligned with the same module.
- `docs/internal/ADMIN_USAGE_AND_COSTS.md` — admin auth model.
