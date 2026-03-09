import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Playfair_Display, Cinzel } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { CookieConsentBanner } from '@/components/marketing/cookie-consent-banner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const cinzel = Cinzel({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Circe and Venus - Creator Management Platform',
  description: 'Professional management platform for content creators on OnlyFans, MYM, and Fansly. Manage fans, content, analytics, and more.',
  generator: 'v0.app',
  keywords: ['creator management', 'OnlyFans', 'MYM', 'Fansly', 'content creator', 'fan management'],
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a0a1f' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} ${cinzel.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="circe-venus-theme">
          {children}
          <CookieConsentBanner />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
