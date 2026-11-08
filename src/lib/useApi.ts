import { useCallback, useEffect, useState } from 'react'
import { apiGet } from './api/client'

/**
 * Session-cached GET for club/club-portal paths (relative to /api/).
 *
 * Soft navigation (in-app): reuse memory cache — no network, no empty flash.
 * Hard reload (F5): restore last payload from sessionStorage instantly, then
 * revalidate in the background so the UI never blanks out.
 * Explicit reload() / invalidateApiCache(): force a fresh network fetch.
 */
const SS_PREFIX = 'ckcl_api_v1:'
const cache = new Map<string, unknown>()
const pending = new Map<string, Promise<unknown>>()
/** Paths successfully fetched over the network in this JS lifetime. */
const fetchedThisSession = new Set<string>()

function readPersisted<T>(path: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + path)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writePersisted(path: string, data: unknown) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SS_PREFIX + path, JSON.stringify(data))
  } catch {
    // Quota / private mode — memory cache still works for soft nav.
  }
}

function clearPersisted(pathPrefix?: string) {
  if (typeof window === 'undefined') return
  try {
    if (!pathPrefix) {
      const keys: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (k?.startsWith(SS_PREFIX)) keys.push(k)
      }
      keys.forEach((k) => sessionStorage.removeItem(k))
      return
    }
    sessionStorage.removeItem(SS_PREFIX + pathPrefix)
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(SS_PREFIX) && k.slice(SS_PREFIX.length).startsWith(pathPrefix)) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

/** Memory first, then sessionStorage (hydrates memory). */
function peek<T>(path: string): T | null {
  if (cache.has(path)) return cache.get(path) as T
  const persisted = readPersisted<T>(path)
  if (persisted !== null && persisted !== undefined) {
    cache.set(path, persisted)
    return persisted
  }
  return null
}

function load<T>(path: string, force = false): Promise<T> {
  if (!force && cache.has(path) && fetchedThisSession.has(path)) {
    return Promise.resolve(cache.get(path) as T)
  }

  const existing = pending.get(path) as Promise<T> | undefined
  if (existing) return existing

  const p = apiGet<T>(path)
    .then((d) => {
      cache.set(path, d)
      fetchedThisSession.add(path)
      writePersisted(path, d)
      return d
    })
    .finally(() => {
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
    fetchedThisSession.clear()
    clearPersisted()
    return
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(pathPrefix)) cache.delete(key)
  }
  for (const key of [...pending.keys()]) {
    if (key.startsWith(pathPrefix)) pending.delete(key)
  }
  for (const key of [...fetchedThisSession]) {
    if (key.startsWith(pathPrefix)) fetchedThisSession.delete(key)
  }
  clearPersisted(pathPrefix)
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(() => (path ? peek<T>(path) : null))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => {
    if (!path) return false
    // Have something to show (memory or sessionStorage) → not a blocking load.
    return peek<T>(path) == null
  })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!path) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    let alive = true

    // Soft nav: already fetched this tab session — paint cache, skip network.
    if (nonce === 0 && fetchedThisSession.has(path) && cache.has(path)) {
      setData(cache.get(path) as T)
      setLoading(false)
      setError(null)
      return
    }

    const stale = peek<T>(path)
    if (stale != null) {
      // Hard reload / first paint with persisted data — show immediately.
      setData(stale)
      setLoading(false)
      setError(null)
    } else {
      setLoading(true)
      setError(null)
    }

    load<T>(path, true)
      .then((d) => {
        if (!alive) return
        setData(d)
        setError(null)
      })
      .catch((e: Error) => {
        if (!alive) return
        setError(e.message || 'Request failed')
        // Keep stale data on screen if we had any.
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
      fetchedThisSession.delete(path)
      clearPersisted(path)
    }
    setNonce((n) => n + 1)
  }, [path])

  return { data, error, loading, reload }
}
