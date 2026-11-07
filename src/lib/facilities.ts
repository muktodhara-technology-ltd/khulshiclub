import { mediaUrl } from './api/client'
import { useApi } from './useApi'

const FACILITIES_API = 'club/club-portal/website/facilities'
const AFFILIATED_API = 'club/club-portal/website/affiliated-clubs'

export type FacilityQuickFact = { label: string; value: string }
export type FacilityPhoto = { img: string; alt: string }

export type FacilityCard = {
  id: string
  slug: string
  name: string
  caption: string
  avail: string
  img: string
  gridArea: string
  bookable: boolean
  description: string
}

export type FacilityDetail = FacilityCard & {
  quickFacts: FacilityQuickFact[]
  paragraphs: string[]
  amenities: string[]
  rules: string[]
  photos: FacilityPhoto[]
}

export type FacilitiesIntro = {
  title: string
  para1: string
  para2: string
}

export type AffiliatedClub = {
  id: string
  name: string
  description: string
  link_label: string
  link_url: string
  logo: string
}

type ApiFacility = {
  id?: string
  slug?: string
  name?: string
  availability?: string | null
  caption?: string | null
  description?: string | null
  image?: string | null
  grid_area?: string | null
  bookable?: boolean
  sort_order?: number
  details?: {
    quick_facts?: { label?: string; value?: string }[]
    paragraphs?: string[]
    amenities?: string[]
    rules?: string[]
    gallery?: { image?: string; alt?: string }[]
  }
}

type FacilitiesListResponse = {
  intro?: { title?: string; para1?: string; para2?: string } | Record<string, unknown>
  facilities?: ApiFacility[]
}

function asStr(v: unknown) {
  return v == null ? '' : String(v)
}

function mapCard(raw: ApiFacility, index: number): FacilityCard | null {
  const name = asStr(raw.name).trim()
  if (!name) return null
  const slug = asStr(raw.slug || raw.id).trim() || `facility-${index}`
  return {
    id: asStr(raw.id) || slug,
    slug,
    name,
    caption: asStr(raw.caption),
    avail: asStr(raw.availability),
    img: mediaUrl(raw.image) || '',
    gridArea: asStr(raw.grid_area) || `f${index}`,
    bookable: Boolean(raw.bookable),
    description: asStr(raw.description),
  }
}

function mapDetail(raw: ApiFacility, index = 0): FacilityDetail | null {
  const card = mapCard(raw, index)
  if (!card) return null
  const d = raw.details && typeof raw.details === 'object' ? raw.details : {}
  const paragraphs = Array.isArray(d.paragraphs)
    ? d.paragraphs.map(asStr).map(s => s.trim()).filter(Boolean)
    : []
  if (!paragraphs.length && card.description) paragraphs.push(card.description)

  const photos: FacilityPhoto[] = Array.isArray(d.gallery)
    ? d.gallery
        .map(g => ({
          img: mediaUrl(g?.image) || '',
          alt: asStr(g?.alt) || card.name,
        }))
        .filter(p => p.img)
    : []
  if (!photos.length && card.img) photos.push({ img: card.img, alt: card.name })

  return {
    ...card,
    quickFacts: Array.isArray(d.quick_facts)
      ? d.quick_facts
          .map(f => ({ label: asStr(f?.label), value: asStr(f?.value) }))
          .filter(f => f.label || f.value)
      : [],
    paragraphs,
    amenities: Array.isArray(d.amenities) ? d.amenities.map(asStr).map(s => s.trim()).filter(Boolean) : [],
    rules: Array.isArray(d.rules) ? d.rules.map(asStr).map(s => s.trim()).filter(Boolean) : [],
    photos,
  }
}

export function useFacilitiesList() {
  const { data, error, loading, reload } = useApi<FacilitiesListResponse>(FACILITIES_API)
  const introRaw = data?.intro && typeof data.intro === 'object' ? (data.intro as Record<string, unknown>) : {}
  const intro: FacilitiesIntro = {
    title: asStr(introRaw.title) || 'Facilities',
    para1: asStr(introRaw.para1),
    para2: asStr(introRaw.para2),
  }
  const facilities = (data?.facilities ?? [])
    .map((row, i) => mapCard(row, i))
    .filter((x): x is FacilityCard => Boolean(x))

  return { intro, facilities, error, loading, reload }
}

export function useFacilityDetail(slugOrId: string | null) {
  const path = slugOrId ? `${FACILITIES_API}/${encodeURIComponent(slugOrId)}` : null
  const { data, error, loading, reload } = useApi<ApiFacility | null>(path)
  const detail = data ? mapDetail(data) : null
  return { detail, error, loading, reload }
}

export function useAffiliatedClubs() {
  const { data, error, loading } = useApi<AffiliatedClub[] | { data?: AffiliatedClub[] }>(AFFILIATED_API)
  const rows = Array.isArray(data) ? data : Array.isArray((data as { data?: AffiliatedClub[] })?.data) ? (data as { data: AffiliatedClub[] }).data : []
  const clubs = rows.map((row, i) => ({
    id: asStr(row.id) || `aff-${i}`,
    name: asStr(row.name),
    description: asStr(row.description),
    link_label: asStr(row.link_label) || 'Learn more',
    link_url: asStr(row.link_url),
    logo: mediaUrl(row.logo) || '',
  })).filter(c => c.name)

  return { clubs, error, loading }
}
