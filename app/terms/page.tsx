import type { Metadata } from 'next'
import { PublicPageShell } from '@/components/marketing/public-page-shell'

export const metadata: Metadata = {
  title: 'Terms of Service | Circe and Venus',
  description: 'Terms of Service for Circe and Venus creator management platform.',
}

export default function TermsPage() {
  return (
    <PublicPageShell title="Terms of Service">
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US')}</p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">1. Acceptance of terms</h2>
      <p>
        By accessing or using Circe and Venus (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">2. Description of service</h2>
      <p>
        Circe and Venus provides a creator management platform including fan CRM, content scheduling, analytics, leak protection, and related tools. We integrate with third-party platforms (e.g. OnlyFans, MYM, Fansly) subject to their respective terms and policies.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">3. Account and eligibility</h2>
      <p>
        You must be at least 18 years old and able to form a binding contract to use the Service. You are responsible for keeping your account credentials secure and for all activity under your account.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">4. Acceptable use</h2>
      <p>
        You agree to use the Service only for lawful purposes and in accordance with these Terms and applicable laws. You may not use the Service to violate any third-party rights or to distribute illegal or harmful content.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">5. Subscription and payment</h2>
      <p>
        Paid plans are billed in accordance with the pricing displayed at signup or in your account. You may cancel in accordance with our billing policy. Refunds are handled as stated at the time of purchase.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">6. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Circe and Venus and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">7. Changes</h2>
      <p>
        We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms and updating the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">8. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{' '}
        <a href="mailto:support@circeandvenus.com" className="text-primary hover:underline">
          support@circeandvenus.com
        </a>.
      </p>
    </PublicPageShell>
  )
}
