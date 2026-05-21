import type { Metadata, Viewport } from 'next'
import { Cinzel, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { TrialSignupTransitionRoot } from '@/components/marketing/trial-signup-transition-root'
import { ThemeProvider } from '@/components/theme-provider'
import { CookieConsent } from '@/components/cookie-consent'
import { getAppUrl, getCanonicalUrl } from '@/lib/site-url'
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  PUBLIC_OG_IMAGE_PATH,
  SITE_NAME,
} from '@/lib/seo/marketing-metadata'
import './globals.css'

const cinzel = Cinzel({ 
  subsets: ["latin"],
  variable: '--font-cinzel',
  weight: ['400', '500', '600', '700']
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700']
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  applicationName: 'Creatix',
  title: 'Circe et Venus - Divine Creator Management',
  description:
    'Mythological AI-powered platform for content creators. Circe for retention & protection, Venus for growth & seduction. Manage fans, content, analytics with divine precision.',
  keywords: [
    'creator management',
    'OnlyFans',
    'Fansly',
    'ManyVids',
    'content creator',
    'fan management',
    'AI assistant',
    'Circe',
    'Venus',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Circe et Venus - Divine Creator Management',
    description:
      'Mythological AI-powered platform for content creators. Circe for retention & protection, Venus for growth & seduction.',
    siteName: SITE_NAME,
    images: [
      {
        url: PUBLIC_OG_IMAGE_PATH,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: `${SITE_NAME} — creator platform`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Circe et Venus - Divine Creator Management',
    description:
      'Mythological AI-powered platform for content creators. Circe for retention & protection, Venus for growth & seduction.',
    images: [getCanonicalUrl(PUBLIC_OG_IMAGE_PATH)],
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Creatix',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {gscVerification && (
          <meta name="google-site-verification" content={gscVerification} />
        )}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${getAppUrl()}/#organization`,
                  name: 'Circe et Venus',
                  alternateName: 'Creatix',
                  url: getAppUrl(),
                  logo: getCanonicalUrl('/icon.png'),
                },
                {
                  '@type': 'WebSite',
                  '@id': `${getAppUrl()}/#website`,
                  name: 'Circe et Venus',
                  url: getAppUrl(),
                  publisher: { '@id': `${getAppUrl()}/#organization` },
                  inLanguage: 'en-US',
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${cinzel.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
          storageKey="creatix-ui-theme"
        >
          <TrialSignupTransitionRoot>
            {children}
          </TrialSignupTransitionRoot>
          <CookieConsent />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
