import type { Metadata } from 'next'
import { PublicPageShell } from '@/components/marketing/public-page-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy | Circe and Venus',
  description: 'Privacy Policy for Circe and Venus creator management platform.',
}

export default function PrivacyPage() {
  return (
    <PublicPageShell title="Privacy Policy">
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US')}</p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">1. Who we are</h2>
      <p>
        Circe and Venus (&quot;we&quot;, &quot;us&quot;) operates the creator management platform at circeandvenus.com and related services. We are the data controller for the personal data we collect as described in this policy.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">2. Data we collect</h2>
      <p>
        We collect information you provide (e.g. account details, name, email), data from connected platforms (e.g. fan counts, content metadata) where you have authorized access, and technical data (e.g. IP address, device type) necessary to operate and secure the Service.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">3. How we use your data</h2>
      <p>
        We use your data to provide, maintain, and improve the Service; to process payments; to send service-related and (where consented) marketing communications; and to comply with legal obligations.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">4. Sharing and disclosure</h2>
      <p>
        We do not sell your personal data. We may share data with service providers (e.g. hosting, analytics, payment processors) under strict agreements. We may disclose data when required by law or to protect our rights and users.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">5. Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, or port your data, or to object to or restrict certain processing. You can exercise these via your account settings or by contacting us. You may also have the right to lodge a complaint with a supervisory authority.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">6. Security and retention</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your data. We retain data only as long as needed to provide the Service and fulfill the purposes described in this policy or as required by law.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">7. Contact</h2>
      <p>
        For privacy-related requests or questions:{' '}
        <a href="mailto:privacy@circeandvenus.com" className="text-primary hover:underline">
          privacy@circeandvenus.com
        </a>.
      </p>
    </PublicPageShell>
  )
}
