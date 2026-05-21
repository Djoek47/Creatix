# Wellbeing Flow v2 — smarter Energy, Stress, and Focus

Plan for evolving **Flow** (mood + Energy / Stress / Focus sliders) beyond inbox pressure, protocol backlog, manager queue, goals, and glow — toward **presence**, **idle behavior**, **daily engagement**, and **interaction tempo**.

## Current baseline (v1)

- **Signals**: `gatherFlowActivitySignals` (`lib/wellbeing/flow-activity-signals.ts`) — conversations-derived message pressure, protocol tasks, Divine Manager suggested/scheduled counts, goals text from `divine_manager_settings`.
- **Composite load**: `compositePressure` in `app/api/wellbeing/flow-state/route.ts` blends message pressure with queue-derived “work debt.”
- **Inference**: `heuristicFlowState` / optional LLM in `lib/wellbeing/flow-state-ai.ts`; mood fragments from `inferWellbeingState` (`lib/wellbeing/infer-mood.ts`).
- **UI**: `components/wellbeing/mood-constellation.tsx`, wired from wellbeing dashboard.

**Gap**: No notion of “tab open but idle,” “away overnight,” “quiet day with little UI activity,” or “interaction speed” — so Energy/Stress/Focus cannot behave as users intuitively expect.

---

## Product intent


| Axis       | Intent                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Energy** | **Capacity to work now**: higher after **rest / time away**; **decays** while the app is **foreground but idle** (little meaningful interaction); **refills** after **sleep-scale absence** or **next calendar day** session reset (tunable). Not synonymous with “empty inbox.” |
| **Stress** | Keep load + urgency (queues, pressure), but **reduce false highs** when the user has done **little meaningful work today** — a quiet day shouldn’t read as max stress solely from stale backlog metrics.                                                                         |
| **Focus**  | Shift toward **interaction quality**: **cadence** (events per active hour), **burst vs steady** rhythm, optional **latency** (time from cue → action). Bounded 0–100 for UI.                                                                                                     |


Copy must stay non-clinical: occupational framing, chips/overrides when misread.

---

## New signals to collect

### A. Session / presence (Energy + idle drain)

- `**last_client_heartbeat_at`** — updated every 1–2 min while dashboard is focused/visible.
- `**foreground_ms**` per interval or rolled into daily aggregates (optional v2).
- `**idle_streak_ms**` — time since last **meaningful** interaction while tab is foreground.

### B. Meaningful interaction (idle vs working)

Define debounced **interaction events**: navigation, thread open, send message, task complete, voice surface toggles, etc. Exclude passive polling only.

- `**last_meaningful_action_at`**
- `**meaningful_actions_count_today**` (pick UTC vs user-local day and document).

### C. Away / overnight refill (Energy)

- `**last_session_end_at**` or `**last_active_day**` (calendar day with ≥ N interactions).
- `**hours_since_last_substantive_session**` (cap for modeling, e.g. 72h).

### D. Focus proxies

- `**interaction_burst_score**` — clustering/variance of events (steady vs sporadic).
- `**median_gap_seconds_between_actions**` in active windows (shorter gaps → higher focus *if* bounded against spam).
- Future: `**p95_navigation_latency*`* if client perf logging exists.

### E. Platform connection (“hasn’t been connected”)

- From `**platform_connections**` / sync health: **time since last successful sync** or last inbound activity per platform.
- Long disconnect → bias **Energy up** (rest from ops) and/or **Stress down** unless product wants explicit “connection anxiety” (separate).

---

## Modeling approach

### Phase 1 — Deterministic layer

Extend inputs to `heuristicFlowState` (and optionally the LLM prompt facts) with normalized factors:

- `**awayRecovery`** — monotonic in hours since last meaningful action (saturate after sleep-scale window).
- `**idleDrain**` — while foreground && `idle_streak > threshold`, reduce Energy (per-hour cap).
- `**quietDayRelief**` — if `meaningful_actions_today < K`, pull Stress toward calmer band (still allow backlog to dominate when extreme).
- `**focusScore**` — combine median gap, burstiness, optional sends/opens rate today.

### Phase 2 — LLM

Reuse `buildPrompt` in `app/api/wellbeing/flow-state/route.ts`; inject new metrics as **facts** so structured output stays consistent with telemetry.

---

## Privacy & performance

- Aggregate client events server-side; no raw keystroke logging.
- Rate-limit heartbeats; batch writes.
- Document retention for aggregates.

---

## Implementation backlog

1. **Storage**: New table (e.g. `user_wellbeing_activity_rollups`) + last-write columns, or extend existing analytics with daily buckets + `last_`* pointers.
2. **Client**: Thin reporter on dashboard shell — heartbeat + interaction hooks (patterns may align with voice telemetry / divine idle concepts but Flow needs **dashboard-wide** signals).
3. **Server**: Load rollups in flow-state path; merge into `heuristicFlowState` and prompt.
4. **Tuning**: Scenario matrix — tab open idle overnight; away 3 days; heavy inbox + zero UI actions; disconnected platforms for a week.
5. **QA / copy**: Update Flow detail helper text; keep chip overrides.

---

## Related code paths


| Area                   | Path                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Flow signals           | `lib/wellbeing/flow-activity-signals.ts`                                                      |
| Heuristic + schema     | `lib/wellbeing/flow-state-ai.ts`                                                              |
| API                    | `app/api/wellbeing/flow-state/route.ts`                                                       |
| Mood heuristics        | `lib/wellbeing/infer-mood.ts`                                                                 |
| UI                     | `components/wellbeing/mood-constellation.tsx`, `components/wellbeing/wellbeing-dashboard.tsx` |
| Precedent (voice only) | `app/api/divine/voice-telemetry/route.ts`, `divine_voice_state_daily`                         |


---

## Implementation note (shipped)

- **Migration**: `scripts/093_user_wellbeing_activity.sql` — `user_wellbeing_activity` + RLS (same shape as `creator_pulse_snapshots`).
- **Ingest**: `POST /api/wellbeing/activity` — heartbeat spacing enforced server-side (~90s); meaningful actions use enumerated `actionKind` values and a **UTC** calendar bucket for daily counts.
- **Read path**: `gatherFlowPresenceSignals` (`lib/wellbeing/flow-presence-signals.ts`) feeds `heuristicFlowState` and optional LLM prompts when **`FLOW_V2_LLM=1`** (Pulse narrative + `/api/wellbeing/flow-state`); deterministic merge math lives in `lib/wellbeing/flow-presence-heuristic.ts`.
- **Client**: `WellbeingActivityReporter` (dashboard layout) sends throttled heartbeats and debounced pathname / click signals. Set **`NEXT_PUBLIC_WELLBEING_FLOW_V2=false`** to disable the reporter; set **`NEXT_PUBLIC_WELLBEING_FLOW_V2=1`** to align with server Flow v2 tab-away energy dampening in `useFlowEnergyAwayRecovery`.

---

## Open questions

- **Calendar boundary**: User-local midnight vs UTC for “next day refill.”
- **Energy floor/ceiling**: Minimum Energy while logged in idle (avoid punishing passive monitoring).
- **Focus vs ADHD-style bursts**: Cap burst bonus so manic spikes don’t always max Focus.
- Whether **LLM** remains default when `OPENAI_API_KEY` is set or v2 ships **heuristic-first** until validated.

