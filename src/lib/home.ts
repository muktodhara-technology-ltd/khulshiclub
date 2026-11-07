import { mediaUrl } from './api/client'
import { useApi } from './useApi'
import type { WebsiteHomeResponse } from './api/website'

/**
 * Home page sections from Club → Website Maintenance → Home
 * GET /api/club/club-portal/website/home → data.payload.sections
 *
 * No offline dummy copy — until the API succeeds, sections stay empty.
 */

export type HomeSlide = { image: string; alt: string }
export type HomeBenefit = { name: string; note: string; icon: string }

export type HomeSectionAlign = 'start' | 'center' | 'end'
/** Per-block override. Empty / inherit → follow section align. */
export type HomeBlockAlign = 'inherit' | HomeSectionAlign

export type HomeBlock = {
  type: string
  text?: string
  items?: unknown[]
  extra?: string
  preview?: string | null
  image?: string | null
  gallery?: { preview?: string; image?: string; caption?: string }[]
  rows?: string[][]
  listStyle?: string
  fileName?: string
  /** Optional override of the parent section’s Content position. */
  align?: HomeBlockAlign | string | null
}

export type HomeCustomSection = {
  id: string
  title: string
  enabled: boolean
  /** Content column alignment on the public home page. */
  align: HomeSectionAlign
  blocks: HomeBlock[]
}

/** Heading copy for a people showcase (committee / member directory) on home. */
export type HomeShowcaseHeading = {
  enabled: boolean
  eyebrow: string
  heading: string
  text: string
  button_label: string
}

export type HomeContent = {
  hero: {
    slides: HomeSlide[]
    eyebrow: string
    heading: string
    text: string
    primary_label: string
    primary_link: string
    secondary_label: string
    secondary_link: string
  }
  about: {
    eyebrow: string
    heading: string
    para1: string
    para2: string
    link_label: string
    link_url: string
    photo_main: string | null
    photo_small: string | null
    badge: string
  }
  facilities: {
    enabled: boolean
    eyebrow: string
    heading: string
    text: string
    button_label: string
    button_link: string
  }
  committee: HomeShowcaseHeading
  directory: HomeShowcaseHeading
  gallery: {
    enabled: boolean
    eyebrow: string
    heading: string
    text: string
    button_label: string
    button_link: string
    featured_tag: string
  }
  highlights: {
    enabled: boolean
    eyebrow: string
    heading: string
    text: string
    items: { value: string; label: string; note: string }[]
  }
  membership: {
    eyebrow: string
    heading: string
    text: string
    background: string | null
    benefits_eyebrow: string
    benefits_title: string
    benefits: HomeBenefit[]
    apply_eyebrow: string
    apply_title: string
    apply_text: string
    steps: string[]
    button_label: string
    button_link: string
    footnote: string
  }
}

export const EMPTY_HOME: HomeContent = {
  hero: {
    slides: [],
    eyebrow: '',
    heading: '',
    text: '',
    primary_label: '',
    primary_link: '',
    secondary_label: '',
    secondary_link: '',
  },
  about: {
    eyebrow: '',
    heading: '',
    para1: '',
    para2: '',
    link_label: '',
    link_url: '',
    photo_main: null,
    photo_small: null,
    badge: '',
  },
  facilities: {
    enabled: true,
    eyebrow: '',
    heading: '',
    text: '',
    button_label: '',
    button_link: '',
  },
  committee: { enabled: true, eyebrow: '', heading: '', text: '', button_label: '' },
  directory: { enabled: true, eyebrow: '', heading: '', text: '', button_label: '' },
  gallery: {
    enabled: true,
    eyebrow: '',
    heading: '',
    text: '',
    button_label: '',
    button_link: '',
    featured_tag: '',
  },
  highlights: {
    enabled: true,
    eyebrow: '',
    heading: '',
    text: '',
    items: [],
  },
  membership: {
    eyebrow: '',
    heading: '',
    text: '',
    background: null,
    benefits_eyebrow: '',
    benefits_title: '',
    benefits: [],
    apply_eyebrow: '',
    apply_title: '',
    apply_text: '',
    steps: [],
    button_label: '',
    button_link: '',
    footnote: '',
  },
}

/** @deprecated Use EMPTY_HOME — kept so old imports don't break. */
export const DEFAULT_HOME = EMPTY_HOME

const HOME_API_PATH = 'club/club-portal/website/home'

function asSection(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function showcaseHeading(raw: Record<string, unknown>): HomeShowcaseHeading {
  return {
    enabled: raw.enabled !== false,
    eyebrow: str(raw.eyebrow),
    heading: str(raw.heading),
    text: str(raw.text),
    button_label: str(raw.button_label),
  }
}

function mergeCustomSections(payload: WebsiteHomeResponse): HomeCustomSection[] {
  const p = payload?.payload && typeof payload.payload === 'object' ? payload.payload : {}
  const raw = Array.isArray(p.customSections)
    ? p.customSections
    : Array.isArray(p.custom_sections)
      ? p.custom_sections
      : []

  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && !Array.isArray(s))
    .filter((s) => s.enabled !== false)
    .map((s, i) => {
      const alignRaw = str(s.align || s.alignment || 'start').toLowerCase()
      const align: HomeSectionAlign =
        alignRaw === 'center' || alignRaw === 'end' ? alignRaw : 'start'
      return {
      id: String(s.id || `custom-${i}`),
      title: str(s.title),
      enabled: s.enabled !== false,
      align,
      blocks: Array.isArray(s.blocks)
        ? (s.blocks as HomeBlock[])
            .filter((b) => b && typeof b === 'object' && b.type)
            .map((b) => {
              // Old map default leaked into other block types — strip on read.
              if (
                b.type !== 'map' &&
                String(b.extra || '')
                  .trim()
                  .toLowerCase() === 'our location'
              ) {
                return { ...b, extra: '' }
              }
              return b
            })
        : [],
    }
    })
    .filter((s) => s.blocks.length > 0 || s.title)
}

