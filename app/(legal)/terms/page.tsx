'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Caps({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase leading-relaxed tracking-wide text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  )
}

export default function TermsOfServicePage() {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <ThemedLogo width={32} height={32} className="rounded-full" priority />
            <span className="font-serif text-lg font-semibold text-primary">CIRCE ET VENUS</span>
          </Link>
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <p className="text-sm font-medium text-muted-foreground">circeetvenus.com</p>
        <h1 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
          Terms of Service &amp; User Agreement
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Effective date: April 1, 2026
        </p>

        <article className="prose prose-invert mt-10 max-w-full space-y-10 text-muted-foreground prose-headings:font-semibold prose-headings:text-foreground prose-p:leading-relaxed prose-li:marker:text-primary">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <Caps>
              By accessing or using the Circe et Venus platform, website, software, or any associated services
              (collectively, the &quot;Service&quot;), you acknowledge that you have read, understood, and agree to be
              legally bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms in their
              entirety, you must immediately cease all access to and use of the Service.
            </Caps>
            <p className="mt-4">
              These Terms constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or
              &quot;your&quot;) and Circe et Venus Inc. (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;). We reserve the right to update or modify these Terms at any time, with or without
              notice. Your continued use of the Service after any modification constitutes your acceptance of the
              revised Terms. We encourage you to review these Terms periodically.
            </p>
            <p className="mt-4">
              These Terms apply to all users of the Service, including without limitation users who are creators,
              agencies, subscribers, browsers, and contributors of content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Eligibility</h2>
            <p>To use the Service, you represent and warrant that:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                You are at least 18 years of age and have the legal capacity to enter into binding contracts in your
                jurisdiction.
              </li>
              <li>
                You are not prohibited from accessing or using the Service under applicable laws, regulations, or
                court orders.
              </li>
              <li>All information you provide to us is accurate, current, and complete.</li>
              <li>Your use of the Service complies with all laws and regulations applicable to you.</li>
            </ul>
            <p className="mt-4">
              The Company makes no representation that the Service is appropriate or available for use in any particular
              jurisdiction. Accessing the Service from territories where its contents or use is illegal is prohibited. You
              do so at your own risk and are solely responsible for compliance with local laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Account Registration &amp; Security</h2>
            <p>To access certain features of the Service, you must create an account. You agree to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Provide accurate, truthful, and complete registration information.</li>
              <li>Maintain and promptly update your account information.</li>
              <li>Keep your password and login credentials strictly confidential.</li>
              <li>Notify us immediately of any unauthorized use of your account or breach of security.</li>
              <li>
                Accept responsibility for all activities that occur under your account, whether or not authorized by
                you.
              </li>
            </ul>
            <p className="mt-4">
              The Company reserves the right to terminate, suspend, or refuse service to any account at any time and for
              any reason, including but not limited to violation of these Terms, without prior notice and without
              liability to you.
            </p>
            <Caps className="mt-4">
              You are solely responsible for all activity that occurs under your account. The Company shall not be liable
              for any loss or damage arising from your failure to maintain the security of your account.
            </Caps>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Description of Services</h2>
            <p>
              Circe et Venus provides a SaaS platform offering AI-powered tools for content creators and agencies,
              including but not limited to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Circe AI — retention analytics, fan engagement insights, and churn risk analysis.</li>
              <li>Venus AI — growth strategies, reputation monitoring, and attraction optimization.</li>
              <li>Aegis — leak detection and DMCA protection assistance.</li>
              <li>Cosmic Content Calendar — astrology-aligned content scheduling.</li>
              <li>Revenue analytics, fan segmentation, and messaging tools.</li>
            </ul>
            <Caps className="mt-4">
              The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. All features, pricing
              tiers, and offerings are subject to change at our sole discretion without notice.
            </Caps>
            <p className="mt-4">
              The astrology-based features and content calendar recommendations are for entertainment and informational
              purposes only. The Company makes no representation that astrological data will improve content performance,
              engagement, or revenue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Subscription, Billing &amp; Payments</h2>
            <h3 className="mt-4 text-lg font-medium text-foreground">5.1 Subscription Plans</h3>
            <p>
              The Service is offered under various subscription tiers. Your subscription tier determines the features
              and usage limits available to you. The Company may modify, add, or remove subscription tiers at any time.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">5.2 Billing &amp; Auto-Renewal</h3>
            <p>
              Subscriptions are billed on a recurring basis (monthly or annually, as selected). By providing your payment
              information, you authorize the Company to charge your payment method for all fees incurred. Subscriptions
              automatically renew at the end of each billing period unless cancelled. It is your responsibility to cancel
              prior to renewal if you do not wish to continue.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">5.3 No Refunds</h3>
            <Caps>
              All fees are non-refundable to the fullest extent permitted by applicable law. This includes but is not
              limited to partial-month cancellations, unused credits, feature changes, or dissatisfaction with results.
              The Company has no obligation to provide refunds or credits for any reason.
            </Caps>
            <h3 className="mt-6 text-lg font-medium text-foreground">5.4 Price Changes</h3>
            <p>
              The Company reserves the right to change subscription pricing at any time. We will provide reasonable
              notice of material price changes; however, your continued use of the Service after the effective date of
              any price change constitutes your acceptance of the new pricing.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">5.5 Taxes</h3>
            <p>
              You are solely responsible for all taxes, duties, and similar charges associated with your subscription
              and use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Acceptable Use Policy</h2>
            <p>
              You agree to use the Service only for lawful purposes and in compliance with these Terms. You are
              expressly prohibited from:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                Using the Service to transmit, distribute, or store material that violates applicable law, third-party
                rights, or these Terms.
              </li>
              <li>
                Uploading or distributing content that infringes any copyright, trademark, trade secret, patent, or
                other intellectual property right of any third party.
              </li>
              <li>Using the Service to harass, abuse, stalk, threaten, or harm any individual.</li>
              <li>
                Attempting to reverse-engineer, decompile, disassemble, or otherwise derive source code from the Service.
              </li>
              <li>
                Accessing or using the Service in ways designed to avoid incurring fees or circumvent usage limits.
              </li>
              <li>
                Using automated bots, scrapers, or similar tools to access the Service without our express written
                permission.
              </li>
              <li>Introducing malware, viruses, or any harmful code into the Service.</li>
              <li>Misrepresenting your identity or affiliation with any person or entity.</li>
              <li>
                Using the Service for any purpose that violates the terms of third-party platforms integrated with the
                Service.
              </li>
            </ul>
            <p className="mt-4">
              Violation of this Acceptable Use Policy may result in immediate suspension or termination of your account
              without notice or refund, and may subject you to legal liability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Intellectual Property</h2>
            <h3 className="mt-4 text-lg font-medium text-foreground">7.1 Company IP</h3>
            <p>
              The Service, including all software, algorithms, AI models, interfaces, designs, text, graphics, logos,
              and other content provided by the Company, is the exclusive property of Circe et Venus Inc. and its
              licensors, protected by copyright, trademark, trade secret, and other intellectual property laws. Nothing
              in these Terms grants you any right, title, or interest in the Service beyond the limited license granted
              herein.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">7.2 Limited License</h3>
            <p>
              Subject to your compliance with these Terms, the Company grants you a limited, non-exclusive,
              non-transferable, revocable license to access and use the Service for your internal business or personal
              purposes. This license does not include the right to sublicense, resell, reproduce, or create derivative
              works of the Service.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">7.3 User Content</h3>
            <p>
              You retain ownership of content you upload or submit to the Service (&quot;User Content&quot;). By
              submitting User Content, you grant the Company a worldwide, royalty-free, sublicensable license to use,
              reproduce, process, adapt, and display such content solely to the extent necessary to provide the Service.
              You represent and warrant that you own or have sufficient rights in all User Content you submit.
            </p>
            <Caps className="mt-4">
              The Company assumes no responsibility or liability for User Content and shall not be liable for any loss
              or damage arising from or relating to any User Content.
            </Caps>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. DMCA Protection &amp; Aegis Feature</h2>
            <p>The Aegis feature is designed to assist users in identifying potential unauthorized use of their content. However:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                Aegis is an automated monitoring tool and does not guarantee detection of all unauthorized uses of your
                content.
              </li>
              <li>
                The Company does not provide legal advice and is not a law firm. Aegis assistance does not constitute or
                substitute for legal counsel.
              </li>
              <li>
                The Company is not responsible for outcomes of any DMCA takedown process, including rejected notices or
                counter-notices.
              </li>
              <li>You are solely responsible for reviewing and approving any DMCA notices before submission.</li>
              <li>
                False or misrepresented DMCA notices may expose you to legal liability; the Company shall not be
                responsible for any such liability.
              </li>
            </ul>
            <Caps className="mt-4">
              The Company expressly disclaims all liability for the effectiveness, accuracy, or outcomes of the Aegis
              DMCA protection feature.
            </Caps>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. AI-Generated Content &amp; Recommendations</h2>
            <p>
              The Service incorporates artificial intelligence technologies to generate content recommendations,
              analytics insights, messaging suggestions, and other outputs (&quot;AI Outputs&quot;). You expressly
              acknowledge and agree that:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                AI Outputs are generated automatically and may be inaccurate, incomplete, biased, or unsuitable for your
                specific needs.
              </li>
              <li>
                AI Outputs do not constitute professional advice of any kind, including legal, financial, medical, or
                business advice.
              </li>
              <li>
                You are solely responsible for reviewing, approving, and taking responsibility for any AI Output before
                using it.
              </li>
              <li>
                The Company does not warrant that AI Outputs will achieve any particular result, engagement level,
                revenue outcome, or business objective.
              </li>
              <li>AI capabilities and outputs may change, degrade, or become unavailable without notice.</li>
            </ul>
            <Caps className="mt-4">
              The Company expressly disclaims all liability for any harm, loss, or damages arising from your reliance on
              or use of AI Outputs.
            </Caps>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Third-Party Platforms &amp; Integrations</h2>
            <p>
              The Service may integrate with or link to third-party platforms, services, and websites
              (&quot;Third-Party Services&quot;), including but not limited to content monetization platforms, social
              media networks, and analytics providers. You acknowledge and agree that:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>The Company does not control and is not responsible for Third-Party Services.</li>
              <li>
                Your use of Third-Party Services is subject to their respective terms of service and privacy policies.
              </li>
              <li>
                The Company shall not be liable for any loss, damage, or harm arising from your use of or reliance on
                Third-Party Services.
              </li>
              <li>Integrations may be modified, suspended, or discontinued at any time without notice.</li>
              <li>
                The availability of a third-party integration does not constitute the Company&apos;s endorsement of
                that service.
              </li>
            </ul>
            <Caps className="mt-4">
              You assume all risk associated with your use of Third-Party Services. The Company has no liability for the
              acts or omissions of any third party.
            </Caps>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Disclaimers of Warranties</h2>
            <Caps>
              To the fullest extent permitted by applicable law, the Service is provided &quot;as is&quot; and &quot;as
              available,&quot; without warranty of any kind. The Company expressly disclaims all warranties, whether
              express, implied, statutory, or otherwise, including but not limited to:
            </Caps>
            <ul className="mt-4 list-disc space-y-1 pl-6 text-sm">
              <li>
                Any implied warranty of merchantability, fitness for a particular purpose, title, or non-infringement.
              </li>
              <li>Any warranty that the Service will meet your requirements or expectations.</li>
              <li>
                Any warranty that the Service will be uninterrupted, timely, secure, error-free, or free of viruses or
                harmful components.
              </li>
              <li>Any warranty that defects in the Service will be corrected.</li>
              <li>
                Any warranty regarding the accuracy, reliability, completeness, or timeliness of any content, data, or
                AI output.
              </li>
              <li>
                Any warranty that the Service will achieve any particular business result, revenue outcome, follower
                growth, or engagement metric.
              </li>
            </ul>
            <Caps className="mt-4">
              No advice or information, whether oral or written, obtained by you from the Company or through the
              Service, will create any warranty not expressly stated in these Terms.
            </Caps>
            <p className="mt-4 text-sm">
              Some jurisdictions do not allow the exclusion of certain warranties. To the extent such exclusions are not
              permitted, they shall apply to the maximum extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Limitation of Liability</h2>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">To the maximum extent permitted by applicable law:</p>
            <ul className="mt-4 list-none space-y-4 text-sm">
              <li>
                <strong className="text-foreground">(A)</strong> In no event shall Circe et Venus Inc., its directors,
                officers, employees, agents, partners, suppliers, or licensors be liable for any indirect, incidental,
                special, consequential, exemplary, punitive, or enhanced damages, including but not limited to: loss of
                profits, revenue, data, goodwill, subscribers, reputation, business opportunities, or other intangible
                losses, arising out of or in connection with your use of or inability to use the Service, even if the
                Company has been advised of the possibility of such damages.
              </li>
              <li>
                <strong className="text-foreground">(B)</strong> The Company&apos;s total cumulative liability to you
                for all claims arising out of or relating to these Terms or the Service — whether in contract, tort,
                strict liability, or any other legal theory — shall not exceed the greater of: (i) the total fees paid by
                you to the Company in the twelve (12) months immediately preceding the event giving rise to the claim, or
                (ii) one hundred Canadian dollars (CAD $100.00).
              </li>
              <li>
                <strong className="text-foreground">(C)</strong> The foregoing limitations apply regardless of the form
                of action and even if a limited remedy is found to have failed of its essential purpose.
              </li>
            </ul>
            <p className="mt-4 text-sm">
              Some jurisdictions do not allow certain limitations of liability. Where such exclusions are not permitted
              by law, the Company&apos;s liability shall be limited to the maximum extent permitted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">13. Indemnification</h2>
            <p>
              You agree to indemnify, defend (at the Company&apos;s option), and hold harmless Circe et Venus Inc. and
              its officers, directors, employees, contractors, agents, licensors, and suppliers from and against any and
              all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees)
              arising out of or in connection with:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Your use of or access to the Service.</li>
              <li>Your violation of these Terms or any applicable law or regulation.</li>
              <li>Your User Content, including any claim that your content infringes any third-party right.</li>
              <li>Your interaction with any other user or third party through the Service.</li>
              <li>Your misrepresentation of any information provided to the Company.</li>
              <li>Any DMCA notice or takedown action initiated by you through the Aegis feature.</li>
            </ul>
            <p className="mt-4">
              The Company reserves the right to assume exclusive control of any matter subject to indemnification by
              you, and you agree to cooperate fully with the Company&apos;s defense of such claims.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">14. Data, Privacy &amp; Security</h2>
            <p>
              Your use of the Service is subject to our{' '}
              <Link href="/privacy" className="text-primary underline underline-offset-2 hover:no-underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. By using the Service, you consent to the collection,
              use, and sharing of your information as described in the Privacy Policy.
            </p>
            <Caps className="mt-4">
              While the Company implements commercially reasonable security measures, no transmission over the internet or
              method of electronic storage is completely secure. The Company does not guarantee the absolute security of
              your data and shall not be liable for any unauthorized access, data breach, or data loss.
            </Caps>
            <p className="mt-4">
              You are responsible for ensuring that any content you upload complies with applicable privacy laws,
              including laws governing the personal data of your fans and subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">15. Service Availability &amp; Downtime</h2>
            <p>
              The Company does not guarantee that the Service will be available at any particular time or that it will
              be uninterrupted. We reserve the right to modify, suspend, or discontinue the Service (or any feature
              thereof) at any time, with or without notice, and without liability to you.
            </p>
            <p className="mt-4">
              Scheduled or unscheduled maintenance, updates, and outages may affect the availability of the Service. The
              Company shall not be liable for any loss or damage resulting from such downtime, including any lost
              revenue, subscribers, or business opportunities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">16. Termination</h2>
            <p>
              The Company may suspend or terminate your account and access to the Service at any time, for any reason or
              no reason, with or without notice, and without liability to you. Reasons for termination may include, but
              are not limited to: violation of these Terms, non-payment, fraudulent activity, or requests from law
              enforcement.
            </p>
            <p className="mt-4">
              Upon termination, your right to use the Service immediately ceases. The Company has no obligation to
              retain your data following termination and may permanently delete your account and associated data.
              Termination does not relieve you of any obligation to pay outstanding fees.
            </p>
            <p className="mt-4">
              You may cancel your account at any time through the account settings page. Cancellation takes effect at the
              end of your current billing period; no refunds will be issued for unused time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">17. Governing Law &amp; Dispute Resolution</h2>
            <h3 className="mt-4 text-lg font-medium text-foreground">17.1 Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Province of Ontario and the
              federal laws of Canada applicable therein, without regard to conflict of law principles.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">17.2 Dispute Resolution</h3>
            <p>
              Any dispute, controversy, or claim arising out of or relating to these Terms or the Service shall first be
              submitted to good-faith negotiation between the parties. If the parties cannot resolve the dispute within
              thirty (30) days, the dispute shall be submitted to binding arbitration in Toronto, Ontario, in accordance
              with the Arbitration Act, 1991 (Ontario). The arbitration shall be conducted by a single arbitrator agreed
              upon by the parties, or failing agreement, appointed pursuant to the applicable rules.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">17.3 Class Action Waiver</h3>
            <Caps>
              You agree that any dispute resolution proceedings will be conducted only on an individual basis and not as
              a class action, consolidated, or representative action. You waive any right to participate in class-wide
              arbitration or litigation.
            </Caps>
            <h3 className="mt-6 text-lg font-medium text-foreground">17.4 Time Limitation on Claims</h3>
            <Caps>
              Any cause of action or claim you may have arising out of or relating to these Terms or the Service must be
              commenced within one (1) year after the cause of action accrues; otherwise, such cause of action is permanently
              waived and barred.
            </Caps>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">18. Force Majeure</h2>
            <p>
              The Company shall not be liable for any delay or failure to perform its obligations under these Terms
              arising from causes beyond its reasonable control, including but not limited to: acts of God, natural
              disasters, war, terrorism, pandemics, government actions, internet or infrastructure failures,
              cyberattacks, third-party service outages, or labor disputes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">19. Modifications to Terms</h2>
            <p>
              The Company reserves the right to modify these Terms at any time in its sole discretion. Material changes
              will be communicated via email or in-platform notification. The revised Terms will be posted on the website
              with an updated effective date. Your continued use of the Service after the effective date of any revision
              constitutes your binding acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">20. Miscellaneous</h2>
            <h3 className="mt-4 text-lg font-medium text-foreground">20.1 Entire Agreement</h3>
            <p>
              These Terms, together with the Privacy Policy and any applicable subscription order, constitute the entire
              agreement between you and the Company with respect to the Service and supersede all prior or contemporaneous
              communications, proposals, and agreements.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">20.2 Severability</h3>
            <p>
              If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions
              shall continue in full force and effect.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">20.3 No Waiver</h3>
            <p>
              The Company&apos;s failure to enforce any right or provision of these Terms shall not constitute a waiver
              of such right or provision.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">20.4 Assignment</h3>
            <p>
              You may not assign or transfer your rights or obligations under these Terms without the Company&apos;s
              prior written consent. The Company may freely assign these Terms, including in connection with a merger,
              acquisition, or sale of assets.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">20.5 Relationship of the Parties</h3>
            <p>
              Nothing in these Terms creates a partnership, joint venture, agency, or employment relationship between you
              and the Company.
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">20.6 Notices</h3>
            <p>
              Notices from the Company may be provided by email, in-platform notifications, or posting to the website.
              Notices to the Company may be sent to:{' '}
              <a href="mailto:legal@circeetvenus.com" className="text-primary underline underline-offset-2">
                legal@circeetvenus.com
              </a>
              .
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">20.7 Language</h3>
            <p>
              The parties agree that these Terms and all related documents shall be drafted in the English language. Les
              parties ont convenu que les présentes conditions et tous les documents s&apos;y rapportant soient rédigés
              en langue anglaise.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-muted/30 p-6">
            <p className="text-foreground">
              By creating an account or using the Service, you confirm that you have read, understood, and agree to be
              bound by these Terms of Service.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">© 2026 Circe et Venus Inc. All rights reserved.</p>
            <p className="mt-1 font-serif text-sm italic text-primary">Guided by the Stars. Protected by Law.</p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary">
              Privacy Policy
            </Link>
            <Link href="/cookies" className="hover:text-primary">
              Cookie Policy
            </Link>
            <Link href="/contact" className="hover:text-primary">
              Contact Us
            </Link>
            <Link href="/about" className="hover:text-primary">
              About Us
            </Link>
          </div>
          <FooterSupportSocial className="mt-4" />
        </div>
      </footer>
    </div>
  )
}
