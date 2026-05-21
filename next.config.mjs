import createNextIntlPlugin from 'next-intl/plugin'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  /** Tree-shake icon/chart barrels faster (smaller bundles + quicker Turbopack work). */
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@openreel/core': path.resolve(__dirname, 'vendor/openreel/core/index.ts'),
      '@openreel/core/media': path.resolve(__dirname, 'vendor/openreel/core/media/index.ts'),
      '@openreel/core/storage/schema-types': path.resolve(__dirname, 'vendor/openreel/core/storage/schema-types.ts'),
      '@openreel/ui': path.resolve(__dirname, 'vendor/openreel/ui/index.ts'),
      '@openreel/ui/lib/utils': path.resolve(__dirname, 'vendor/openreel/ui/lib/utils.ts'),
      '@openreel/ui/components/toggle': path.resolve(__dirname, 'vendor/openreel/ui/components/toggle.tsx'),
      '@openreel/image-core': path.resolve(__dirname, 'vendor/openreel/image-core/index.ts'),
    }
    config.module.rules.push({
      test: /\.wgsl$/i,
      type: 'asset/source',
    })
    return config
  },
}

export default withNextIntl(nextConfig)
