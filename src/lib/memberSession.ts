/**
 * Member portal session: Bearer token + profile snapshot from club/club-portal/auth/login.
 * Persisted in sessionStorage (tab lifetime).
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

function readRaw(): MemberSession | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MemberSession>
    if (!parsed?.token || !parsed?.member?.id) return null
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
    if (!session) sessionStorage.removeItem(KEY)
    else {
      const memberNo = String(session.member.member_no || session.memberNo || '').toUpperCase()
      const next: MemberSession = {
        token: session.token,
        expires_at: session.expires_at ?? null,
        member: { ...session.member, member_no: memberNo },
        memberNo,
        name: session.member.full_name || session.name || '',
        phone: session.member.phone || session.phone || '',
      }
      sessionStorage.setItem(KEY, JSON.stringify(next))
    }
  } catch {
    /* private mode / quota */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function clearMemberSession() {
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
