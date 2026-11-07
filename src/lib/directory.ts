/**
 * Public member directory → GET /club/club-portal/website/directory
 */
import { useCallback, useEffect, useState } from 'react'
import { apiGet, mediaUrl } from './api/client'

const PATH = 'club/club-portal/website/directory'

export type DirectoryMember = {
  id: string
  member_no: string
  full_name: string
  membership_type?: string | null
  photo_url?: string | null
  profession?: string | null
  designation?: string | null
  company?: string | null
}

export type DirectoryPage = {
  data: DirectoryMember[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

function mapRow(raw: Record<string, unknown>): DirectoryMember {
  return {
    id: String(raw.id || ''),
    member_no: String(raw.member_no || ''),
    full_name: String(raw.full_name || ''),
    membership_type: raw.membership_type == null ? null : String(raw.membership_type),
    photo_url: mediaUrl((raw.photo_url as string) || '') || null,
    profession: raw.profession == null ? null : String(raw.profession),
    designation: raw.designation == null ? null : String(raw.designation),
    company: raw.company == null ? null : String(raw.company),
  }
}

export async function fetchDirectory(params?: { q?: string; page?: number; per_page?: number }) {
  const page = await apiGet<DirectoryPage>(PATH, {
    q: params?.q,
    page: params?.page,
    per_page: params?.per_page ?? 48,
  })
  const rows = Array.isArray(page?.data) ? page.data : []
  return {
    ...page,
    data: rows.map((r) => mapRow(r as unknown as Record<string, unknown>)),
  } as DirectoryPage
}

function useDirectoryQuery(loader: () => Promise<DirectoryPage>, deps: unknown[]) {
  const [data, setData] = useState<DirectoryPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    loader()
      .then((d) => { if (alive) setData(d) })
      .catch((e: Error) => { if (alive) setError(e.message || 'Could not load directory.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, error, loading, reload }
}

/** Homepage carousel — first N directory members. */
export function useDirectoryShowcase(limit = 12) {
  const { data, error, loading } = useDirectoryQuery(
    () => fetchDirectory({ per_page: Math.max(limit, 24) }),
    [limit],
  )
  const people = (data?.data || [])
    .slice()
    .sort((a, b) => Number(Boolean(b.photo_url)) - Number(Boolean(a.photo_url)))
    .slice(0, limit)
  return { people, error, loading, total: data?.total ?? people.length }
}

export function useDirectoryList(opts: { q?: string; page?: number; per_page?: number } = {}) {
  const { q = '', page = 1, per_page = 12 } = opts
  const { data, error, loading, reload } = useDirectoryQuery(
    () => fetchDirectory({ q: q.trim() || undefined, page, per_page }),
    [q, page, per_page],
  )
  return {
    members: data?.data || [],
    total: data?.total ?? 0,
    lastPage: data?.last_page ?? 1,
    currentPage: data?.current_page ?? page,
    error,
    loading,
    reload,
  }
}
