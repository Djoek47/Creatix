import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Circe et Venus',
    short_name: 'Circe et Venus',
    description: 'Creator management platform for OnlyFans, MYM, and Fansly.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f0e8',
    theme_color: '#1a0a1f',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      // Add icon-192.png and icon-512.png to public/ for installable PWA
    ],
    categories: ['business', 'productivity'],
  }
}
