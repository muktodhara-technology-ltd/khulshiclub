/**
 * Club Resources → /api/club/club-portal/website/resources
 * Maps paginated CMS resources to the public Annual Reports UI.
 */
import { mediaUrl } from './api/client'
import { useApi } from './useApi'

const RESOURCES_API = 'club/club-portal/website/resources'

export type Report = {
  id: number
  year: string
  title: string
  subtitle: string
  pages: number
  size: string
  cover: string
  featured?: boolean
  publishedDate: string
  file_url: string | null
}

type Paginator<T> = { data?: T[] }

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function str(v: unknown) {
  return v == null ? '' : String(v)
}

function numId(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) && n !== 0 ? n : fallback
}

function formatPublished(raw: unknown) {
  if (!raw) return ''
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return str(raw)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function mapReport(raw: unknown, index: number): Report {
  const r = asObj(raw)
  const pagesNum = Number(r.pages)
  const file = mediaUrl(str(r.file_path)) || (str(r.external_url) || null)
  return {
    id: numId(r.id, index + 1),
    year: str(r.period_label) || formatPublished(r.published_on) || '—',
    title: str(r.title),
    subtitle: str(r.summary),
    pages: Number.isFinite(pagesNum) && pagesNum > 0 ? pagesNum : 0,
    size: '',
    cover: mediaUrl(str(r.cover_image)) || '',
    featured: Boolean(r.featured),
    publishedDate: formatPublished(r.published_on),
    file_url: file,
  }
}

/** Prefer report/accounts types; if none, show every public resource. */
function pickReports(rows: unknown[]) {
  const mapped = rows.map(mapReport)
  const preferred = rows
    .map((raw, i) => ({ raw: asObj(raw), report: mapped[i] }))
    .filter(({ raw }) => {
      const t = str(raw.resource_type).toLowerCase()
      return !t || t === 'report' || t === 'accounts'
    })
    .map(({ report }) => report)
  return preferred.length ? preferred : mapped
}

export function useReports() {
  const { data, error, loading, reload } = useApi<Paginator<unknown>>(`${RESOURCES_API}?per_page=50`)
  const rows = Array.isArray(data?.data) ? data!.data! : []
  const reports = pickReports(rows)
  const featured = reports.find((r) => r.featured) ?? reports[0] ?? null
  const rest = featured
    ? reports.filter((r) => !(r.id === featured.id && r.title === featured.title))
    : []

  return {
    data: data ? { featured, reports: rest, all: reports } : null,
    error,
    loading,
    reload,
  }
}
