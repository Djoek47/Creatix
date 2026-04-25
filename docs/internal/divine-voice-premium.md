# Divine Voice Premium (internal)

## What it is

- **Entitlement:** Paid plan (`cev-paid` or legacy paid plan ids) plus `subscriptions.divine_voice_premium = true`.
- **Stripe:** Price ids in `STRIPE_DIVINE_VOICE_PRICE_IDS` (comma-separated) and/or subscription metadata `divineVoicePremium=1` on checkout. Webhook `customer.subscription.*` updates the column.
- **Escape hatch:** `DIVINE_VOICE_GRANT_ALL_PAID=true` grants Realtime + premium messaging to every active paid subscriber (beta / emergency only).

## Env (Creatix)

- `STRIPE_DIVINE_VOICE_PRICE_IDS` — Stripe price ids for the add-on.
- `DIVINE_VOICE_GRANT_ALL_PAID` — optional; see above.
- `DIVINE_VOICE_MAX_REALTIME_SESSIONS_PER_MONTH` — optional cap (UTC month) using `ai_usage_events` with feature `divine-manager-realtime-session`; `0` disables.
- `NEXT_PUBLIC_MARKIT_URL` — Markit origin for CORS on `POST /api/ai/divine-manager-realtime` (Bearer).

## Markit

- Browser calls same-user Realtime via **Markit** routes `/api/creatix/divine-manager-realtime` and `/api/creatix/divine-voice-tool`, which forward to Creatix with `Authorization: Bearer <access_token>`.
- Optional legacy keyword path: `NEXT_PUBLIC_MARKIT_DIVINE_KEYWORD_INCIDENT=true` (and same for server if you gate the route).

## Rollback

- Disable add-on prices in Stripe or clear `divine_voice_premium` for test users.
- Remove `DIVINE_VOICE_GRANT_ALL_PAID` in production.
- Incident: enable keyword fallback env on Markit only if Realtime is impaired.
