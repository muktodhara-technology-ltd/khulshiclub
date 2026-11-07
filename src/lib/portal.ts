/**
 * Signed-in member portal APIs → /api/club/club-portal/*
 */
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, ApiError, activeBaseURL, activePortalDomain } from './api/client'
import {
  clearMemberSession,
  getMemberSession,
  setMemberSession,
  type MemberProfile,
  type MemberSession,
} from './memberSession'

const BASE = 'club/club-portal'

export type PortalDashboard = {
  member: MemberProfile
  total_due: number
  open_invoices: number
  overdue_invoices: number
  next_due_date: string | null
  monthly_fees: number
  last_payment: PortalPayment | null
  notices: { id: string; title: string; published_at: string | null }[]
  can_pay: boolean
  read_only: boolean
}

export type PortalInvoice = {
  id: string
  invoice_no: string
  type?: string
  period?: string | null
  issue_date?: string | null
  due_date?: string | null
  subtotal?: number
  discount?: number
  total: number
  paid_amount?: number
  due_amount: number
  payment_status: string
  is_overdue?: boolean
  lines?: { description: string; quantity: number; rate: number; amount: number }[]
}

export type PortalPayment = {
  id: string
  receipt_no?: string | null
  tran_id?: string | null
  amount: number
  status?: string
  paid_at?: string | null
  payment_date?: string | null
  method?: string | null
  method_name?: string | null
  payment_method?: { method_name?: string } | null
}

export type PortalStatement = {
  from?: string | null
  to?: string | null
  opening_balance?: number
  closing_balance?: number
  total_debit?: number
  total_credit?: number
  entries?: {
    date?: string
    type?: string
    reference?: string
    description?: string
    debit?: number
    credit?: number
    balance?: number
  }[]
  lines?: {
    date?: string
    type?: string
    reference?: string
    description?: string
    debit?: number
    credit?: number
    balance?: number
  }[]
}

type LoginResult = {
  token: string
  token_type?: string
  expires_at?: string | null
  member: MemberProfile
}

type Paginator<T> = { data?: T[]; total?: number; current_page?: number }

function pageItems<T>(data: Paginator<T> | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.data) ? data!.data! : []
}

export async function portalLogin(identifier: string, password: string): Promise<MemberSession> {
  const data = await apiPost<LoginResult>(`${BASE}/auth/login`, {
    identifier: identifier.trim(),
    password,
  })
  if (!data?.token || !data?.member?.id) {
    throw new ApiError('Sign-in response was incomplete. Please try again.', 500)
  }
  const session: MemberSession = {
    token: data.token,
    expires_at: data.expires_at ?? null,
    member: data.member,
    memberNo: String(data.member.member_no || '').toUpperCase(),
    name: data.member.full_name || '',
    phone: data.member.phone || '',
  }
  setMemberSession(session)
  return session
}

export async function portalLogout(): Promise<void> {
  try {
    if (getMemberSession()?.token) {
      await apiPost(`${BASE}/auth/logout`, {})
    }
  } catch {
    /* still clear local session */
  } finally {
    clearMemberSession()
  }
}

export async function portalForgotPassword(identifier: string): Promise<void> {
  await apiPost(`${BASE}/auth/forgot-password`, { identifier: identifier.trim() })
}

export async function fetchPortalMe(): Promise<MemberProfile> {
  return apiGet<MemberProfile>(`${BASE}/me`)
}

export async function fetchPortalDashboard(): Promise<PortalDashboard> {
  return apiGet<PortalDashboard>(`${BASE}/dashboard`)
}

export async function fetchPortalInvoices(status: 'due' | 'paid' | 'all' = 'all') {
  const data = await apiGet<Paginator<PortalInvoice>>(`${BASE}/invoices`, {
    status: status === 'all' ? undefined : status,
    per_page: 50,
  })
  return pageItems(data)
}

export async function fetchPortalPayments() {
  const data = await apiGet<Paginator<PortalPayment>>(`${BASE}/payments`, { per_page: 50 })
  return pageItems(data)
}

export async function fetchPortalStatement(from?: string, to?: string) {
  return apiGet<PortalStatement>(`${BASE}/statement`, { from, to })
}

/**
 * Download the signed-in member's statement PDF.
 * Auth is Bearer-only — no member_id is sent; the API uses the token member.
 */
