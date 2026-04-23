/**
 * OnlyFans / creator-economy research insights (40).
 * Sources: original client study + follow-on stats. Used for daily rotation and random popups.
 */

const L = { analytics: { label: 'Open analytics', href: '/dashboard/analytics' as const } }
const M = { label: 'Open messages', href: '/dashboard/messages' as const }
const F = { label: 'Open fans', href: '/dashboard/fans' as const }
const D = { label: 'Dashboard', href: '/dashboard' as const }
const A = L.analytics

export const OF_CREATOR_INSIGHTS = [
  {
    id: 'of-01',
    title: 'Only 4.2% of subscribers actually spend',
    body:
      'About 4.2% of subscribers spend money, averaging $48.52 per creator. The majority (95.8%) pay nothing. Finding, serving, and retaining the paying minority is the core of the business.',
    link: A,
  },
  {
    id: 'of-02',
    title: 'The top 0.1% take most of the money',
    body:
      'The top 0.1% of creators capture about 76% of all earnings, averaging roughly $146,881 per month. The remaining 99.9% share the rest — competition at the top is brutal; expectations must stay realistic.',
    link: A,
  },
  {
    id: 'of-03',
    title: 'Roughly $2 per subscriber on average',
    body:
      'Creators earn an average of about $2.06 per subscriber. To stay profitable, acquisition and service costs per fan should stay below that level. Unit economics are non-negotiable.',
    link: A,
  },
  {
    id: 'of-04',
    title: '“Whales” drive a huge share of revenue',
    body:
      'Only about 0.01% of subscribers behave as “whales,” yet they drive about 20.2% of all revenue. In one million-fan sample, just 100 such users generated $412,823. Identify and protect those relationships.',
    link: F,
  },
  {
    id: 'of-05',
    title: 'Messages beat subscriptions for income',
    body:
      'Direct messages account for about 69.7% of income versus roughly 4.1% from subscription fees alone. Personal interaction and timely offers are worth more than passive content.',
    link: M,
  },
  {
    id: 'of-06',
    title: 'The first 48 hours matter most',
    body:
      'About 83% of payments occur within the first 48 hours of subscription. Engage new fans immediately with welcome flows, clear offers, and fast replies while intent is high.',
    link: M,
  },
  {
    id: 'of-07',
    title: 'Weekends hit hardest for revenue',
    body:
      'Weekends account for about 29.7% of revenue — the best window for promos, PPV, and new drops. Shift highlight activity toward Friday through Sunday when possible.',
    link: A,
  },
  {
    id: 'of-08',
    title: 'Most fans will not message first',
    body:
      'Only about 17% of subscribers start a chat. The other 83% need you to open the loop. Proactive, segmented messaging is default, not optional.',
    link: M,
  },
  {
    id: 'of-09',
    title: '“Average” income is small',
    body:
      'A typical creator makes about $150–180 per month from roughly 21 subscribers. Success means treating the page like a business with systems, not as a casual side project.',
    link: A,
  },
  {
    id: 'of-10',
    title: 'Mobile dominates traffic',
    body:
      'About 84% of OnlyFans traffic is mobile. Thumbnails, copy, landing previews, and PPV cards must be legible and compelling on a phone first.',
    link: D,
  },
  {
    id: 'of-11',
    title: 'Remember the 20% platform cut',
    body:
      'The platform takes 20% of revenue from subscriptions, tips, PPV, and messages. Model pricing, promos, and goals on net — not gross — numbers.',
    link: A,
  },
  {
    id: 'of-12',
    title: 'Saturday peaks; midweek softens',
    body:
      'Saturdays see the largest share of transaction activity (~15.4%); Wednesdays are relatively softer (~13.6%). Time premium offers and PPV to peak days.',
    link: A,
  },
  {
    id: 'of-13',
    title: 'Creator approval is competitive',
    body:
      'In early 2025 only about 36% of applications were approved, with on the order of 179,000 applications in February alone. Onboarding, compliance, and a clear offer matter before the first post.',
    link: D,
  },
  {
    id: 'of-14',
    title: 'Top earners stack revenue streams',
    body:
      'The most successful creators combine subscriptions, tips, PPV, and merch rather than depending on a single line. Diversification reduces volatility.',
    link: A,
  },
  {
    id: 'of-15',
    title: 'PPV + freemium is high leverage',
    body:
      'A freemium or low sub price with strong PPV upsell is a leading pattern for driving revenue among pages that offer free or steeply discounted access.',
    link: M,
  },
  {
    id: 'of-16',
    title: 'Overusing PPV trained fans to ignore',
    body:
      'PPV works best when it is rarer and more targeted than the main feed. Tease in the feed; deliver the full value via PPV. Flooding inboxes depresses response.',
    link: M,
  },
  {
    id: 'of-17',
    title: 'Non-rounded prices work',
    body:
      'Prices like $14.99 or $29.49 are common among top earners; non-rounded numbers can subtly support conversion compared to even dollar amounts.',
    link: A,
  },
  {
    id: 'of-18',
    title: 'Bundle discounts protect retention',
    body:
      'Standard bundles (e.g. ~10% for 3 months, ~20% for 6, ~30–40% for annual) trade per-month margin for better retention and more upfront cash.',
    link: F,
  },
  {
    id: 'of-19',
    title: 'Acq promos: 50–80% off month one',
    body:
      'New-creator promos in the 50–80% off first month range can lower the barrier to sub; the goal is to deliver enough value to convert to full price on renewal.',
    link: A,
  },
  {
    id: 'of-20',
    title: 'Retention beats always chasing new subs',
    body:
      'Keeping existing spenders is usually cheaper and more stable than only buying cold traffic. Loyalty programs and good service compound over time.',
    link: F,
  },
  {
    id: 'of-21',
    title: 'Segmentation beats one blast to all',
    body:
      'The same offer to every fan is either spam to low spenders or too weak for whales. Segment by spend and engagement; tailor frequency and offer strength.',
    link: F,
  },
  {
    id: 'of-22',
    title: 'Build a monetization ladder',
    body:
      'Random PPV gives random income. A ladder (free → tease → PPV → VIP) makes revenue more predictable. Move fans up steps instead of maxing on day one.',
    link: M,
  },
  {
    id: 'of-23',
    title: 'The creator-to-fan ratio is crowded',
    body:
      'There is on the order of one creator for every 81+ fans. As supply grows, standing out and driving external traffic becomes essential.',
    link: A,
  },
  {
    id: 'of-24',
    title: 'Relying only on in-app traffic is risky',
    body:
      'The platform does not guarantee discovery. Creators who depend only on internal traffic see uneven growth. X, Reddit, TikTok, and search need to be part of the plan.',
    link: D,
  },
  {
    id: 'of-25',
    title: 'Collabs multiply reach',
    body:
      'Mutual shoutouts, teasers, and co-promoted drops let you borrow audience at near-zero ad cost. Reciprocal value beats one-way begging.',
    link: D,
  },
  {
    id: 'of-26',
    title: 'Post cadence keeps subs',
    body:
      'Consistent daily or weekly posting supports loyalty. Many cancels are “I did not get enough value for the money” — not price alone.',
    link: A,
  },
  {
    id: 'of-27',
    title: 'Track churn, PPV %, and engagement',
    body:
      'Key signals: sub churn, share of fans buying PPV, messages per sub, and unlock rate. Creators who ignore the numbers are flying blind.',
    link: A,
  },
  {
    id: 'of-28',
    title: 'Run pricing tests for 30–90 days',
    body:
      'Valid pricing tests need time to clear billing cycles and seasonality. Judging a change after a week often misreads the trend.',
    link: A,
  },
  {
    id: 'of-29',
    title: 'AI can lift ARPU 18–25%',
    body:
      'Research-style benchmarks suggest strong personalization and AI-assisted chat can materially raise average revenue per user. Agencies already scale fan chat with tools.',
    link: { label: 'AI Studio', href: '/dashboard/ai-studio' },
  },
  {
    id: 'of-30',
    title: 'Average session: about 11 minutes',
    body:
      'Users spend on the order of 11 minutes per session. Design posts and DMs to drive a next action (reply, unlock, tip) within that window.',
    link: M,
  },
  {
    id: 'of-31',
    title: 'Most disengage after day two',
    body:
      'Among fans who transacted, about half stopped engaging after the second day; a large share only bought on sub day and vanished. Under 5% stay active past ~10 days without effort. The window to bond is very short.',
    link: M,
  },
  {
    id: 'of-32',
    title: 'Typical fan lifespan: ~45 days',
    body:
      'Average fan life on a page is about 44.9 days. Treating every sub as a long-term relationship without proactive engagement loses most of them first.',
    link: F,
  },
  {
    id: 'of-33',
    title: 'Reddit and quality traffic can pay more',
    body:
      'Reddit can lead to very high average revenue per paying user (sample ARPU ~$88.10), with other “creator traffic” sources also strong. Volume without quality wastes effort.',
    link: A,
  },
  {
    id: 'of-34',
    title: 'TikTok: high conversion, higher cost to chat',
    body:
      'TikTok can show the best purchase conversion and longer fan life among traffic sources, but can cost more per conversation. Worth investing where numbers prove out.',
    link: A,
  },
  {
    id: 'of-35',
    title: 'Subscription renewal is a minority outcome',
    body:
      'Paid pages see subscription renew only about 18.4% of the time. Recurring base is hard — retention and ladder design matter as much as acquisition.',
    link: F,
  },
  {
    id: 'of-36',
    title: 'Large gender earnings gap on platform averages',
    body:
      'On average, female creators earn on the order of 78% more than male creators in platform-reported data. Strategy and expectations should reflect that headwind where it applies.',
    link: A,
  },
  {
    id: 'of-37',
    title: 'Fifth purchase is very rare in the funnel',
    body:
      'In a large sample, only about 0.41% of fans made a fifth purchase. Each repeat step is harder. Design a progressive value ladder, not a one-time squeeze.',
    link: A,
  },
  {
    id: 'of-38',
    title: 'Most creators stay under 500 fans',
    body:
      'About 65% of creators have fewer than 500 subscribers. Escaping the long tail needs deliberate growth and often external traffic, not only posting more.',
    link: A,
  },
  {
    id: 'of-39',
    title: 'Over 60% of new creators leave within a year',
    body:
      'A majority of new creators leave within the first year, often from burnout or low earnings. Surviving year one is itself a form of compounding advantage.',
    link: D,
  },
  {
    id: 'of-40',
    title: 'Paid traffic ROI can compound by month 6–12',
    body:
      'In aggregate benchmarks, paid traffic can show around 114% ROI in 3–6 months and about 141% at 6–12 months. Consistent testing beats one-off tests.',
    link: A,
  },
]
