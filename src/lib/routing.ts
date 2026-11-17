/**
 * Lightweight path ↔ page mapping (no react-router).
 * Keeps the address bar in sync with in-app navigation.
 */

export type RoutedPage =
  | 'home'
  | 'about-club'
  | 'mission-vision'
  | 'terms'
  | 'refund-policy'
  | 'benefits'
  | 'affiliated-clubs'
  | 'membership-process'
  | 'member-list'
  | 'become-member'
  | 'facilities'
  | `facility:${string}`
  | 'committee:founding'
  | 'committee:executive'
  | 'media'
  | 'resources'
  | 'contact'
  | 'search'
  | '404'
  | 'member-login'
  | 'member-portal'

export type MediaTab = 'notices' | 'news' | 'gallery' | 'video'

/** Resources sub-pages: /resources (reports), /resources/dues, /resources/reports/<report> */
export type ResourceTab = 'reports' | 'dues'

/** Signed-in member portal sections under /portal/... */
export type PortalTab =
  | 'dashboard'
  | 'membership-card'
  | 'personal-info'
  | 'account-statement'
  | 'payment-history'
  | 'invoices'
  | 'bank-accounts'
  | 'change-request'
  | 'helpdesk'
  | 'change-password'
  | 'services'

export type RouteState = {
  page: RoutedPage
  mediaTab: MediaTab
  portalPage: PortalTab
  /** Media Centre item for /media/<tab>/<item>: notice id, article slug, album slug or video id */
  mediaItem?: string | null
  /** Resources tab + open report for /resources/reports/<id>-<slug> */
  resourceTab?: ResourceTab
  resourceItem?: string | null
}

const MEDIA_TABS: MediaTab[] = ['notices', 'news', 'gallery', 'video']

const PORTAL_TABS: PortalTab[] = [
  'dashboard',
  'membership-card',
  'personal-info',
  'account-statement',
  'payment-history',
  'invoices',
  'bank-accounts',
  'change-request',
  'helpdesk',
  'change-password',
  'services',
]

export function isPortalTab(v: string): v is PortalTab {
  return (PORTAL_TABS as string[]).includes(v)
}

const STATIC: Record<string, RoutedPage> = {
  '/': 'home',
  '/home': 'home',
  '/about': 'about-club',
  '/about/about-club': 'about-club',
  '/about/club': 'about-club',
  '/about/mission-vision': 'mission-vision',
  '/about/mission': 'mission-vision',
  '/about/terms': 'terms',
  '/about/terms-conditions': 'terms',
  '/about/refund': 'refund-policy',
  '/about/refund-policy': 'refund-policy',
  '/membership': 'benefits',
  '/membership/benefits': 'benefits',
  '/membership/affiliated-clubs': 'affiliated-clubs',
  '/membership/affiliated': 'affiliated-clubs',
  '/membership/process': 'membership-process',
  '/membership/members': 'member-list',
  '/membership/member-list': 'member-list',
  '/membership/become-a-member': 'become-member',
  '/membership/apply': 'become-member',
  '/facilities': 'facilities',
  '/committee/founding': 'committee:founding',
  '/committee/executive': 'committee:executive',
  '/media': 'media',
  '/resources': 'resources',
  '/contact': 'contact',
  '/search': 'search',
  '/login': 'member-login',
  '/member-login': 'member-login',
  '/portal': 'member-portal',
  '/member-portal': 'member-portal',
  '/404': '404',
}

/** Build a clean path for a page (+ optional media / portal section). */
export function pathForPage(
  page: RoutedPage,
  mediaTab: MediaTab = 'notices',
  portalPage: PortalTab = 'dashboard',
): string {
  if (page === 'home') return '/'
  if (page === 'about-club') return '/about/about-club'
  if (page === 'mission-vision') return '/about/mission-vision'
  if (page === 'terms') return '/about/terms'
  if (page === 'refund-policy') return '/about/refund-policy'
  if (page === 'benefits') return '/membership/benefits'
  if (page === 'affiliated-clubs') return '/membership/affiliated-clubs'
  if (page === 'membership-process') return '/membership/process'
  if (page === 'member-list') return '/membership/members'
  if (page === 'become-member') return '/membership/become-a-member'
  if (page === 'facilities') return '/facilities'
  if (page.startsWith('facility:')) return `/facilities/${encodeURIComponent(page.slice('facility:'.length))}`
  if (page === 'committee:founding') return '/committee/founding'
  if (page === 'committee:executive') return '/committee/executive'
  if (page === 'media') return mediaTab === 'notices' ? '/media' : `/media/${mediaTab}`
  if (page === 'resources') return '/resources'
  if (page === 'contact') return '/contact'
  if (page === 'search') return '/search' // query string attached by syncUrl when provided
  if (page === 'member-login') return '/login'
  if (page === 'member-portal') {
    return portalPage === 'dashboard' ? '/portal' : `/portal/${portalPage}`
  }
  if (page === '404') return '/404'
  return '/'
}

