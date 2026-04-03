# Security incident: credential exposure checklist

Use this if repository contents, `.env` values, or full credential strings may have been exposed (including pastes into AI tools, screenshots, or public forks).

## 1. Contain the blast radius

- [ ] Confirm the Git repository is **private** and remove or disable **public forks** and stray clones.
- [ ] Revoke access for any compromised accounts; enforce **2FA** on the org.
- [ ] Review **Vercel** (or host) deployment access and environment variable visibility.

## 2. Rotate secrets (production)

Rotate in the provider dashboards and update **Vercel project environment variables** (or your host’s secret store). Redeploy after rotation.

| Secret / area | Where to rotate |
|---------------|-----------------|
| Supabase | Dashboard → Settings → API: rotate **service role** if it was exposed; **anon** key is public by design but rotate if policy requires full reset. |
| Stripe | Dashboard → Developers → API keys: roll **secret** key; update `STRIPE_*` in Vercel. |
| OpenAI / AI gateway | Revoke keys; create new; update `OPENAI_API_KEY` or gateway keys. |
| Webhooks | OnlyFans, Fansly, Stripe, OpenAI: regenerate **webhook signing secrets** and update provider URLs if the host URL changed. |
| OAuth / social | Regenerate client secrets for any OAuth apps tied to this codebase. |
| Custom HMAC | If you add `USER_API_KEY_HMAC_SECRET` for user API key hashing, rotate it and re-issue user keys if that secret leaked. |

## 3. Verify

- [ ] Production health check: sign-in, one paid flow, one webhook test (staging or provider “send test”).
- [ ] Confirm old keys show as **invalid** at providers where applicable.

## 4. Aftermath

- [ ] Document date and scope of rotation for your team.
- [ ] Add **secret scanning** to CI (see repository workflow) and enable **GitHub push protection** for secrets.

This document does not perform rotation automatically; operators must act in each dashboard.
