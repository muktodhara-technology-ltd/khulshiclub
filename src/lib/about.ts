import { mediaUrl } from './api/client'
import { useApi } from './useApi'

const ABOUT_API_PATH = 'club/club-portal/website/about'

/** Admin page keys → public PageId mapping (refund tab is `refund` in CMS). */
export const ABOUT_PAGE_KEYS = {
  'about-club': 'about-club',
  'mission-vision': 'mission-vision',
  terms: 'terms',
  'refund-policy': 'refund',
} as const

export type AboutPageId = keyof typeof ABOUT_PAGE_KEYS

export type AboutBlock = {
  type: string
  text?: string
  items?: unknown[]
  extra?: string
  preview?: string | null
  image?: string | null
  gallery?: { preview?: string; image?: string; caption?: string }[]
  listStyle?: string
  fileName?: string
  rows?: string[][]
  align?: string | null
}

export type AboutPageDoc = {
  title?: string
  seo_title?: string
  seo_description?: string
  blocks?: AboutBlock[]
}

export type AboutCommitteeMember = {
  name: string
  designation: string
  company: string
  tier: string
  order?: string | number
  is_active?: boolean
  bio?: string
  email?: string
  phone?: string
  photo?: string | null
  photo_preview?: string | null
}

export type AboutPayload = {
  pages: Record<string, AboutPageDoc>
  founding_committee: AboutCommitteeMember[]
  executive_committee: AboutCommitteeMember[]
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function mapMember(raw: unknown): AboutCommitteeMember | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const m = raw as Record<string, unknown>
  if (m.is_active === false) return null
  const name = m.name == null ? '' : String(m.name)
  if (!name.trim()) return null
  const photo = mediaUrl((m.photo as string) || (m.photo_preview as string) || '') || null
  return {
    name,
    designation: m.designation == null ? '' : String(m.designation),
    company: m.company == null ? '' : String(m.company),
    tier: m.tier == null ? 'Member' : String(m.tier),
    order: m.order as string | number | undefined,
    is_active: m.is_active !== false,
    bio: m.bio == null ? '' : String(m.bio),
    email: m.email == null ? '' : String(m.email),
    phone: m.phone == null ? '' : String(m.phone),
    photo,
    photo_preview: photo,
  }
}

function mapCommittee(list: unknown): AboutCommitteeMember[] {
  if (!Array.isArray(list)) return []
  return list
    .map(mapMember)
    .filter((m): m is AboutCommitteeMember => !!m)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
}

export function mergeAbout(raw: unknown): AboutPayload {
  const d = asObj(raw)
  const pagesRaw = asObj(d.pages)
  const pages: Record<string, AboutPageDoc> = {}
  for (const [key, val] of Object.entries(pagesRaw)) {
    const p = asObj(val)
    pages[key] = {
      title: p.title == null ? '' : String(p.title),
      seo_title: p.seo_title == null ? '' : String(p.seo_title),
      seo_description: p.seo_description == null ? '' : String(p.seo_description),
      blocks: Array.isArray(p.blocks) ? (p.blocks as AboutBlock[]) : [],
    }
  }
  return {
    pages,
    founding_committee: mapCommittee(d.founding_committee),
    executive_committee: mapCommittee(d.executive_committee),
  }
}

export function getAboutPage(about: AboutPayload, pageId: AboutPageId): AboutPageDoc | null {
  const key = ABOUT_PAGE_KEYS[pageId]
  const page = about.pages[key]
  if (!page) return null
  return page
}

/** Clause blocks → sidebar anchors. */
export function aboutPageAnchors(page: AboutPageDoc | null): { id: string; label: string }[] {
  if (!page?.blocks?.length) return []
  let n = 0
  const out: { id: string; label: string }[] = []
  for (const b of page.blocks) {
    if (b.type !== 'clause') continue
    const title = (b.text || '').trim()
    if (!title) continue
    n += 1
    out.push({
      id: `clause-${n}`,
      label: title,
    })
  }
  return out
}

export function useAbout(): {
  about: AboutPayload
  ready: boolean
  fromApi: boolean
  loading: boolean
  error: string | null
} {
  const { data, error, loading } = useApi<unknown>(ABOUT_API_PATH)
  const fromApi = Boolean(data)
  const about = data ? mergeAbout(data) : { pages: {}, founding_committee: [], executive_committee: [] }
  return { about, ready: !!data || !!error, fromApi, loading, error }
}

export function isAboutMenuPage(id: string): id is AboutPageId {
  return id in ABOUT_PAGE_KEYS
}
