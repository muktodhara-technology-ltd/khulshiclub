import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Self-host in Docker without bundling all of node_modules
  output: 'standalone',
  // Keep NEXT_PUBLIC_* available the same way as before
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_PORTAL_DOMAIN: process.env.NEXT_PUBLIC_PORTAL_DOMAIN,
  },
  // Public club site — no image domain allowlist needed for CMS media (we use <img>)
  images: {
    unoptimized: true,
  },
}

export default nextConfig
