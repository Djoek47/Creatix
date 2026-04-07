# Revenue tier transition plan (Focus / Unified billing)

## Implemented (2026)

1. **Canonical pricing** — `lib/circe-venus-pricing.ts` (revenue bands 0–10, additive Focus bundles, Unified = OF + $25). `lib/pricing-matrix.ts` is the facade for checkout and UI.
2. **Tier index from revenue** — `tierIndexFromMonthlyRevenue` / `getTierByRevenue` use the same half-open bands as checkout (`revenueMax` exclusive).
3. **API enforcement** — `lib/billing/onlyfans-billing-gate.ts` blocks paid users whose `subscriptions.revenue_tier` is below the tier implied by **scoped** OnlyFans and/or Fansly `platform_connections` observations (`REVENUE_TIER_MISMATCH`).
4. **Stripe alignment job** — `GET /api/cron/revenue-tier-stripe-align` (Vercel Cron: `15 4 * * *` UTC). Secured with `CRON_SECRET` / `x-vercel-cron: true`. For each **active/trialing** `cev-paid` subscription with a Stripe id, computes `requiredTier = max(OF, Fansly)` from observations; if it differs from `revenue_tier`, updates the subscription item with `price_data` + metadata and **`proration_behavior: 'none'`** so the new unit amount applies on the **next invoice**. Supabase stays in sync via `customer.subscription.updated` webhooks.
5. **Fansly connect** — After OAuth success, `refreshFanslyObservedRevenueForBilling` runs so MTD revenue is stored before gated routes rely on it.
6. **Tier change notifications** — When Stripe subscription metadata updates `revenueTier` and the DB already had a prior tier, `customer.subscription.updated` triggers in-app Divine notification (`lib/billing/tier-change-notify.ts`) plus optional **Resend** email if `RESEND_API_KEY` is set and `profiles.email` is present.
7. **Manual pause** — `subscriptions.revenue_tier_sync_paused_until` skips the daily cron until that timestamp. Admins: `GET` / `PATCH /api/admin/users/[id]/revenue-tier-sync-pause` (`pausedUntil`: ISO string or `null` to clear).

## Goals (retained)

1. Align subscription price with the creator’s **business scale** (revenue band).
2. Apply tier moves on a **predictable schedule** — next invoice, not mid-cycle proration (see cron above).
3. Notify creators on band moves — **implemented** (webhook-driven; see §Implemented #6).
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

- [x] In-app + optional email when `revenue_tier` changes via Stripe metadata (subscription updated webhook).
- Idempotency: Stripe replays the same tier only if metadata changes; duplicate events with identical tier do not notify.

### Phase 5 — Edge cases (partially done)

- [x] Trial / active: cron updates **trialing** and **active** alike.
- [x] **past_due** — cron **does not** change price (only `active` / `trialing`); subscription stays on last metadata until payment recovers.
- [x] **Manual override** — `revenue_tier_sync_paused_until` + admin API (see §Implemented #7).
- [x] **Multi-platform revenue** — tier for gating uses **max** of OnlyFans-required and Fansly-required tiers from each platform’s own observation (not a single blended dollar amount).

## References

- `scripts/074_subscriptions_revenue_tier_sync_pause.sql` — `revenue_tier_sync_paused_until` column.
- `lib/billing/tier-change-notify.ts` — tier-change in-app + Resend email.
- `app/api/admin/users/[id]/revenue-tier-sync-pause/route.ts` — admin pause/clear.
- `lib/circe-venus-pricing.ts` — tier thresholds and USD prices.
- `lib/pricing-matrix.ts` — `tierIndexFromMonthlyRevenue`, `getMonthlyPriceUsd`, `getMonthlyPriceCents`.
- `app/api/cron/revenue-tier-stripe-align/route.ts` — scheduled Stripe updates.
- Public **pricing calculator** (`/pricing`) uses `pricing-matrix`; checkout must stay aligned with the same module.
- `docs/internal/ADMIN_USAGE_AND_COSTS.md` — admin auth model.
