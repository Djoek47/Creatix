import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** When this app lives inside the Creatix monorepo folder, keep tracing rooted here. */
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
