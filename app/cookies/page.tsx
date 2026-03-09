import type { Metadata } from 'next'
import { PublicPageShell } from '@/components/marketing/public-page-shell'

export const metadata: Metadata = {
  title: 'Cookie Policy | Circe and Venus',
  description: 'Cookie Policy for Circe and Venus creator management platform.',
}

export default function CookiesPage() {
  return (
    <PublicPageShell title="Cookie Policy">
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US')}</p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">1. What are cookies</h2>
      <p>
        Cookies are small text files stored on your device when you visit our site. They help us provide, secure, and improve the Service and remember your preferences.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">2. Cookies we use</h2>
      <p>
        <strong>Strictly necessary:</strong> Required for the site to function (e.g. authentication, security). These cannot be disabled without affecting core functionality.
      </p>
      <p>
        <strong>Functional:</strong> Remember your settings (e.g. theme, language) and improve your experience.
      </p>
      <p>
        <strong>Analytics:</strong> We may use analytics cookies to understand how the site is used and to improve our product. You can manage or opt out via your browser or our cookie preferences where offered.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">3. Managing cookies</h2>
      <p>
        You can control or delete cookies through your browser settings. Blocking or deleting certain cookies may limit your ability to use some features of the Service.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">4. Updates</h2>
      <p>
        We may update this Cookie Policy from time to time. The &quot;Last updated&quot; date at the top reflects the latest version.
      </p>

      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">5. Contact</h2>
      <p>
        Questions? Contact us at{' '}
        <a href="mailto:support@circeandvenus.com" className="text-primary hover:underline">
          support@circeandvenus.com
        </a>.
      </p>
    </PublicPageShell>
  )
}
