# OpenAI background Responses + webhook

Production flow for long-running OpenAI **Responses API** jobs with `background: true` and signed webhooks.

## Environment variables

| Variable | Description |
|---------|--------------|
| `OPENAI_WEBHOOK_SECRET` | Signing secret from the OpenAI dashboard for your webhook endpoint. When unset, briefing + mass‑DM enqueue fall back to sync paths where applicable; AI Chatter / Mimic use sync compose if queue fails. |
| `OPENAI_API_KEY` | Required for Responses, Chat Completions, and TTS. |
| `OPENAI_BACKGROUND_RESPONSES_MODEL` | Optional override (default `gpt-4o-mini`). |

Register the webhook URL (production example):

`https://www.circeetvenus.com/api/openai/webhook`

Subscribe to events such as `response.completed`, `response.failed`, `response.cancelled`, `response.incomplete`.

## Middleware

`/api/openai/webhook` is excluded from locale/auth middleware passes (same pattern as Stripe) so raw-body verification succeeds.

## Database

Apply migration `scripts/096_openai_background_jobs.sql`:

- Table `public.openai_jobs`
- Ledger platform `openai` on `platform_webhook_event_ledger`
- RLS allowing users to `SELECT` their own rows (used by Preferences → Background AI jobs list)

## Local development

Expose your dev server via **ngrok** or **Cloudflare Tunnel**, register the forwarded URL in the OpenAI dashboard, set `OPENAI_WEBHOOK_SECRET` locally from that endpoint config, and redeploy/env-pull as needed.

## Features using the harness (non-exhaustive)

- `divine_thread_scan` — when webhook secret configured (see `lib/divine/thread-scan-async.ts`)
- `ai_chatter` — large compose prompts enqueue background Responses; webhook calls `finalizeAiChatterAfterCompose`
- `mimic_test` — long Mimic drafts enqueue; model output is stored as `result_summary.draft`
- `mass_dm_composer` — JSON body `{ "backgroundJob": true }` (Divine AI Studio sends this when webhook secret exists server-side); credits debited on successful completion webhook
- `briefing_script` — when webhook secret configured, scripted voice briefing is async; dashboard polls `GET /api/ai/divine-manager-voice?jobId=…&includeTts=1`
- `churn_run` — Circe churn digest when webhook path enabled

Interactive Divine Chat Completions streaming is unchanged.

## Attribution

Webhook completion updates `openai_jobs` usage fields and calls `logUsageEvent` with `feature` equal to the job slug (`ai_chatter`, `mimic_test`, …), which feeds `ai_usage_events` and customer usage webhooks.
