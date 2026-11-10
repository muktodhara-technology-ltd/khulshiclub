/**
 * Club Media Centre → /api/club/club-portal/website/media/*
 * Maps Laravel paginated CMS rows to the public UI shapes.
 */
import { mediaUrl } from './api/client'
import { useApi } from './useApi'

const MEDIA = 'club/club-portal/website/media'

export type NoticeEntry = {
  id: number
  date: string
  year: string
  month: string
  title: string
  bangla: boolean
  category: string
  fileType: string | null
  size: string | null
  file_url: string | null
}

export type AlbumEntry = {
  id: number
  slug: string
  name: string
  count: number
  year: string | null
  cover: string | null
}

export type AlbumDetailData = AlbumEntry & {
  photos: { id: number; src: string; caption: string | null }[]
}

export type Article = {
  id: number
  slug: string
  title: string
  date: string
  category: string
  excerpt: string | null
  image: string | null
  featured?: boolean
  body?: string[]
  /** ISO timestamp — used to pick the newest home lead vs videos. */
  uploadedAt: number
}

export type VideoEntry = {
  id: number
  title: string
  date: string
  duration: string | null
  thumb: string | null
  description: string | null
  video_url: string | null
  embed_url: string | null
  /** ISO timestamp — used to pick the newest home lead vs news covers. */
  uploadedAt: number
}

type Paginator<T> = { data?: T[]; total?: number }

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

function parseDate(raw: unknown): Date | null {
  if (!raw) return null
  const d = new Date(String(raw))
  return Number.isNaN(d.getTime()) ? null : d
}

