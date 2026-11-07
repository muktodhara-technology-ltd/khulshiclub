'use client'

import App from '@/App'

/**
 * Catch-all App Router page — keeps existing client-side route map
 * (see src/lib/routing.ts) so every public URL still works under Next.js.
 */
export default function CatchAllPage() {
  return <App />
}
