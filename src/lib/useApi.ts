import { useCallback, useEffect, useState } from 'react'
import { apiGet } from './api/client'

/**
 * Session-cached GET for club/club-portal paths (relative to /api/).
 * Example: useApi('club/club-portal/website/home')
 *
 * Soft navigations reuse memory cache (no network, no empty flash).
 * Hard reload clears the Map → fresh fetch. Call reload() / invalidateApiCache()
 * to force a refresh without a full page reload.
 */
const cache = new Map<string, unknown>()
const pending = new Map<string, Promise<unknown>>()

function load<T>(path: string, force = false): Promise<T> {
  if (!force && cache.has(path)) {
    return Promise.resolve(cache.get(path) as T)
  }

  const existing = pending.get(path) as Promise<T> | undefined
  if (existing) return existing

  const p = apiGet<T>(path)
    .then((d) => {
      cache.set(path, d)
      return d
    })
    .finally(() => {
      // Only clear if this is still the active in-flight request for the path.
      if (pending.get(path) === p) pending.delete(path)
    })

  pending.set(path, p)
  return p
}

/** Drop cached / in-flight GETs (e.g. after CMS publish). */
export function invalidateApiCache(pathPrefix?: string) {
  if (!pathPrefix) {
    cache.clear()
    pending.clear()
    return
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(pathPrefix)) cache.delete(key)
  }
  for (const key of [...pending.keys()]) {
    if (key.startsWith(pathPrefix)) pending.delete(key)
  }
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(() => (path && cache.has(path) ? (cache.get(path) as T) : null))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => !!path && !cache.has(path))
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!path) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    let alive = true

    // Already fetched this session — show cache and skip the network.
    // reload() clears cache then bumps nonce so the next run fetches again.
    if (cache.has(path)) {
      setData(cache.get(path) as T)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    load<T>(path, true)
      .then((d) => {
        if (!alive) return
        setData(d)
        setError(null)
      })
      .catch((e: Error) => {
        if (!alive) return
        setError(e.message || 'Request failed')
        // Keep any previous data; only clear when we had nothing.
        setData((prev) => prev)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [path, nonce])

  const reload = useCallback(() => {
    if (path) {
      cache.delete(path)
      pending.delete(path)
    }
    setNonce((n) => n + 1)
  }, [path])

  return { data, error, loading, reload }
}
