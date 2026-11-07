/**
 * Public club dues lookup (OTP-gated) → /api/club/club-portal/dues/*
 */
import { ApiError, apiGet, apiPost, apiRequest, baseURL, mediaUrl, portalDomain } from './api/client'

const BASE = 'club/club-portal/dues'
const TOKEN_KEY = 'ckcl_dues_token'

export type DuesMemberHit = {
  id: string
  member_no: string
  full_name: string
  membership_type?: string | null
  photo_url?: string | null
  phone_masked?: string
  email_masked?: string
  has_phone?: boolean
  has_email?: boolean
}

export type DuesSessionMember = {
  id: string
  member_no: string
  full_name: string
  membership_type?: string | null
  photo_url?: string | null
  designation?: string | null
  company?: string | null
}

export function getDuesToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setDuesToken(token: string | null) {
  try {
    if (!token) sessionStorage.removeItem(TOKEN_KEY)
    else sessionStorage.setItem(TOKEN_KEY, token)
  } catch { /* ignore */ }
}

export async function lookupDuesMembers(q: string, membershipType?: string) {
  return apiPost<DuesMemberHit[]>(`${BASE}/lookup`, {
    q,
    membership_type: membershipType || undefined,
  })
}

export async function sendDuesOtp(memberId: string, channel: 'phone' | 'email') {
  return apiPost<{ sent: boolean }>(`${BASE}/otp/send`, {
    member_id: memberId,
    channel,
  })
}

export async function verifyDuesOtp(memberId: string, channel: 'phone' | 'email', code: string) {
  const data = await apiPost<{ dues_token: string; expires_in: number; member: DuesSessionMember }>(`${BASE}/otp/verify`, {
    member_id: memberId,
    channel,
    code,
  })
  if (data?.dues_token) setDuesToken(data.dues_token)
  return data
}

async function duesGet<T>(path: string, params?: Record<string, string | number | undefined>) {
  const token = getDuesToken()
  if (!token) throw new Error('Dues session expired. Please verify again.')
  const qs = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  return apiRequest<T>(qs ? `${path}?${qs}` : path, {
    method: 'GET',
    headers: { 'X-Dues-Token': token },
  })
}

export async function fetchDuesSummary() {
  return duesGet<{
    total_due: number
    open_invoices: number
    overdue_invoices: number
    invoices: unknown[]
    member: DuesSessionMember
  }>(`${BASE}/summary`)
}

export async function fetchDuesStatement(from?: string, to?: string) {
  return duesGet<{
    from?: string
    to?: string
    opening_balance?: number
    closing_balance?: number
    total_debit?: number
    total_credit?: number
    entries?: Array<{
      date?: string
      reference?: string
      description?: string
      debit?: number
      credit?: number
      balance?: number
      type?: string
    }>
  }>(`${BASE}/statement`, { from, to })
}

export type DuesPayAccount = {
  id: string
  bank_name: string
  branch_name?: string | null
  account_name: string
  account_no: string
  routing_no?: string | null
  notes?: string | null
}

export type DuesPayMethods = {
  gateways: string[]
  can_settle_offline: boolean
  total_due: number
  member_no?: string | null
  banks: DuesPayAccount[]
  wallets: { bkash: DuesPayAccount | null; nagad: DuesPayAccount | null }
}

export type DuesPayStart = {
  gateway_url: string
  tran_id: string
  amount: number
}

export type DuesPaySettle = {
  receipt_no: string
  amount: number
  outstanding: number
  tran_id?: string
  reference_no?: string
}

async function duesPost<T>(path: string, body: Record<string, unknown>) {
  const token = getDuesToken()
  if (!token) throw new Error('Dues session expired. Please verify again.')
  return apiRequest<T>(path, {
    method: 'POST',
    headers: { 'X-Dues-Token': token },
    body: JSON.stringify(body),
  })
}

export async function fetchDuesPayMethods() {
  return duesGet<DuesPayMethods>(`${BASE}/pay/methods`)
}

/** Redirect to SSLCommerz / bKash when club gateways are configured. */
export async function startDuesPay(input: { gateway?: string; pay_all_due?: boolean } = {}) {
  return duesPost<DuesPayStart>(`${BASE}/pay/start`, {
    pay_all_due: true,
    ...input,
  })
}

/**
 * Submit offline payment after paying to club bKash/Nagad/bank.
 * Requires TrxID / bank reference — never settles on method click alone.
 */
export async function settleDuesPay(channel: string, referenceNo: string) {
  return duesPost<DuesPaySettle>(`${BASE}/pay/settle`, {
    channel,
    reference_no: referenceNo.trim(),
  })
}

export function duesPhoto(url?: string | null) {
  return mediaUrl(url || '') || null
}

/** Download OTP-session statement PDF (same template as member portal). */
export async function downloadDuesStatementPdf(from?: string, to?: string): Promise<void> {
  const token = getDuesToken()
  if (!token) throw new ApiError('Dues session expired. Please verify again.', 401)

  const qs = [
    from ? `from=${encodeURIComponent(from)}` : '',
    to ? `to=${encodeURIComponent(to)}` : '',
  ].filter(Boolean).join('&')

  const url = `${baseURL}${BASE}/statement/pdf${qs ? `?${qs}` : ''}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
        'X-Dues-Token': token,
        'X-Portal-Domain': portalDomain,
      },
    })
  } catch {
    throw new ApiError('Could not reach the club server. Please check your connection and try again.', 0)
  }

  if (!res.ok) {
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
