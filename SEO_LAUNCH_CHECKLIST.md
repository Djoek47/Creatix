# SEO Launch Checklist

## Public vs private (important)

- **Indexed / in sitemap:** English-canonical marketing under **`/en/…`** (see `SEO_EN_MARKETING_CANONICAL_PATHS`); unprefixed **legal/trust** pages (`/about`, `/privacy`, `/terms`, `/cookies`, `/contact`). Listed in **`SEO_SITEMAP_PATHS`** / **`SEO_PUBLIC_PATHS`** in [`lib/seo-public-paths.ts`](lib/seo-public-paths.ts) — drives **`app/sitemap.ts`** and **`app/robots.ts`** `Allow` rules.

- **`noindex` / crawler blocks:** **`/dashboard`**, **`/api`**, **`/admin`**; non-English marketing locales (`es`, `fr`, `pt`) use `noindex` in `buildMarketingLocaleMetadata`.

- **`/dashboard` protections:** **`Disallow`** in `robots.txt`, **omitted** from **`sitemap.xml`**, **`noindex, nofollow`** via `metadata.robots` on `app/dashboard/layout.tsx` (so leaked URLs still signal “do not index”).

- **Auth `/auth/login` and `/auth/sign-up`:** Crawlable but **`noindex`** (organic landing should favour **`/en/…`** marketing + legal URLs).

## Technical SEO

- [ ] `robots.txt` is served and `Host` points to `https://www.circeetvenus.com`
- [ ] `robots.txt` references `https://www.circeetvenus.com/sitemap.xml`
- [ ] `robots.txt` disallows `/dashboard`, `/api`, and `/admin`; allow list matches `SEO_PUBLIC_PATHS` (**includes `/en/…` marketing**)
- [ ] `sitemap.xml` URLs match page canonicals (**`/en/pricing`**, not negotiated bare `/pricing`)
- [ ] Legal and marketing routes in sitemap are real public paths (`/en`, `/en/features`, **`/about`**, **`/contact`**, etc.)
- [ ] Root metadata uses canonical `metadataBase`
- [ ] Organization JSON-LD uses canonical `url` and logo URL
- [ ] Dashboard responses include `noindex` (verify in View Source or DevTools on a `/dashboard/*` page)

## Search Console

- [ ] Add/verify Google Search Console property; filter or monitor **URL prefix `https://www.circeetvenus.com/en/`** as the primary indexed marketing surface (other locales are `noindex`)
- [ ] Submit `https://www.circeetvenus.com/sitemap.xml`
- [ ] Keep secondary property for `cetv.app` during migration for monitoring

## Domain Migration Validation

- [ ] OAuth connect succeeds for Instagram/Twitter/TikTok on canonical host
- [ ] Stripe webhook deliveries are green on canonical host
- [ ] OnlyFans webhook deliveries are green on canonical host
- [ ] Fansly webhook deliveries are green on canonical host
- [ ] OpenAI webhook deliveries are green on canonical host
- [ ] No provider retry storms from old host after overlap period

## Finalization

- [ ] Remove legacy callback/webhook URLs from provider dashboards
- [ ] Enable full 301 redirect from `www.cetv.app` to `www.circeetvenus.com`
- [ ] Re-crawl canonical pages and validate indexing

---

## SEO — do once the whole project is done (final pass)

Run this block **after** feature work is stable and you are ready to treat the site as “launch-complete.” Earlier sections (robots, sitemap, Search Console) can be done sooner; this is the **holistic** polish pass.

### Inventory & config

- [ ] **Sync `lib/seo-public-paths.ts`** with reality: every new **public** marketing/legal route is in the array; nothing under `/dashboard` slipped in.
- [ ] **Per-page metadata audit:** Each route in `SEO_PUBLIC_PATHS` has accurate `title` and `description` (unique where it matters: `/features`, `/pricing`, `/how-it-works`, legal pages). Prefer `export const metadata` or `generateMetadata` in each `app/**/page.tsx` / `layout.tsx` as needed.
- [ ] **Canonical URLs:** No stray duplicates (`www` vs apex, `http` vs `https`); `metadataBase` and `alternates.canonical` match production.
- [ ] **Open Graph & Twitter:** Every important landing page has sensible `openGraph` / `twitter` (title, description); add **`images`** (e.g. 1200×630) for homepage and key funnels so shares don’t look broken.

### Structured data & content

- [ ] **JSON-LD:** Extend beyond Organization if useful (`WebSite` + `SearchAction` only if you add on-site search; `SoftwareApplication` / `Product` only if copy is accurate and maintained).
- [ ] **On-page copy:** H1 + hierarchy on marketing pages; no keyword stuffing; align with what you want to rank for (creator tools, OnlyFans management, etc.).

### Quality, performance, and crawl hygiene

- [ ] **404 / soft-404:** Custom not-found page; no indexed URLs returning empty or login walls without `noindex` (dashboard already noindexed).
- [ ] **Internal links:** Footer/header link to all key public pages; no dead links on marketing surfaces.
- [ ] **Core Web Vitals / Lighthouse:** Run on `/`, `/pricing`, `/features` on **mobile**; fix regressions that hurt LCP/CLS (images, fonts, layout shift).
- [ ] **Images:** Meaningful `alt` on marketing pages; `next/image` where appropriate.

### Search engines & monitoring (post-launch)

- [ ] **Google Search Console:** Coverage + experience reports clean; fix “Excluded” reasons that shouldn’t apply to public URLs.
- [ ] **Bing Webmaster Tools** (optional): Submit same sitemap if Bing traffic matters.
- [ ] **Marketing conversion events:** `MarketingConversionClickListener` forwards clicks on elements with **`data-marketing-conversion`**; events appear in **Vercel Analytics** as `marketing_{name}`

- [ ] **Analytics:** Vercel Analytics / other — confirm **public** funnel events; dashboard traffic is product analytics, not SEO.
- [ ] **Re-submit sitemap** after large content or route changes.

### Social & brand

- [ ] **Share previews:** Manually test Facebook Sharing Debugger / Twitter Card Validator (or equivalent) for `/` and top landing URLs.
- [ ] **Favicon / PWA:** `manifest.webmanifest` and icons match current brand; no outdated app name in install prompts.

### Security / trust signals (indirect SEO)

- [ ] **HTTPS** everywhere; HSTS on production if not already via platform.
- [ ] **Privacy / terms** dates and company name match live site footer.

When every box above is checked, treat **SEO launch** as complete for the whole project (ongoing content and A/B tests are outside this one-time pass).
