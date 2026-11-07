/**
 * Club public website endpoints → /api/club/club-portal/website/*
 * Same CMS tables as muktoerp admin Website Maintenance.
 */
import { apiGet, apiPost } from './client'

const BASE = 'club/club-portal/website'

export type WebsiteHomePayload = {
  sections?: Record<string, Record<string, unknown>>
  customSections?: unknown[]
  custom_sections?: unknown[]
  [key: string]: unknown
}

export type WebsiteHomeResponse = {
  id?: string
  payload?: WebsiteHomePayload | null
}

export type WebsiteSiteInfoRaw = {
  club_name?: string | null
  short_name?: string | null
  tagline?: string | null
  about_text?: string | null
  established_year?: string | null
  trade_license?: string | null
  govt_reg_no?: string | null
  helpdesk_reply_note?: string | null
  logo?: string | null
  favicon?: string | null
  share_image?: string | null
  phone?: string | null
  phone_alt?: string | null
  whatsapp?: string | null
  email?: string | null
  address?: string | null
  address_short?: string | null
  map_url?: string | null
  map_lat?: string | number | null
  map_lng?: string | number | null
  office_days?: string | null
  office_hours?: string | null
  office_note?: string | null
  facebook_url?: string | null
  youtube_url?: string | null
  instagram_url?: string | null
  linkedin_url?: string | null
  meta_title?: string | null
  meta_description?: string | null
  meta_keywords?: string | null
  copyright_text?: string | null
}

export function getWebsiteHome() {
  return apiGet<WebsiteHomeResponse>(`${BASE}/home`)
}

export function getWebsiteSiteInfo() {
  return apiGet<WebsiteSiteInfoRaw | null>(`${BASE}/site-info`)
}

export function postWebsiteContact(body: {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}) {
  return apiPost<{ id: string }>(`${BASE}/contact`, body)
}

/** Helpers for later pages — wired when those screens connect. */
export function getWebsiteAbout() {
  return apiGet<{ pages: unknown; founding_committee: unknown[]; executive_committee: unknown[] }>(`${BASE}/about`)
}

export function getWebsiteMembership() {
  return apiGet<{ payload: unknown }>(`${BASE}/membership`)
}

export function getWebsiteFacilities() {
  return apiGet<{ intro: unknown; facilities: unknown[] }>(`${BASE}/facilities`)
}

export function getWebsiteAffiliatedClubs() {
  return apiGet<unknown[]>(`${BASE}/affiliated-clubs`)
}

export function getWebsiteNotices(params?: Record<string, string | number | boolean | undefined | null>) {
  return apiGet<unknown>(`${BASE}/media/notices`, params)
}

export function getWebsiteNews(params?: Record<string, string | number | boolean | undefined | null>) {
  return apiGet<unknown>(`${BASE}/media/news`, params)
}

export function getWebsiteAlbums(params?: Record<string, string | number | boolean | undefined | null>) {
  return apiGet<unknown>(`${BASE}/media/albums`, params)
}

export function getWebsiteVideos(params?: Record<string, string | number | boolean | undefined | null>) {
  return apiGet<unknown>(`${BASE}/media/videos`, params)
}

export function getWebsiteResources(params?: Record<string, string | number | boolean | undefined | null>) {
  return apiGet<unknown>(`${BASE}/resources`, params)
}
