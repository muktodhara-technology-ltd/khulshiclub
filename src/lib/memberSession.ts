/**
 * Member portal session: Bearer token + profile snapshot from club/club-portal/auth/login.
 * Persisted in localStorage so every tab of the site shares one sign-in and it survives
 * closing the browser, until logout or the token's expires_at.
 * (Was sessionStorage: a new tab, or going back to the site in another tab, looked signed out.)
 */
import { useCallback, useEffect, useState } from 'react'

const KEY = 'ckcl_member_session'
const EVENT = 'ckcl-member-session'

export type MemberProfile = {
  id: string
  member_no: string
  full_name: string
  first_name?: string | null
  last_name?: string | null
  status?: string | null
  /** Account Active/Inactive (dues lock). Separate from membership lifecycle status. */
  is_account_active?: boolean
  membership_type?: string | null
  /** Hex card colour set on the membership type in the ERP; null = default dark card. */
  membership_type_color?: string | null
  joined_at?: string | null
  photo_url?: string | null
  phone?: string | null
  email?: string | null
  gender?: string | null
  date_of_birth?: string | null
  blood_group?: string | null
  profession?: string | null
  designation?: string | null
  company?: string | null
  present_address?: string | null
  permanent_address?: string | null
  spouse_name?: string | null
  national_id?: string | null
  show_in_directory?: boolean
  [key: string]: unknown
}

export type MemberSession = {
  token: string
  expires_at?: string | null
  member: MemberProfile
  /** Convenience aliases used by older UI */
  memberNo: string
  name?: string
  phone?: string
}

/** Read the stored session; one-time move of an older tab-only (sessionStorage) session. */
function readStored(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return raw
    const legacy = sessionStorage.getItem(KEY)
    if (legacy) {
      localStorage.setItem(KEY, legacy)
      sessionStorage.removeItem(KEY)
    }
    return legacy
  } catch {
    return null
  }
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  const t = Date.parse(expiresAt)
  return Number.isFinite(t) && t <= Date.now()
}

function readRaw(): MemberSession | null {
  try {
    const raw = readStored()
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MemberSession>
    if (!parsed?.token || !parsed?.member?.id) return null
    if (isExpired(parsed.expires_at)) {
      try { localStorage.removeItem(KEY) } catch { /* ignore */ }
      return null
    }
    const memberNo = String(parsed.member.member_no || parsed.memberNo || '').toUpperCase()
    if (!memberNo) return null
    return {
      token: parsed.token,
      expires_at: parsed.expires_at ?? null,
      member: parsed.member as MemberProfile,
      memberNo,
      name: parsed.member.full_name || parsed.name || '',
      phone: parsed.member.phone || parsed.phone || '',
    }
  } catch {
    return null
  }
}

export function getMemberSession(): MemberSession | null {
  return readRaw()
}

export function getMemberToken(): string | null {
  return readRaw()?.token ?? null
}

export function setMemberSession(session: MemberSession | null) {
  try {
    if (!session) {
      localStorage.removeItem(KEY)
      sessionStorage.removeItem(KEY)
    } else {
      const memberNo = String(session.member.member_no || session.memberNo || '').toUpperCase()
      const next: MemberSession = {
        token: session.token,
        expires_at: session.expires_at ?? null,
        member: { ...session.member, member_no: memberNo },
        memberNo,
        name: session.member.full_name || session.name || '',
        phone: session.member.phone || session.phone || '',
      }
      localStorage.setItem(KEY, JSON.stringify(next))
    }
  } catch {
    /* private mode / quota */
  }
  window.dispatchEvent(new Event(EVENT))
}

/** sessionStorage prefix for cached portal API responses (see usePortalQuery). */
export const PORTAL_CACHE_PREFIX = 'ckcl-portal-cache:'

/** Drop every cached portal response (logout / expired session). */
export function clearPortalCache() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(PORTAL_CACHE_PREFIX)) sessionStorage.removeItem(k)
    }
  } catch {
    /* private mode */
  }
}

export function clearMemberSession() {
  clearPortalCache()
  setMemberSession(null)
}

export function useMemberSession() {
  const [session, setSession] = useState<MemberSession | null>(() => getMemberSession())

  useEffect(() => {
    const sync = () => setSession(getMemberSession())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const signIn = useCallback((next: MemberSession) => {
    setMemberSession(next)
  }, [])

  const signOut = useCallback(() => {
    clearMemberSession()
  }, [])

  return {
    session,
    token: session?.token ?? null,
    member: session?.member ?? null,
    memberNo: session?.memberNo ?? null,
    signIn,
    signOut,
  }
}