export async function downloadPortalStatementPdf(from?: string, to?: string): Promise<void> {
  const token = getMemberSession()?.token
  if (!token) throw new ApiError('Please sign in again.', 401)

  const qs = [
    from ? `from=${encodeURIComponent(from)}` : '',
    to ? `to=${encodeURIComponent(to)}` : '',
  ].filter(Boolean).join('&')

  const url = `${activeBaseURL()}${BASE}/statement/pdf${qs ? `?${qs}` : ''}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
        Authorization: `Bearer ${token}`,
        'X-Portal-Domain': activePortalDomain(),
      },
    })
  } catch {
    throw new ApiError('Could not reach the club server. Please check your connection and try again.', 0)
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) clearMemberSession()
    let message = 'Could not download the statement PDF.'
    try {
      const body = await res.json()
      if (body?.message) message = String(body.message)
    } catch { /* binary error body */ }
    throw new ApiError(message, res.status)
  }

  const type = res.headers.get('Content-Type') || ''
  if (!type.includes('pdf')) {
    throw new ApiError('Server did not return a PDF. Please try again.', 500)
  }

  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') || ''
  const match = /filename="?([^";]+)"?/i.exec(cd)
  const filename = match?.[1] || `statement-${from || 'from'}-${to || 'to'}.pdf`
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function changePortalPassword(current_password: string, password: string, password_confirmation: string) {
  await apiPost(`${BASE}/auth/change-password`, {
    current_password,
    password,
    password_confirmation,
  })
}

export type PortalChangeRequest = {
  id: string
  request_type?: string | null
  changes?: Record<string, string | null>
  reason?: string | null
  status: string
  review_remark?: string | null
  created_at?: string | null
  reviewed_at?: string | null
}

export async function fetchPortalChangeRequests() {
  return apiGet<PortalChangeRequest[]>(`${BASE}/change-requests`)
}

export async function submitPortalChangeRequest(payload: {
  request_type?: 'profile' | 'contact' | 'address' | 'membership_type' | 'other'
  changes: Record<string, string>
  reason?: string
}) {
  return apiPost<{ id: string; request_type?: string; changes?: Record<string, string>; status: string; created_at?: string }>(
    `${BASE}/change-requests`,
    payload,
  )
}

function usePortalQuery<T>(loader: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    loader()
      .then((d) => {
        if (alive) setData(d)
      })
      .catch((e: Error) => {
        if (alive) {
          setError(e.message)
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            clearMemberSession()
          }
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [enabled, nonce, loader])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, error, loading, reload }
}

export function usePortalDashboard(enabled = true) {
  const loader = useCallback(() => fetchPortalDashboard(), [])
  return usePortalQuery(loader, enabled)
}

export function usePortalMe(enabled = true) {
  const loader = useCallback(() => fetchPortalMe(), [])
  return usePortalQuery(loader, enabled)
}

export function usePortalInvoices(status: 'due' | 'paid' | 'all' = 'all', enabled = true) {
  const loader = useCallback(() => fetchPortalInvoices(status), [status])
  return usePortalQuery(loader, enabled)
}

export function usePortalPayments(enabled = true) {
  const loader = useCallback(() => fetchPortalPayments(), [])
  return usePortalQuery(loader, enabled)
}

export function usePortalStatement(enabled = true) {
  const loader = useCallback(() => fetchPortalStatement(), [])
  return usePortalQuery(loader, enabled)
}

export function usePortalChangeRequests(enabled = true) {
  const loader = useCallback(() => fetchPortalChangeRequests(), [])
  return usePortalQuery(loader, enabled)
}

export type PortalBankAccount = {
  id: string
  bank_name: string
  branch_name?: string | null
  account_name?: string | null
  account_no: string
  routing_no?: string | null
  logo_url?: string | null
  notes?: string | null
}

export type PortalBankAccountsPayload = {
  account_name?: string | null
  banks: PortalBankAccount[]
}

export async function fetchPortalBankAccounts() {
  return apiGet<PortalBankAccountsPayload>(`${BASE}/bank-accounts`)
}

export function usePortalBankAccounts(enabled = true) {
  const loader = useCallback(() => fetchPortalBankAccounts(), [])
  return usePortalQuery(loader, enabled)
}

export type PortalHelpdeskReply = {
  id: string
  from: 'club' | 'member'
  author_name?: string | null
  text: string
  date?: string | null
}

export type PortalHelpdeskTicket = {
  id: string
  ticket_no: string
  topic: string
  subject: string
  message: string
  status: 'open' | 'answered' | 'closed' | string
  created_at?: string | null
  last_replied_at?: string | null
  closed_at?: string | null
  replies: PortalHelpdeskReply[]
}

export type PortalHelpdeskPayload = {
  topics: string[]
  tickets: PortalHelpdeskTicket[]
}

export async function fetchPortalHelpdesk() {
  return apiGet<PortalHelpdeskPayload>(`${BASE}/helpdesk`)
}

export async function createPortalHelpdeskTicket(input: { topic: string; subject: string; message: string }) {
  return apiPost<PortalHelpdeskTicket>(`${BASE}/helpdesk`, input)
}

export async function replyPortalHelpdeskTicket(id: string, body: string) {
  return apiPost<PortalHelpdeskTicket>(`${BASE}/helpdesk/${id}/reply`, { body })
}

export function usePortalHelpdesk(enabled = true) {
  const loader = useCallback(() => fetchPortalHelpdesk(), [])
  return usePortalQuery(loader, enabled)
}

export type PortalNotification = {
  id: string
  type: string
  title: string
  body?: string | null
  href?: string | null
  created_at?: string | null
  read_at?: string | null
}

export type PortalNotificationsPayload = {
  data: PortalNotification[]
  unread_count: number
}

export async function fetchPortalNotifications() {
  return apiGet<PortalNotificationsPayload>(`${BASE}/notifications`)
}

export async function markPortalNotificationRead(id: string) {
  return apiPost(`${BASE}/notifications/${encodeURIComponent(id)}/read`)
}

export async function markAllPortalNotificationsRead() {
  return apiPost(`${BASE}/notifications/read-all`)
}

export function usePortalNotifications(enabled = true) {
  const loader = useCallback(() => fetchPortalNotifications(), [])
  return usePortalQuery(loader, enabled)
}
