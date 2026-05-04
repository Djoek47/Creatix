# Supabase SQL — full run order

Use this on a **new** project (or an empty `public` schema) so the app matches the repo.

**Where to run:** Supabase Dashboard → SQL Editor → paste each file’s contents (or use the concat script below).

**Prerequisites:** Supabase enables `auth` and `uuid-ossp` by default; `001_create_schema.sql` also uses `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.

---

## Do **not** run on a fresh install


| File                                                  | Purpose                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `005_clear_mock_data.sql`                             | Deletes data — only if you need to wipe demo rows in an **existing** DB |
| `035_optional_delete_legacy_seeded_notifications.sql` | Optional cleanup of old seeded notification titles                      |


---

## Redundant / skip if already applied


| File                                        | Note                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `000_bootstrap_profiles.sql`                | Only if `profiles` is missing **and** you are **not** running `001` (001 creates `profiles`). |
| `RUN_015_notifications_platform_avatar.sql` | Same columns as `015_notifications_platform_avatar.sql` — run **015** only.                   |


---

## Full order (run top to bottom)

1. `001_create_schema.sql`
2. `002_add_encrypted_birthday.sql`
3. `add-onboarding-column.sql`
4. `add-analytics-snapshots-unique-constraint.sql`
5. `004_add_platforms.sql`
6. `add-platform-connections-unique-constraint.sql`
7. `006_create_social_profiles.sql`
8. `create-oauth-states-table.sql`
9. `009-create-notifications-table.sql`
10. `010-create-subscriptions-table.sql`
11. `create-dmca-claims-table.sql` *(before Circe Shield extends `dmca_claims`)*
12. `011-circe-shield-schema-updates.sql`
13. `012_reputation_grok_schema_updates.sql`
14. `013_add_platform_niches.sql`
15. `014_user_api_keys.sql`
16. `015_notifications_platform_avatar.sql`
17. `016_notification_preferences.sql`
18. `017_platform_connections_unique_platform_access_token.sql`
19. `018_divine_manager.sql`
20. `019_divine_intent_log.sql`
21. `019_fan_ai_summaries_housekeeping.sql` *(needs `divine_manager_settings` from 018)*
22. `020_profiles_identity_columns.sql`
23. `021_dmca_proofs_storage_bucket.sql` *(Storage bucket + policies)*
24. `022_profiles_former_usernames.sql`
25. `023_reputation_mentions_scan_channel.sql`
26. `024_reputation_briefing_profiles.sql`
27. `025_leak_alerts_workflow.sql`
28. `026_profiles_reputation_identity.sql`
29. `027_divine_mimic_profile.sql`
30. `028_fan_thread_insights.sql`
31. `029_reputation_briefing_history.sql`
32. `030_fan_thread_insights_profile.sql`
33. `031_divine_voice_memory.sql`
34. `032_divine_fan_recents.sql`
35. `033_divine_messaging_hub.sql`
36. `034_fan_classification_notifications_platform.sql`
37. `036_content_external_platform.sql`
38. `037_mimic_session.sql`
39. `038_profiles_community_links.sql`
40. `039_community_tips.sql`
41. `040_subscriptions_billing_tiers.sql`
42. `040_fan_thread_scan_automation.sql`
43. `041_fans_crm_webhook.sql`
44. *(catch-up)* `099_fans_subscription_start.sql` — adds `fans.subscription_start` if missing (required by some CRM selects / upserts)

*(Optional after 034: `035_optional_delete_legacy_seeded_notifications.sql`)*

---

## One-shot concatenation (local)

From the repo root:

```bash
bash scripts/concat-all-migrations.sh > /tmp/creatix-all-migrations.sql
```

Review `/tmp/creatix-all-migrations.sql`, then run it in the SQL Editor (or split if the editor has size limits).

---

## Storage / Edge

- `021_dmca_proofs_storage_bucket.sql` requires the **Storage** API; run in Supabase SQL as `postgres`.
- If a statement fails, fix the error and re-run from the failed file (most scripts use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` where possible).

---

## After SQL

- Configure **Auth** redirect URLs and **Stripe** webhooks in the dashboard (not SQL).
- Environment variables for the app are separate from these migrations.