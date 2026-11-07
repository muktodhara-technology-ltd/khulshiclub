'use client'

import dynamic from 'next/dynamic'

// App reads window / storage during render (routing, sessions), so it can only render in the browser.
const App = dynamic(() => import('@/App'), { ssr: false })

/**
 * Catch-all App Router page — keeps existing client-side route map
 * (see src/lib/routing.ts) so every public URL still works under Next.js.
 */
export default function CatchAllPage() {
  return <App />
}
