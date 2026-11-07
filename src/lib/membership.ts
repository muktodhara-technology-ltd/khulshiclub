import { mediaUrl } from './api/client'
import { useApi } from './useApi'
import type { AboutBlock, AboutPageDoc } from './about'

const MEMBERSHIP_API = 'club/club-portal/website/membership'

/** Admin payload keys → public PageId for Membership menu pages. */
export const MEMBERSHIP_PAGE_KEYS = {
  benefits: 'benefits',
  'affiliated-clubs': 'affiliated',
} as const

export type MembershipPageId = keyof typeof MEMBERSHIP_PAGE_KEYS

export type MembershipProcessStep = {
  num: string
  title: string
  desc: string
  duration: string | null
  icon: string
}

export type MembershipTier = {
  name: string
  tagline: string
  term: string
  eligibility: string
  entitlements: string[]
  colors: [string, string]
  closed?: boolean
}

export type MembershipProcess = {
  /** Page H1; empty → "How to join" + club short name. */
  page_title: string
  /** Tier section heading / intro; empty text is hidden. */
  tiers_title: string
  tiers_text: string
  intro_lead: string
  intro_note: string
  steps: MembershipProcessStep[]
  tiers: MembershipTier[]
  documents: { item: string; required: boolean }[]
  documents_note: string
  faqs: { q: string; a: string }[]
  application_form_url: string | null
  cta_title: string
  cta_text: string
  contact_line: string
  /** Label of the secondary CTA button (scrolls to contact). */
  contact_label: string
}

export type MembershipPayload = {
  benefits: AboutPageDoc
  affiliated: AboutPageDoc
  process: MembershipProcess
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function str(v: unknown) {
  return v == null ? '' : String(v)
}

function mapPage(raw: unknown): AboutPageDoc {
  const p = asObj(raw)
  return {
    title: str(p.title),
    seo_title: str(p.seo_title),
    seo_description: str(p.seo_description),
    blocks: Array.isArray(p.blocks) ? (p.blocks as AboutBlock[]) : [],
  }
}

function mapProcess(raw: unknown): MembershipProcess {
  const p = asObj(raw)
  const stepsRaw = Array.isArray(p.steps) ? p.steps : []
  const tiersRaw = Array.isArray(p.tiers) ? p.tiers : []
  const docsRaw = Array.isArray(p.documents) ? p.documents : []
  const faqsRaw = Array.isArray(p.faqs) ? p.faqs : []

  const formUrl =
    mediaUrl(str(p.application_form_url)) ||
    mediaUrl(str(p.application_form)) ||
    null

  return {
    page_title: str(p.page_title),
    tiers_title: str(p.tiers_title),
    tiers_text: str(p.tiers_text),
    intro_lead: str(p.intro_lead),
    intro_note: str(p.intro_note),
    steps: stepsRaw.map((row, i) => {
      const s = asObj(row)
      return {
        num: str(s.num) || String(i + 1).padStart(2, '0'),
        title: str(s.title),
        desc: str(s.desc),
        duration: str(s.duration) || null,
        icon: str(s.icon) || 'document',
      }
    }),
    tiers: tiersRaw.map((row) => {
      const t = asObj(row)
      const from = str(t.color_from) || (Array.isArray(t.colors) ? str(t.colors[0]) : '') || '#0E1116'
      const to = str(t.color_to) || (Array.isArray(t.colors) ? str(t.colors[1]) : '') || '#3A424D'
      const entitlements = Array.isArray(t.entitlements)
        ? t.entitlements.map(str).map((x) => x.trim()).filter(Boolean)
        : []
      return {
        name: str(t.name),
        tagline: str(t.tagline),
        term: str(t.term),
        eligibility: str(t.eligibility),
        entitlements,
        colors: [from, to] as [string, string],
        closed: Boolean(t.closed),
      }
    }).filter((t) => t.name.trim()),
    documents: docsRaw.map((row) => {
      const d = asObj(row)
      return { item: str(d.item), required: d.required !== false }
    }).filter((d) => d.item.trim()),
    documents_note: str(p.documents_note),
    faqs: faqsRaw.map((row) => {
      const f = asObj(row)
      return { q: str(f.q), a: str(f.a) }
    }).filter((f) => f.q.trim() || f.a.trim()),
    application_form_url: formUrl || null,
    cta_title: str(p.cta_title),
    cta_text: str(p.cta_text),
    contact_line: str(p.contact_line),
    contact_label: str(p.contact_label),
  }
}

export function mergeMembership(raw: unknown): MembershipPayload {
  const root = asObj(raw)
  const payload = asObj(root.payload ?? raw)
  return {
    benefits: mapPage(payload.benefits),
    affiliated: mapPage(payload.affiliated),
    process: mapProcess(payload.process),
  }
}

export function getMembershipPage(membership: MembershipPayload, pageId: MembershipPageId): AboutPageDoc | null {
  const key = MEMBERSHIP_PAGE_KEYS[pageId]
  if (key === 'benefits') return membership.benefits
  if (key === 'affiliated') return membership.affiliated
  return null
}

export function membershipPageAnchors(page: AboutPageDoc | null): { id: string; label: string }[] {
  if (!page?.blocks?.length) return []
  let n = 0
  const out: { id: string; label: string }[] = []
  for (const b of page.blocks) {
    if (b.type !== 'clause') continue
    const title = (b.text || '').trim()
    if (!title) continue
    n += 1
    out.push({ id: `clause-${n}`, label: title })
  }
  return out
}

export function isMembershipMenuPage(id: string): id is MembershipPageId {
  return id in MEMBERSHIP_PAGE_KEYS
}

export function useMembership(): {
  membership: MembershipPayload
  fromApi: boolean
  loading: boolean
  error: string | null
} {
  const { data, error, loading } = useApi<unknown>(MEMBERSHIP_API)
  const fromApi = Boolean(data)
  const membership = data
    ? mergeMembership(data)
    : { benefits: { blocks: [] }, affiliated: { blocks: [] }, process: mapProcess({}) }
  return { membership, fromApi, loading, error }
}
