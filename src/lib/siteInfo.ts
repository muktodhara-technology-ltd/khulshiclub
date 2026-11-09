import { mediaUrl } from './api/client'
import { useApi } from './useApi'
import type { WebsiteSiteInfoRaw } from './api/website'

/**
 * Club-wide details from Club → Website Maintenance → Site Info
 * GET /api/club/club-portal/website/site-info
 * No dummy fallback — empty until API succeeds.
 */

export type SiteInfo = {
  club_name: string
  short_name: string | null
  tagline: string | null
  about_text: string | null
  established_year: string | null
  trade_license: string | null
  govt_reg_no: string | null
  /** Shown after a member sends a helpdesk request. */
  helpdesk_reply_note: string | null
  logo: string | null
  favicon: string | null
  og_image: string | null
  contact: {
    phone: string | null
    phone_alt: string | null
    phones: { label: string; href: string }[]
    phone_href: string | null
    email: string | null
    whatsapp: string | null
    whatsapp_url: string | null
  }
  address: {
    full: string | null
    short: string | null
    map_url: string | null
    lat: number | null
    lng: number | null
    embed_url: string | null
  }
  office: { days: string | null; hours: string | null; note: string | null }
  social: Partial<Record<'facebook' | 'youtube' | 'instagram' | 'linkedin', string>>
  seo: { title: string | null; description: string | null; keywords: string | null }
  copyright: string
}

function telHref(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : null
}

function waUrl(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const EMPTY_SITE: SiteInfo = {
  club_name: '',
  short_name: null,
  tagline: null,
  about_text: null,
  established_year: null,
  trade_license: null,
  govt_reg_no: null,
  helpdesk_reply_note: null,
  logo: null,
  favicon: null,
  og_image: null,
  contact: {
    phone: null,
    phone_alt: null,
    phones: [],
    phone_href: null,
    email: null,
    whatsapp: null,
    whatsapp_url: null,
  },
  address: {
    full: null,
    short: null,
    map_url: null,
    lat: null,
    lng: null,
    embed_url: null,
  },
  office: { days: null, hours: null, note: null },
  social: {},
  seo: { title: null, description: null, keywords: null },
  copyright: '',
}

/** @deprecated Use EMPTY_SITE */
export const DEFAULT_SITE = EMPTY_SITE

function mapSiteInfo(raw: WebsiteSiteInfoRaw | null | undefined): SiteInfo | null {
  if (!raw || typeof raw !== 'object') return null
  // Only treat as empty when nothing useful was saved — logo alone must still count
  // (staff often upload the logo before filling name / contact).
  const hasAnything = Boolean(
    raw.club_name ||
      raw.short_name ||
      raw.phone ||
      raw.email ||
      raw.address ||
      raw.logo ||
      raw.favicon ||
      raw.share_image ||
      raw.tagline ||
      raw.about_text,
  )
  if (!hasAnything) return null

  const phone = raw.phone ?? null
  const phoneAlt = raw.phone_alt ?? null
  const phones = [phone, phoneAlt]
    .filter(Boolean)
    .map((p) => ({ label: String(p), href: telHref(String(p)) || `tel:${p}` }))

  const lat = num(raw.map_lat)
  const lng = num(raw.map_lng)
  const copyright = (raw.copyright_text || '').replace('{year}', String(new Date().getFullYear()))

  return {
    club_name: raw.club_name || '',
    short_name: raw.short_name ?? null,
    tagline: raw.tagline ?? null,
    about_text: raw.about_text ?? null,
    established_year: raw.established_year ?? null,
    trade_license: raw.trade_license ?? null,
    govt_reg_no: raw.govt_reg_no ?? null,
    helpdesk_reply_note: raw.helpdesk_reply_note ?? null,
    logo: mediaUrl(raw.logo) || null,
    favicon: mediaUrl(raw.favicon) || null,
    og_image: mediaUrl(raw.share_image) || null,
    contact: {
      phone,
      phone_alt: phoneAlt,
      phones,
      phone_href: telHref(phone),
      email: raw.email ?? null,
      whatsapp: raw.whatsapp ?? phone,
      whatsapp_url: waUrl(raw.whatsapp || phone),
    },
    address: {
      full: raw.address ?? null,
      short: raw.address_short ?? null,
      map_url: raw.map_url ?? null,
      lat,
      lng,
      embed_url:
        lat != null && lng != null
          ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012}%2C${lat - 0.012}%2C${lng + 0.012}%2C${lat + 0.012}&layer=mapnik&marker=${lat}%2C${lng}`
          : null,
    },
    office: {
      days: raw.office_days ?? null,
      hours: raw.office_hours ?? null,
      note: raw.office_note ?? null,
    },
    social: {
      ...(raw.facebook_url ? { facebook: raw.facebook_url } : {}),
      ...(raw.youtube_url ? { youtube: raw.youtube_url } : {}),
      ...(raw.instagram_url ? { instagram: raw.instagram_url } : {}),
      ...(raw.linkedin_url ? { linkedin: raw.linkedin_url } : {}),
    },
    seo: {
      title: raw.meta_title ?? null,
      description: raw.meta_description ?? null,
      keywords: raw.meta_keywords ?? null,
    },
    copyright,
  }
}

const SITE_API_PATH = 'club/club-portal/website/site-info'

export function useSiteInfo(): SiteInfo & { fromApi: boolean; loading: boolean; error: string | null } {
  const { data, error, loading } = useApi<WebsiteSiteInfoRaw | null>(SITE_API_PATH)
  const mapped = mapSiteInfo(data)
  return {
    ...(mapped ?? EMPTY_SITE),
    fromApi: Boolean(mapped),
    loading,
    error,
  }
}

/** "Sat – Thu · 10:00 AM – 6:00 PM" */
export const officeLine = (s: SiteInfo) => [s.office.days, s.office.hours].filter(Boolean).join(' · ')
