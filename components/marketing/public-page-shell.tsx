import Link from 'next/link'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { BrandTitle } from '@/components/dashboard/brand-title'
import { Button } from '@/components/ui/button'
import { SiteFooter } from '@/components/marketing/site-footer'
import { ArrowLeft } from 'lucide-react'

export function PublicPageShell({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <div className="min-h-screen flex flex-col brand-bg">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,var(--primary)_0.08,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_80%,var(--accent)_0.06,transparent_45%)]" />
      </div>

      <header className="brand-header sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
            <BrandLogo width={32} height={32} className="h-8 w-8" />
            <BrandTitle className="text-lg" variant="header" />
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button size="sm" className="brand-button" asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-title text-3xl font-normal tracking-tight text-foreground mb-8">
          {title}
        </h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground space-y-4 [&_a]:text-primary [&_a]:hover:underline [&_h2]:mt-8 [&_h2]:mb-2">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
