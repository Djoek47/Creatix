import type { Metadata } from 'next'
import { PublicPageShell } from '@/components/marketing/public-page-shell'

export const metadata: Metadata = {
  title: 'About | Circe and Venus',
  description: 'Learn about Circe and Venus — the creator management platform for OnlyFans, MYM, and Fansly.',
}

export default function AboutPage() {
  return (
    <PublicPageShell title="About us">
      <p>
        Circe and Venus is a professional management platform built for content creators. We help you manage your subscribers, content, messages, and revenue across OnlyFans, MYM, and Fansly from one place.
      </p>
      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">Our mission</h2>
      <p>
        We believe creators deserve tools that are as professional and reliable as their craft. Our platform combines fan CRM, content scheduling, leak protection, and analytics so you can focus on creating while we handle the rest.
      </p>
      <h2 className="font-title text-xl font-normal text-foreground mt-8 mb-2">Contact</h2>
      <p>
        For questions or partnerships, reach out at{' '}
        <a href="mailto:support@circeandvenus.com" className="text-primary hover:underline">
          support@circeandvenus.com
        </a>.
      </p>
    </PublicPageShell>
  )
}
