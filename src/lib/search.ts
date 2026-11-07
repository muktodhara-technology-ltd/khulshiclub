/**
 * Site search → GET /club/club-portal/website/search?q=
 */
import { useEffect, useState } from 'react'
import { apiGet, mediaUrl } from './api/client'

const PATH = 'club/club-portal/website/search'

export type SearchResultType = 'Page' | 'Notice' | 'Member' | 'Album' | 'News' | 'Facility'

export type SearchResult = {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  href: string
  avatar?: string | null
  date?: string | null
}

type ApiRow = {
  type?: string
  id?: string | number
  title?: string
  subtitle?: string
  href?: string
  url?: string
  avatar?: string | null
  image?: string | null
  date?: string | null
}

const TYPE_MAP: Record<string, SearchResultType> = {
  page: 'Page',
  notice: 'Notice',
  member: 'Member',
  album: 'Album',
  news: 'News',
  facility: 'Facility',
}

function mapRow(raw: ApiRow, i: number): SearchResult {
  const kind = String(raw.type || 'page').toLowerCase()
  return {
    id: String(raw.id ?? `${kind}-${i}`),
    type: TYPE_MAP[kind] || 'Page',
    title: String(raw.title || 'Untitled'),
    subtitle: String(raw.subtitle || ''),
    href: String(raw.href || raw.url || '/'),
    avatar: mediaUrl(raw.avatar || raw.image || '') || null,
    date: raw.date ? String(raw.date) : null,
  }
}

export async function fetchSiteSearch(q: string): Promise<SearchResult[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const data = await apiGet<{ results?: ApiRow[] } | ApiRow[]>(PATH, { q: query })
  const rows = Array.isArray(data) ? data : (data?.results || [])
  return rows.map(mapRow)
}

export function useSiteSearch(q: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    const t = window.setTimeout(() => {
      fetchSiteSearch(query)
        .then((rows) => { if (alive) setResults(rows) })
        .catch((e: Error) => { if (alive) { setResults([]); setError(e.message || 'Search failed.') } })
        .finally(() => { if (alive) setLoading(false) })
    }, 220)
    return () => { alive = false; window.clearTimeout(t) }
  }, [q])

  return { results, loading, error }
}

/** Map a search href/path to an in-app navigation target when possible. */
export function hrefToAppPage(href: string): string | null {
  const path = href.split('?')[0].replace(/\/+$/, '') || '/'
  const map: Record<string, string> = {
    '/': 'home',
    '/about/about-club': 'about-club',
    '/about/mission-vision': 'mission-vision',
    '/about/terms': 'terms',
    '/about/refund-policy': 'refund-policy',
    '/membership/benefits': 'benefits',
    '/membership/affiliated-clubs': 'affiliated-clubs',
    '/membership/process': 'membership-process',
    '/membership/members': 'member-list',
    '/membership/become-a-member': 'become-member',
    '/facilities': 'facilities',
    '/media': 'media',
    '/media/notices': 'media',
    '/media/news': 'media',
    '/media/gallery': 'media',
    '/media/video': 'media',
    '/resources': 'resources',
    '/contact': 'contact',
    '/committee/founding': 'committee:founding',
    '/committee/executive': 'committee:executive',
    '/login': 'member-login',
  }
  if (map[path]) return map[path]
  const facility = path.match(/^\/facilities\/([^/]+)$/)
  if (facility) return `facility:${decodeURIComponent(facility[1])}`
  return null
}
