'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bell,
  Calendar,
  ChevronRight,
  Crown,
  HeartPulse,
  HelpCircle,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Mic,
  Moon,
  Settings,
  Shield,
  Star,
  Sun,
  Zap,
} from 'lucide-react'
import { CreatorIndustryInsights } from '@/components/guide/creator-industry-insights'

/** Long-form reference chapters (below the orbital walkthrough on Guide). */
export function GuideReferenceSections() {
  return (
    <div className="space-y-10">
      <section id="getting-started">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Getting started
            </CardTitle>
            <CardDescription>Your first steps in Circe et Venus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Circe et Venus gives you two divine AIs: <strong className="text-circe-light">Circe</strong> focuses on
              retention, analytics, and protection (keeping your fans and content safe).{' '}
              <strong className="text-amber-500">Venus</strong> focuses on growth, attraction, and reputation (bringing in
              new fans and opportunities).
            </p>
            <p>
              After sign-up you&apos;ll see a short tutorial. You can skip it or complete it, and reopen this Guide anytime
              from the sidebar. The most important step is connecting <strong>OnlyFans</strong> or <strong>Fansly</strong>{' '}
              so we can sync DMs, fans, and insights. ManyVids revenue can factor into <strong>Unified</strong> billing tiers
              — see Pricing and Billing.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="divine-manager" className="scroll-mt-24">
        <Card className="border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-background to-violet-500/[0.06]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Crown className="h-6 w-6 text-amber-500" />
              Divine Manager — your manager in one orbit
            </CardTitle>
            <CardDescription>
              Voice, text, tools, and daily rhythm in one place. Open anytime from the sidebar (crown icon) or{' '}
              <Link href="/dashboard/divine-manager" className="text-primary underline hover:no-underline">
                Divine Manager
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-muted-foreground">
            <p>
              Think of Divine Manager as a calm operations lead: it sees your tasks, your platforms, and your preferences,
              then helps you decide what to do next — by voice, by text, or by nudging the right screen open. It does not
              replace you; it recommends, drafts, and organizes, and you stay in control of what sends or publishes.
            </p>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
              <h4 className="mb-2 font-medium text-foreground">First-time setup (wizard)</h4>
              <p className="mb-2">
                Until you finish setup, you&apos;ll see a four-step wizard:{' '}
                <strong className="text-foreground">Persona &amp; boundaries</strong> (tone, flirty level, limits, optional example phrases),{' '}
                <strong className="text-foreground">Goals, archetype &amp; notifications</strong> (what you&apos;re aiming for, manager style, alert level),{' '}
                <strong className="text-foreground">Automation rules</strong> (scheduled help and voice auto options), then{' '}
                <strong className="text-foreground">Review and activate</strong> (beta acknowledgment and manager mode). You can change everything later in the console or under Preferences.
              </p>
              <p className="text-xs">
                Deep links: <code className="rounded bg-muted px-1 py-0.5 text-[11px]">?section=text</code> or{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">?section=chat</code> opens the text sheet;{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">?section=protocol</code> scrolls to the{' '}
                <strong className="text-foreground">Today plan + protocol tasks</strong> block;{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">?section=tasks</code> scrolls straight to the tasks card.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Mic className="h-4 w-4 text-amber-500" />
                Voice (floating crown)
              </h4>
              <p className="mb-2">
                Tap the <strong>floating crown</strong> to start a live voice session. You can use the launcher (Text
                Divine, Divine Manager, AI Studio shortcuts) or skip straight into a call if you turn that on in Divine
                Manager settings. While you speak, Divine can use tools, read your analytics, open Messages, and more —
                same capabilities as text, tuned for voice.
              </p>
              <p className="mb-2">
                In settings you can choose how <strong>chatty</strong> Divine is: brief answers, balanced, or a bit more
                expressive — for both voice and text. You can also choose when the <strong>End call</strong> button unlocks
                (always, or only after Divine asks if you need anything else).
              </p>
              <p>
                Quick entry:{' '}
                <Link href="/dashboard/divine-manager?section=voice" className="text-primary underline hover:no-underline">
                  Voice section
                </Link>
                .
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">Text chat</h4>
              <p className="mb-2">
                Open the <strong>text sheet</strong> for the same Divine Manager brain when you prefer typing. It shares
                context with voice and is ideal for longer instructions or pasting links. The same sheet opens when the URL includes{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">?section=chat</code>.
              </p>
              <p>
                <Link href="/dashboard/divine-manager?section=text" className="text-primary underline hover:no-underline">
                  Open with text focus
                </Link>
                .
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">Protocol tasks (floating rail)</h4>
              <p className="mb-2">
                Above the crown, the <strong>protocol rail</strong> lists open tasks Divine or you added — follow-ups,
                welcome flows, whale reminders. The panel is <strong>collapsible</strong> so you can tuck it away when you
                need a clear screen.
              </p>
              <p className="mb-2">
                <strong>AI briefing (linked)</strong> uses tasks that are tied to saved inbox notifications. If nothing is
                linked yet, add tasks from Divine or connect them to the right notification when you set them up.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Bell className="h-4 w-4 text-violet-500" />
                Bell &amp; notifications
              </h4>
              <p className="mb-2">
                The <strong>Live</strong> tab shows messages, tips, and updates from connected platforms as they arrive.
                The <strong>Divine</strong> tab gathers leaks, reputation, whales, billing, and Divine Manager actions. You
                can run a <strong>briefing</strong> from the bell to walk through saved items with Divine (voice or text).
              </p>
              <p>
                Rows that are only a preview from the platform may show as <em>not saved to your inbox yet</em> until they
                sync.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">Mimic Test (your voice for fan drafts)</h4>
              <p className="mb-2">
                The <strong>Mimic</strong> voice interview captures how you want fans to hear you. That style is used when
                Divine drafts a <strong>fan-facing line</strong> for you. Nothing sends automatically — you review first.
              </p>
              <p>
                <Link href="/dashboard/divine-manager?section=mimic" className="text-primary underline hover:no-underline">
                  Mimic section
                </Link>
                .
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">Today plan, tasks &amp; alerts</h4>
              <p className="mb-2">
                The <strong>Today plan</strong> and task lists help you see what Divine suggests for the day. Automation
                rules can create tasks for large tips, respect confirmation for sensitive flows, and more — all configurable
                on the Divine Manager page.
              </p>
              <p>
                Jump to{' '}
                <Link
                  href="/dashboard/divine-manager#divine-section-today-plan"
                  className="text-primary underline hover:no-underline"
                >
                  Today plan
                </Link>
                , the{' '}
                <Link href="/dashboard/divine-manager?section=protocol" className="text-primary underline hover:no-underline">
                  protocol block
                </Link>
                , or open the{' '}
                <Link href="/dashboard/divine-manager?section=tasks" className="text-primary underline hover:no-underline">
                  tasks
                </Link>{' '}
                and{' '}
                <Link href="/dashboard/divine-manager?section=alerts" className="text-primary underline hover:no-underline">
                  alerts
                </Link>{' '}
                sections.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">Background AI &amp; cron</h4>
              <p className="mb-2 text-xs">
                <strong>Enriched background runs</strong> in Divine Manager call a scheduled route (<code className="rounded bg-muted px-1">GET /api/cron/divine-manager</code>) protected by{' '}
                <code className="rounded bg-muted px-1">CRON_SECRET</code> or Vercel Cron (<code className="rounded bg-muted px-1">x-vercel-cron</code>). Enable background
                switches only when that job is configured for your environment.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: Use <strong>Start tour</strong> on the Divine Manager page while you are there for a short step-by-step
              intro (dialog-based tour).
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="connecting-platforms">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Connecting your platforms
            </CardTitle>
            <CardDescription>Link OnlyFans and Fansly; ManyVids on Unified billing where applicable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Go to{' '}
              <Link href="/dashboard/settings?tab=integrations" className="text-primary underline hover:no-underline">
                Settings → Integrations
              </Link>{' '}
              (or use the platform cards on the dashboard). We use secure, read-only connections: your login credentials
              are never stored on our servers; they are used only to establish a session with our trusted data partner.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>OnlyFans</strong> — Connect with your OnlyFans email and password. See the OnlyFans section below
                for tips (proxy, 2FA, face verification, session expiry).
              </li>
              <li>
                <strong>Fansly</strong> — Connect with your Fansly username/email and password. You may be asked for 2FA;
                we&apos;ll prompt you in the dialog.
              </li>
              <li>
                <strong>ManyVids</strong> — Used for revenue and Unified-tier pricing when your plan includes it; in-app
                tools still center on OnlyFans and Fansly surfaces.
              </li>
            </ul>
            <p>
              Once connected, use <strong>Sync</strong> to pull the latest fans, messages, and earnings. If a platform
              session expires (e.g. you changed your password or OnlyFans logged you out), we automatically disconnect that
              account for security. You can reconnect anytime with a fresh login.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="onlyfans">
        <Card>
          <CardHeader>
            <CardTitle>OnlyFans connection (detailed)</CardTitle>
            <CardDescription>Login flow, proxy, 2FA, face verification, and session expiry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="mb-1 font-medium text-foreground">Login can take up to a minute</h4>
              <p>
                OnlyFans authentication runs in the background. We keep polling until it completes. You may see steps like
                &quot;Filling out login&quot; or &quot;Submitting&quot; — that&apos;s normal. Don&apos;t close the dialog
                until you see success or a request for 2FA/face verification.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Proxy region (US / UK)</h4>
              <p>
                When you connect OnlyFans, you can choose a proxy region (US or UK). If login seems stuck at the form step
                for a long time, try <strong>Start fresh login</strong> and switch to the other region (e.g. from US to UK).
                This often resolves issues related to geography or VPN.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Start fresh login</h4>
              <p>
                If the connection dialog is stuck (e.g. still &quot;Filling out login&quot; after 45+ seconds), use the{' '}
                <strong>Start fresh login</strong> button. This abandons the current attempt and shows the form again so you
                can re-enter your credentials and optionally change the proxy. Never reuse a stuck attempt — always start
                fresh.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">2FA (two-factor authentication)</h4>
              <p>
                If OnlyFans has 2FA enabled, you&apos;ll be asked for the code (from your email or authenticator app).
                Enter the 6-digit code in the dialog and click <strong>Verify &amp; Connect</strong>. We keep the same
                attempt so the code is applied correctly.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Face verification</h4>
              <p>
                Sometimes OnlyFans requires a quick face check. If so, we show a message and a link:{' '}
                <strong>Complete face verification</strong>. Open the link in your browser, complete the check, then return
                to the dialog. We keep polling and will complete the connection once OnlyFans confirms.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Session expired</h4>
              <p>
                If your OnlyFans session expires (e.g. you changed your password, or OnlyFans logged you out), our system
                detects it when you try to sync or load messages. We automatically disconnect the OnlyFans account in our
                database so your data stays consistent. You&apos;ll see a message like &quot;Your OnlyFans session expired.
                Please reconnect.&quot; Go to Settings → Integrations and connect OnlyFans again with a{' '}
                <strong>fresh login</strong> (don&apos;t reuse an old attempt).
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Display name</h4>
              <p>
                The name shown for your account in our partner&apos;s console is your <strong>Circe et Venus identity</strong>{' '}
                (your profile name or the email you used to sign up with us), not your OnlyFans login email. This helps you
                and support identify your workspace without exposing your OnlyFans credentials.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="dashboard">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </CardTitle>
            <CardDescription>Your command center</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The main <Link href="/dashboard" className="text-primary underline hover:no-underline">
                Dashboard
              </Link>{' '}
              shows an overview of revenue, fans, and messages. You get quick access to Circe and Venus, platform
              connection status, recent fans, and alerts (e.g. leak alerts, mentions). Use the sidebar to go deeper:{' '}
              <Link href="/dashboard/divine-manager" className="text-primary underline hover:no-underline">
                Divine Manager
              </Link>
              , Analytics (Circe), Fans and Mentions (Venus), Content, Messages, Protection, and AI Studio. The top bar
              also includes a Well-being shortcut (heart pulse icon) on every page.
            </p>
            <p>
              <a
                href="#well-being"
                className="inline-flex items-center gap-1 font-medium text-primary underline hover:no-underline"
              >
                <HeartPulse className="h-4 w-4" />
                Well-being &amp; cosmic calendar
              </a>{' '}
              — see the dedicated section below for rhythm, Mimic snapshot, and lunar calendar.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="well-being" className="scroll-mt-24">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary" />
              Well-being &amp; cosmic calendar
            </CardTitle>
            <CardDescription>Pressure, Mimic snapshot, moon phases, and zodiac — in one gentle view</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/well-being" className="font-medium text-primary underline hover:no-underline">
                Well-being
              </Link>{' '}
              combines conversational load from your connected platforms, your Mimic interview snapshot, and the cosmic
              calendar so you can see pressure and rhythm in one place.
            </p>
            <p>
              The <strong>cosmic calendar</strong> opens with a calm hero: a daily affirmation, a large{' '}
              <strong>moon phase</strong> visual (not just a tiny icon), the current <strong>Western zodiac season</strong>,
              and the <strong>Chinese zodiac animal for the lunar year</strong>. You can scroll horizontally through all
              twelve Western signs and all twelve lunar animals; your current season and year are highlighted.
            </p>
            <p>
              A <strong>moon phase strip</strong> shows each phase of the cycle at a glance; the month grid shows the day
              number and moon emoji for quick scanning. Tap a day for glow score, moon, and sign details for that date.
            </p>
            <p className="text-xs text-muted-foreground/90">
              Add your birthday in Settings when you want deeper personalized notes (encryption options may apply); the
              calendar is still uplifting even before that.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="ai-guides">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              AI Guides: Circe &amp; Venus
            </CardTitle>
            <CardDescription>Two divine AIs at your service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-lg border border-circe/30 bg-circe/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-circe-light">
                <Moon className="h-4 w-4" />
                Circe — Retention &amp; Protection
              </h4>
              <p>
                Circe helps you keep your audience captivated and your content safe. Use her for: retention analytics,
                churn prediction, leak detection and DMCA automation, fan engagement scoring, and alerts. Access her from the
                dashboard or via{' '}
                <Link href="/dashboard/analytics" className="text-primary underline hover:no-underline">
                  Analytics
                </Link>{' '}
                and{' '}
                <Link href="/dashboard/protection" className="text-primary underline hover:no-underline">
                  Protection
                </Link>
                .
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-amber-500">
                <Sun className="h-4 w-4" />
                Venus — Growth &amp; Attraction
              </h4>
              <p>
                Venus helps you attract new admirers and grow your reputation. Use her for: growth strategies, optimal
                posting times, content performance predictions, reputation and sentiment monitoring, and fan acquisition.
                Access her from the dashboard or via{' '}
                <Link href="/dashboard/fans" className="text-primary underline hover:no-underline">
                  Fans
                </Link>{' '}
                and{' '}
                <Link href="/dashboard/mentions" className="text-primary underline hover:no-underline">
                  Mentions
                </Link>
                .
              </p>
            </div>
            <p>
              <Link href="/dashboard/ai-studio" className="inline-flex items-center gap-1 text-primary underline hover:no-underline">
                AI Studio
              </Link>{' '}
              is your media vault (describe content for Divine), safe photo touch-ups, and the full AI tools library
              (captions, churn, growth, and more).
            </p>
            <div id="circe-daily-tips" className="scroll-mt-24 rounded-lg border border-circe/35 bg-circe/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-circe-light">
                <Moon className="h-4 w-4" />
                Daily AI tips from Circe
              </h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Curated, rotating tips for using Circe et Venus well — sync habits, vault notes, mass segments, Protection,
                and more. Updated with a new &quot;tip of the day&quot; on the calendar; the full list lives on one page.
              </p>
              <Link
                href="/dashboard/community/circe-daily"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline hover:no-underline"
              >
                Open Daily AI tips from Circe (full page)
                <ChevronRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">
                Also linked from{' '}
                <Link href="/dashboard/community" className="text-primary underline hover:no-underline">
                  Suggestions
                </Link>{' '}
                at the top of the screen.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="messages-fans">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages &amp; Fans
            </CardTitle>
            <CardDescription>Conversations and fan management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/messages" className="text-primary underline hover:no-underline">
                Messages
              </Link>{' '}
              shows your DMs from connected platforms. You can view conversations and use AI-powered reply suggestions. If
              OnlyFans session has expired, you&apos;ll see an error and need to reconnect OnlyFans from Settings →
              Integrations before messages load again.
            </p>
            <p>
              <Link href="/dashboard/fans" className="text-primary underline hover:no-underline">
                Fans
              </Link>{' '}
              lists your subscribers/fans synced from your platforms. You can see who&apos;s active, who might churn, and
              add manual fans if needed. Tags and notes help Circe et Venus tailor suggestions and respect your boundaries.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="content">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Content
            </CardTitle>
            <CardDescription>Posts and calendar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/content" className="text-primary underline hover:no-underline">
                Content
              </Link>{' '}
              lets you view and manage posts. Connect platforms and sync to import existing content, or create new content.
              The content calendar helps you plan and schedule aligned with your strategy.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="protection">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Protection
            </CardTitle>
            <CardDescription>Leak detection and DMCA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/protection" className="text-primary underline hover:no-underline">
                Protection
              </Link>{' '}
              is Circe&apos;s domain. Here you get leak alerts and tools to issue DMCA takedowns. We help you find
              unauthorized use of your content and guide you through the process of protecting your work.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="settings">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
            <CardDescription>Profile, notifications, integrations, billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/settings" className="text-primary underline hover:no-underline">
                Settings
              </Link>{' '}
              is where you manage your profile (name, avatar), notifications, security (password), billing and subscription,
              and <strong>Integrations</strong> (connect/disconnect platforms). Use the Integrations tab for OnlyFans,
              Fansly, and any other listed platforms, then sync or disconnect as needed.
            </p>
          </CardContent>
        </Card>
      </section>

      <CreatorIndustryInsights />

      <section id="troubleshooting">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Troubleshooting
            </CardTitle>
            <CardDescription>Common issues and fixes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="mb-1 font-medium text-foreground">OnlyFans login stuck at &quot;Filling out login&quot;</h4>
              <p>
                Click <strong>Start fresh login</strong>, choose the other proxy (US or UK), and try again. Avoid reusing the
                same attempt.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">OnlyFans session expired / &quot;Please reconnect&quot;</h4>
              <p>
                We disconnected your OnlyFans account for security. Go to Settings → Integrations and connect OnlyFans again
                with a fresh login (email + password, then 2FA or face verification if prompted).
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Messages or sync fail with &quot;session expired&quot;</h4>
              <p>Same as above: reconnect the affected platform from Settings → Integrations.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">2FA or face verification not showing</h4>
              <p>
                Make sure you completed the previous step (e.g. entered password and waited). If the dialog closed, open
                Connect again and start a new login — don&apos;t reuse an old attempt ID.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Need more help?</h4>
              <p>
                Contact support at{' '}
                <a href="mailto:support@circe-venus.com" className="text-primary underline hover:no-underline">
                  support@circe-venus.com
                </a>{' '}
                or via the{' '}
                <Link href="/contact" className="text-primary underline hover:no-underline">
                  Contact
                </Link>{' '}
                page.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end pt-4">
        <Link
          href="/dashboard/settings?tab=integrations"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Go to Integrations
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