function shortDate(d: Date | null) {
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function longMonth(d: Date | null) {
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function yearOf(d: Date | null) {
  return d ? String(d.getFullYear()) : ''
}

function isBangla(text: string) {
  return /[\u0980-\u09FF]/.test(text)
}

function fileTypeFromPath(path: string | null) {
  if (!path) return null
  const clean = path.split('?')[0].split('#')[0]
  const ext = clean.includes('.') ? clean.split('.').pop()!.toLowerCase() : ''
  if (!ext) return null
  if (ext === 'pdf') return 'PDF'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ext.toUpperCase()
  return ext.toUpperCase()
}

function bodyParagraphs(body: unknown): string[] {
  if (Array.isArray(body)) return body.map(str).map((s) => s.trim()).filter(Boolean)
  const text = str(body).trim()
  if (!text) return []
  // Strip simple HTML tags from CMS rich text, then split on blank lines / <p>
  const plain = text
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
  return plain.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
}

function youtubeEmbed(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/) ||
    url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

function vimeoEmbed(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? `https://player.vimeo.com/video/${m[1]}` : null
}

function embedFromUrl(url: string | null): string | null {
  if (!url) return null
  if (/youtube\.com\/embed\//i.test(url) || /player\.vimeo\.com\/video\//i.test(url)) return url
  return youtubeEmbed(url) || vimeoEmbed(url)
}

function mapNotice(raw: unknown, index: number): NoticeEntry {
  const n = asObj(raw)
  const d = parseDate(n.notice_date)
  const attachment = str(n.attachment) || null
  const fileUrl = mediaUrl(attachment) || (str(n.external_url) ? str(n.external_url) : null)
  const title = str(n.title)
  return {
    id: numId(n.id, index + 1),
    date: shortDate(d),
    year: yearOf(d),
    month: longMonth(d),
    title,
    bangla: isBangla(title),
    category: str(n.category) || 'Announcement',
    fileType: fileTypeFromPath(attachment) || (fileUrl ? 'LINK' : null),
    size: null,
    file_url: fileUrl,
  }
}

function uploadedAtMs(raw: Record<string, unknown>, fallbackDate: Date | null) {
  const fromApi = parseDate(raw.updated_at) || parseDate(raw.created_at) || fallbackDate
  return fromApi ? fromApi.getTime() : 0
}

function mapArticle(raw: unknown, index: number, full = false): Article {
  const n = asObj(raw)
  const d = parseDate(n.event_date) || parseDate(n.publish_at)
  const article: Article = {
    id: numId(n.id, index + 1),
    slug: str(n.slug) || str(n.id),
    title: str(n.title),
    date: shortDate(d) || str(n.event_date),
    category: str(n.category) || 'Club News',
    excerpt: str(n.summary) || null,
    image: mediaUrl(str(n.cover_image)) || null,
    featured: Boolean(n.featured),
    uploadedAt: uploadedAtMs(n, d),
  }
  if (full) article.body = bodyParagraphs(n.body)
  return article
}

function mapAlbum(raw: unknown, index: number): AlbumEntry {
  const a = asObj(raw)
  const d = parseDate(a.event_date)
  const id = str(a.id) || String(index + 1)
  return {
    id: numId(a.id, index + 1),
    slug: id,
    name: str(a.name),
    count: Number(a.photos_count ?? 0) || 0,
    year: yearOf(d) || null,
    cover: mediaUrl(str(a.cover_image)) || null,
  }
}

function mapAlbumDetail(raw: unknown): AlbumDetailData {
  const a = asObj(raw)
  const base = mapAlbum(a, 0)
  const photosRaw = Array.isArray(a.photos) ? a.photos : []
  const photos = photosRaw.map((p, i) => {
    const row = asObj(p)
    return {
      id: numId(row.id, i + 1),
      src: mediaUrl(str(row.path)) || '',
      caption: str(row.caption) || null,
    }
  }).filter((p) => p.src)
  return {
    ...base,
    count: photos.length || base.count,
    cover: base.cover || photos[0]?.src || null,
    photos,
  }
}

function mapVideo(raw: unknown, index: number): VideoEntry {
  const v = asObj(raw)
  const d = parseDate(v.date)
  const url = str(v.url) || null
  return {
    id: numId(v.id, index + 1),
    title: str(v.title),
    date: shortDate(d) || str(v.date),
    duration: str(v.length) || null,
    thumb: mediaUrl(str(v.thumb_image)) || null,
    description: str(v.description) || null,
    video_url: url,
    embed_url: embedFromUrl(url),
    uploadedAt: uploadedAtMs(v, d),
  }
}

function pageItems<T>(data: Paginator<T> | null | undefined): T[] {
  return Array.isArray(data?.data) ? data!.data! : []
}

export function useNotices() {
  const { data, error, loading, reload } = useApi<Paginator<unknown>>(`${MEDIA}/notices?per_page=50`)
  const notices = pageItems(data).map(mapNotice)
  const categories = Array.from(new Set(notices.map((n) => n.category).filter(Boolean)))
  const years = Array.from(new Set(notices.map((n) => n.year).filter(Boolean))).sort((a, b) => b.localeCompare(a))
  return {
    data: data ? { notices, categories, years } : null,
    error,
    loading,
    reload,
  }
}

export function useNewsList() {
  const { data, error, loading, reload } = useApi<Paginator<unknown>>(`${MEDIA}/news?per_page=50`)
  const articles = pageItems(data).map((row, i) => mapArticle(row, i, false))
  const featured = articles.find((a) => a.featured) ?? articles[0] ?? null
  const rest = featured ? articles.filter((a) => a.id !== featured.id || a.slug !== featured.slug) : articles
  // Keep featured out of the grid when it was marked featured; if we fell back to [0], still show others
  const grid = featured && articles.some((a) => a.featured)
    ? articles.filter((a) => !(a.featured && a.id === featured.id))
    : rest
  return {
    data: data ? { featured, articles: grid } : null,
    error,
    loading,
    reload,
  }
}

export function useNewsDetail(slugOrId: string | null) {
  const path = slugOrId ? `${MEDIA}/news/${encodeURIComponent(slugOrId)}` : null
  const detail = useApi<unknown>(path)
  const list = useApi<Paginator<unknown>>(`${MEDIA}/news?per_page=20`)
  const article = detail.data ? mapArticle(detail.data, 0, true) : null
  const related = pageItems(list.data)
    .map((row, i) => mapArticle(row, i, false))
    .filter((a) => article && a.slug !== article.slug && String(a.id) !== String(article.id))
    .slice(0, 3)
  return {
    data: article ? { article, related } : null,
    error: detail.error,
    loading: detail.loading,
    reload: detail.reload,
  }
}

export function useAlbums() {
  const { data, error, loading, reload } = useApi<Paginator<unknown>>(`${MEDIA}/albums?per_page=50`)
  const albums = pageItems(data).map(mapAlbum)
  return {
    data: data ? { albums } : null,
    error,
    loading,
    reload,
  }
}

export function useAlbumDetail(idOrSlug: string | null) {
  const path = idOrSlug ? `${MEDIA}/albums/${encodeURIComponent(idOrSlug)}` : null
  const { data, error, loading, reload } = useApi<unknown>(path)
  return {
    data: data ? { album: mapAlbumDetail(data) } : null,
    error,
    loading,
    reload,
  }
}

export function useVideos() {
  const { data, error, loading, reload } = useApi<Paginator<unknown>>(`${MEDIA}/videos?per_page=50`)
  const videos = pageItems(data).map(mapVideo)
  return {
    data: data ? { videos } : null,
    error,
    loading,
    reload,
  }
}