/** Parse current location into page + media / portal tab. Unknown paths → 404. */
export function parseLocation(pathname = window.location.pathname): RouteState {
  const raw = pathname.replace(/\/+$/, '') || '/'
  const path = raw.toLowerCase()

  const portalMatch = path.match(/^\/(?:portal|member-portal)(?:\/([^/]+))?$/)
  if (portalMatch) {
    const section = portalMatch[1]
    if (!section || section === 'dashboard') {
      return { page: 'member-portal', mediaTab: 'notices', portalPage: 'dashboard' }
    }
    if (isPortalTab(section)) {
      return { page: 'member-portal', mediaTab: 'notices', portalPage: section }
    }
    return { page: '404', mediaTab: 'notices', portalPage: 'dashboard' }
  }

  if (STATIC[path]) {
    return { page: STATIC[path], mediaTab: 'notices', portalPage: 'dashboard' }
  }

  // One Media Centre item: /media/<tab>/<item> (item read from the raw path to keep its case)
  const itemMatch = raw.match(/^\/media\/(notices|news|gallery|video)\/([^/]+)$/i)
  if (itemMatch) {
    let item = itemMatch[2]
    try { item = decodeURIComponent(item) } catch { /* keep raw */ }
    return { page: 'media', mediaTab: itemMatch[1].toLowerCase() as MediaTab, portalPage: 'dashboard', mediaItem: item }
  }

  const mediaMatch = path.match(/^\/media\/(notices|news|gallery|video)$/)
  if (mediaMatch) {
    return { page: 'media', mediaTab: mediaMatch[1] as MediaTab, portalPage: 'dashboard' }
  }

  // Resources: /resources/dues, /resources/reports, /resources/reports/<id>-<slug>
  const resourceMatch = raw.match(/^\/resources\/(reports|dues)(?:\/([^/]+))?$/i)
  if (resourceMatch) {
    const tab = resourceMatch[1].toLowerCase() as ResourceTab
    if (tab === 'dues' && resourceMatch[2]) return { page: '404', mediaTab: 'notices', portalPage: 'dashboard' }
    let item = resourceMatch[2] ?? null
    if (item) { try { item = decodeURIComponent(item) } catch { /* keep raw */ } }
    return { page: 'resources', mediaTab: 'notices', portalPage: 'dashboard', resourceTab: tab, resourceItem: item }
  }

  const facilityMatch = path.match(/^\/facilities\/([^/]+)$/)
  if (facilityMatch) {
    return {
      page: `facility:${decodeURIComponent(facilityMatch[1])}`,
      mediaTab: 'notices',
      portalPage: 'dashboard',
    }
  }

  return { page: '404', mediaTab: 'notices', portalPage: 'dashboard' }
}

export function readRoute(): RouteState {
  return parseLocation(window.location.pathname)
}

/** Push or replace the URL without a full reload. */
export function syncUrl(
  page: RoutedPage,
  mediaTab: MediaTab = 'notices',
  mode: 'push' | 'replace' = 'push',
  portalPage: PortalTab = 'dashboard',
  searchQuery?: string,
) {
  let next = pathForPage(page, mediaTab, portalPage)
  if (page === 'search' && searchQuery && searchQuery.trim()) {
    next = `${next}?q=${encodeURIComponent(searchQuery.trim())}`
  }
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const state = { page, mediaTab, portalPage, searchQuery: searchQuery || '' }
  if (current === next) {
    if (mode === 'replace') window.history.replaceState(state, '', next)
    return
  }
  if (mode === 'replace') window.history.replaceState(state, '', next)
  else window.history.pushState(state, '', next)
}

export function readSearchQuery(): string {
  try {
    return new URLSearchParams(window.location.search).get('q') || ''
  } catch {
    return ''
  }
}

export function isMediaTab(v: string): v is MediaTab {
  return (MEDIA_TABS as string[]).includes(v)
}

/** URL of a Media Centre tab, or of one item inside it (/media/<tab>/<item>). */
export function mediaPath(tab: MediaTab, item?: string | null) {
  if (!item) return pathForPage('media', tab)
  return `/media/${tab}/${encodeURIComponent(item)}`
}

/** URL of one News & Events article. */
export function articlePath(slug: string) {
  return mediaPath('news', slug)
}

/** Point the URL at a Media Centre tab or one of its items (notice, article, album, video). */
export function syncMediaUrl(tab: MediaTab, item: string | null, mode: 'push' | 'replace' = 'push') {
  const next = mediaPath(tab, item)
  const state = { page: 'media', mediaTab: tab, portalPage: 'dashboard', mediaItem: item, searchQuery: '' }
  if (`${window.location.pathname}${window.location.search}` === next) {
    window.history.replaceState(state, '', next)
    return
  }
  if (mode === 'replace') window.history.replaceState(state, '', next)
  else window.history.pushState(state, '', next)
}

/** URL-safe piece of a title: "Annual Report 2025" → "annual-report-2025" */
function slugify(text: string) {
  return text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

/** URL key for one report: "<id>-<title-slug>"; only the leading id is used to find it. */
export function reportKey(report: { id: number | string; title?: string | null }) {
  const slug = slugify(report.title || '')
  return slug ? `${report.id}-${slug}` : String(report.id)
}

/** Report id from a URL key ("12-annual-report-2025" → "12"). */
export function reportIdFromKey(key: string) {
  return key.split('-')[0]
}

/** URL of a Resources tab, or of one report in it. */
export function resourcesPath(tab: ResourceTab, item?: string | null) {
  if (tab === 'reports') return item ? `/resources/reports/${encodeURIComponent(item)}` : '/resources'
  return '/resources/dues'
}

/** Point the URL at a Resources tab or one report. */
export function syncResourcesUrl(tab: ResourceTab, item: string | null, mode: 'push' | 'replace' = 'push') {
  const next = resourcesPath(tab, item)
  const state = { page: 'resources', resourceTab: tab, resourceItem: item, searchQuery: '' }
  if (mode === 'replace' || `${window.location.pathname}${window.location.search}` === next) {
    window.history.replaceState(state, '', next)
    return
  }
  window.history.pushState(state, '', next)
}
