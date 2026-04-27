'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

/** Industry research snapshot (aggregated public studies) — for realistic expectations, not guarantees. */
const INSIGHTS: string[] = [
  'Only about 4.2% of subscribers spend beyond the sub; they average ~$48.52 per creator — finding and retaining payers matters.',
  'Top 0.1% of creators capture a large share of total earnings; most creators split the remainder — competition at the top is intense.',
  'Roughly ~$2 ARPU per subscriber is a common benchmark — keep acquisition cost below that to stay healthy.',
  'A tiny share of “whale” fans can drive a disproportionate share of revenue — identify and nurture them.',
  'DMs often dominate income vs. subscriptions alone — personal interaction scales value.',
  'A large share of payments can happen in the first 48 hours — onboard and engage new subs quickly.',
  'Weekends often see a revenue bump — good windows for drops and promos.',
  'Most subscribers never message first — proactive outreach unlocks hidden revenue.',
  'Typical creator income is modest (often low hundreds/month range in many datasets) — treat it as a business.',
  'Most traffic is mobile — optimize previews, thumbnails, and messages for phones.',
  'Platform fees (~20% on OnlyFans) belong in every margin model.',
  'Saturday often leads weekday spend; mid-week can lag — schedule accordingly.',
  'Creator approval is competitive — not every application is accepted.',
  'Top earners usually mix subs, tips, PPV, and merch — diversify revenue.',
  'PPV + freemium/low sub is a common high-leverage pattern when done well.',
  'Spamming PPV in DMs hurts — tease in feed, sell in messages with restraint.',
  'Non-rounded prices ($x.99) are a common psychological tactic.',
  'Bundles (3/6/12 mo) trade margin for retention and upfront cash.',
  'Promos (e.g. 50–80% off month one) can lower friction for uncertain subscribers.',
  'Retention is usually cheaper than acquisition.',
  'Segment fans by spend and engagement — one message rarely fits all.',
  'Build a monetization ladder instead of random PPV spikes.',
  'Creator-to-fan ratio keeps rising — standing out is harder without external traffic.',
  'Platforms do not guarantee discovery — Twitter/X, Reddit, TikTok, and SEO matter.',
  'Collabs and shoutouts can multiply reach without paid ads.',
  'Posting consistency supports retention and perceived value.',
  'Track churn, PPV attach rate, messages per sub, and unlock rate — not just vanity metrics.',
  'Price tests need 30–90+ days to survive subscription cycles.',
  'AI-assisted personalization and chat can materially lift ARPU where used well.',
  'Sessions are often short (~10–15 min) — design CTAs to fit that window.',
  'Many paying fans disengage after day 1–2 — early engagement is critical.',
  'Average fan lifespan is often measured in weeks, not years — urgency matters.',
  'Reddit and high-intent traffic can show strong ARPU in some cohorts.',
  'TikTok can convert well but may cost more per conversation — test ROI.',
  'Renewal rates can be low — recurring revenue is earned, not automatic.',
  'Female creators often out-earn male creators in aggregate datasets — plan accordingly.',
  'Repeat purchase rates drop after each step — engineer a ladder of value.',
  'Most creators have modest subscriber counts — growth is not automatic.',
  'Majority of new creators quit within a year — longevity is a moat.',
  'Paid traffic ROI can compound over 6–12 months when invested consistently.',
]

export function CreatorIndustryInsights() {
  return (
    <section id="creator-industry-insights">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Creator industry insights (40)
          </CardTitle>
          <CardDescription>
            Condensed from public research and platform analytics summaries. Use for planning — not a promise of
            your results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {INSIGHTS.map((text, i) => (
              <li key={i} className="leading-snug">
                {text}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  )
}