function mergeHome(payload: WebsiteHomeResponse): HomeContent {
  const p = payload?.payload && typeof payload.payload === 'object' ? payload.payload : {}
  const sections =
    p.sections && typeof p.sections === 'object'
      ? (p.sections as Record<string, unknown>)
      : (p as Record<string, unknown>)

  const hero = asSection(sections.hero)
  const about = asSection(sections.about)
  const facilities = asSection(sections.facilities)
  const committee = asSection(sections.committee)
  const directory = asSection(sections.directory)
  const gallery = asSection(sections.gallery)
  const highlights = asSection(sections.highlights)
  const membership = asSection(sections.membership)

  const slides = Array.isArray(hero.slides)
    ? (hero.slides as HomeSlide[])
        .filter((s) => s && typeof s === 'object' && (s.image || (s as { src?: string }).src))
        .map((s) => ({
          image: mediaUrl(s.image || (s as { src?: string }).src || ''),
          alt: s.alt || '',
        }))
        .filter((s) => s.image)
    : []

  const benefits = Array.isArray(membership.benefits)
    ? (membership.benefits as HomeBenefit[]).filter((b) => b && typeof b === 'object' && (b.name || b.note))
    : []

  const steps = Array.isArray(membership.steps)
    ? (membership.steps as unknown[])
        .map((s) => (typeof s === 'string' ? s : String((s as { title?: string })?.title || '')))
        .filter(Boolean)
    : []

  return {
    hero: {
      slides,
      eyebrow: str(hero.eyebrow),
      heading: str(hero.heading),
      text: str(hero.text),
      primary_label: str(hero.primary_label),
      primary_link: str(hero.primary_link),
      secondary_label: str(hero.secondary_label),
      secondary_link: str(hero.secondary_link),
    },
    about: {
      eyebrow: str(about.eyebrow),
      heading: str(about.heading),
      para1: str(about.para1),
      para2: str(about.para2),
      link_label: str(about.link_label),
      link_url: str(about.link_url),
      photo_main: mediaUrl((about.photo_main as string | null) || '') || null,
      photo_small: mediaUrl((about.photo_small as string | null) || '') || null,
      badge: str(about.badge),
    },
    facilities: {
      enabled: facilities.enabled !== false,
      eyebrow: str(facilities.eyebrow),
      heading: str(facilities.heading),
      text: str(facilities.text),
      button_label: str(facilities.button_label),
      button_link: str(facilities.button_link),
    },
    committee: showcaseHeading(committee),
    directory: showcaseHeading(directory),
    gallery: {
      enabled: gallery.enabled !== false,
      eyebrow: str(gallery.eyebrow),
      heading: str(gallery.heading),
      text: str(gallery.text),
      button_label: str(gallery.button_label),
      button_link: str(gallery.button_link),
      featured_tag: str(gallery.featured_tag),
    },
    highlights: {
      enabled: highlights.enabled !== false,
      eyebrow: str(highlights.eyebrow),
      heading: str(highlights.heading),
      text: str(highlights.text),
      items: Array.isArray(highlights.items)
        ? (highlights.items as { value?: string; label?: string; note?: string }[])
            .filter((i) => i && typeof i === 'object' && (i.value || i.label))
            .map((i) => ({
              value: str(i.value),
              label: str(i.label),
              note: str(i.note),
            }))
        : [],
    },
    membership: {
      eyebrow: str(membership.eyebrow),
      heading: str(membership.heading),
      text: str(membership.text),
      background: mediaUrl((membership.background as string | null) || '') || null,
      benefits_eyebrow: str(membership.benefits_eyebrow),
      benefits_title: str(membership.benefits_title),
      benefits,
      apply_eyebrow: str(membership.apply_eyebrow),
      apply_title: str(membership.apply_title),
      apply_text: str(membership.apply_text),
      steps,
      button_label: str(membership.button_label),
      button_link: str(membership.button_link),
      footnote: str(membership.footnote),
    },
  }
}

/** `ready` is true after the first success or error. `fromApi` is true only on success. */
export function useHome(): {
  home: HomeContent
  customSections: HomeCustomSection[]
  ready: boolean
  fromApi: boolean
  error: string | null
  loading: boolean
} {
  const { data, error, loading } = useApi<WebsiteHomeResponse>(HOME_API_PATH)
  const fromApi = Boolean(data)
  const home = data ? mergeHome(data) : EMPTY_HOME
  const customSections = data ? mergeCustomSections(data) : []
  return { home, customSections, ready: !!data || !!error, fromApi, error, loading }
}

export type LinkTarget =
  | { kind: 'page' | 'media' | 'section'; id: string }
  | { kind: 'url'; href: string; external: boolean }

export function parseLink(link: string): LinkTarget | null {
  const v = (link || '').trim()
  if (!v) return null
  // Legacy admin keys (still work if already saved)
  const m = v.match(/^(page|media|section):(.+)$/)
  if (m) return { kind: m[1] as 'page' | 'media' | 'section', id: m[2] }
  // In-page anchor written by admin, e.g. #facilities
  if (v.startsWith('#')) {
    const id = v.slice(1).trim()
    return id ? { kind: 'section', id } : null
  }
  // Free-form URL / path / mailto / tel
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(v)) {
    return {
      kind: 'url',
      href: v,
      external: /^https?:\/\//i.test(v) && !v.startsWith(window.location.origin),
    }
  }
  return null
}
