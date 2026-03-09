import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Circe and Venus',
    short_name: 'Circe and Venus',
    description: 'Creator management platform for OnlyFans, MYM, and Fansly.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f0e8',
    theme_color: '#1a0a1f',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      { src: '/icon.png', sizes: 'any', type: 'image/png', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    categories: ['business', 'productivity'],
  }
}
