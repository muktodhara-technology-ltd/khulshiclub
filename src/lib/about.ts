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
  member_id?: string | null
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

export type AboutCommitteeTerm = {
  start_date: string | null
  end_date: string | null
}

export type AboutPayload = {
  pages: Record<string, AboutPageDoc>
  founding_committee: AboutCommitteeMember[]
  executive_committee: AboutCommitteeMember[]
  executive_committee_term: AboutCommitteeTerm
  /** False when term has not started yet or already ended (API-gated). */
  executive_committee_active: boolean
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
    member_id: m.member_id == null || m.member_id === '' ? null : String(m.member_id),
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

function mapCommitteeTerm(raw: unknown): AboutCommitteeTerm {
  const t = asObj(raw)
  const start = t.start_date == null || t.start_date === '' ? null : String(t.start_date).slice(0, 10)
  const end = t.end_date == null || t.end_date === '' ? null : String(t.end_date).slice(0, 10)
  return { start_date: start, end_date: end }
}

/** Format committee term for public display, e.g. "1 Jan 2024 – 31 Dec 2025". */
export function formatCommitteeTerm(term: AboutCommitteeTerm | null | undefined): string {
  if (!term) return ''
  const fmt = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const start = fmt(term.start_date)
  const end = fmt(term.end_date)
  if (start && end) return `${start} – ${end}`
  if (start) return `From ${start}`
  if (end) return `Until ${end}`
  return ''
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
  const term = mapCommitteeTerm(d.executive_committee_term)
  const active =
    typeof d.executive_committee_active === 'boolean'
      ? d.executive_committee_active
      : true

  return {
    pages,
    founding_committee: mapCommittee(d.founding_committee),
    executive_committee: active ? mapCommittee(d.executive_committee) : [],
    executive_committee_term: term,
    executive_committee_active: active,
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
  const about = data
    ? mergeAbout(data)
    : {
        pages: {},
        founding_committee: [],
        executive_committee: [],
        executive_committee_term: { start_date: null, end_date: null },
        executive_committee_active: true,
      }
  return { about, ready: !!data || !!error, fromApi, loading, error }
}

export function isAboutMenuPage(id: string): id is AboutPageId {
  return id in ABOUT_PAGE_KEYS
}
