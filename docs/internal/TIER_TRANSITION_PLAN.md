# Revenue tier transition plan (Focus / Unified billing)

This document describes **how tier changes should work** once automated revenue-based transitions are implemented. **Current production behavior** is unchanged: users pick a band at checkout; Stripe metadata stores `revenue_tier` and `billing_variant`. No cron yet applies tiers from live revenue.

## Goals

1. Align subscription price with the creator’s **business scale** (revenue band).
2. Apply tier moves on a **predictable schedule** (e.g. next billing period), not random mid-cycle surprises.
3. Notify creators when they **move up** a band (congratulations + effective date).
4. Optionally handle **downgrades** with the same clarity.

## Definitions

- **Revenue band / tier index** — `0..10` matching `lib/pricing-matrix.ts` → `REVENUE_TIERS` and `tierIndexFromMonthlyRevenue(monthlyRevenueUsd)`.
- **Monthly revenue (for tiering)** — product must define one canonical metric, e.g.:
  - **Self-reported** gross monthly revenue (already partially modeled via billing UI / `revenue_self_reported_at` on `subscriptions`), or
  - **Aggregated platform analytics** (OnlyFans / Fansly / ManyVids) when reliable monthly totals exist in our DB.
- **Effective date** — recommended: **start of the next Stripe subscription period** after evaluation (matches “next month” language in product discussions).

## Current schema touchpoints

- `public.subscriptions`: `revenue_tier`, `revenue_band_label`, `billing_variant`, `billing_focus_platforms`, Stripe ids.
- Stripe checkout / webhook: metadata patches tier fields (`app/api/stripe/webhook/route.ts`, `app/actions/stripe.ts`).

## Phased implementation

### Phase 1 — Specification (no code)

- [ ] Choose **single source of truth** for “monthly revenue”: self-report vs synced analytics vs **max** / **sum** across platforms when they disagree.
- [ ] Document **timezone** and **month boundary** (calendar month UTC vs creator timezone).
- [ ] Decide **upgrade vs downgrade** policy:
  - Upgrades: next period vs immediate with proration.
  - Downgrades: grace month vs next period only.

### Phase 2 — Evaluation job

- [ ] Add a **scheduled route** (Vercel Cron) e.g. weekly or daily that:
  1. Loads paid subscribers (`subscriptions` + Stripe subscription status).
  2. Computes `computedTier = tierIndexFromMonthlyRevenue(revenueUsd)` per chosen rules.
  3. Compares to `subscriptions.revenue_tier`.
  4. If different, enqueue or write `tier_change_pending` (new table or columns: `pending_revenue_tier`, `effective_at`).

### Phase 3 — Stripe alignment

- [ ] On `effective_at`, update Stripe subscription to the **price** that matches `getMonthlyPriceUsd(variant, tierIndex, focusPlatforms)` for that customer’s variant and focus list.
- [ ] Update Supabase `subscriptions.revenue_tier`, `revenue_band_label`, and metadata parity with Stripe.
- [ ] Log to `admin_audit_log` or a dedicated `billing_tier_events` table for support.

### Phase 4 — Creator notifications

- [ ] When `computedTier > previousTier`, send **congratulations** (in-app banner, email, or both) with:
  - New band label
  - New monthly price (if higher)
  - **Effective date** of the change
- [ ] Idempotency: one congratulation per tier transition (e.g. `last_tier_congrats_at` + `last_congrats_tier` on `subscriptions` or event table).

### Phase 5 — Edge cases

- [ ] **Trial / past_due / canceled** — skip or use last known good tier.
- [ ] **Manual override** — support/admin can set tier; job should respect a `tier_locked_until` flag if added.
- [ ] **Multi-platform revenue mismatch** (e.g. OF low, Fansly high) — document whether tier uses **max**, **sum**, or **primary platform** before implementing.

## Split revenue (OF vs Fansly vs ManyVids)

Not implemented in pricing math today: a **single** monthly number drives `tierIndexFromMonthlyRevenue`. If product requires different bands per platform, that is a **separate project** (schema + Stripe + UI). This plan assumes **one composite monthly revenue** until that spec is approved.

## References

- `lib/pricing-matrix.ts` — tier thresholds and prices (`tierIndexFromMonthlyRevenue`, `getMonthlyPriceUsd`).
- Public **pricing calculator** (`/pricing`) uses the same functions for estimates; Stripe checkout must stay in sync with that module.
- `docs/internal/ADMIN_USAGE_AND_COSTS.md` — admin auth model (same docs folder).
