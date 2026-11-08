/**
 * Public membership application APIs:
 *   GET  /club/club-portal/settings
 *   GET  /club/club-portal/proposers?q=
 *   GET  /club/club-portal/bank-accounts
 *   POST /club/club-portal/check-applicant
 *   POST /club/club-portal/apply
 *   POST /club/club-portal/application-status
 */
import { apiGet, apiPost, ApiError } from './api/client'
import { useApi } from './useApi'
import type { Address, ApplicantAccount, ApplicationForm } from '../data/application'

const BASE = 'club/club-portal'

export type PortalMembershipType = {
  id: string
  name: string
  description?: string | null
  max_dependents?: number | null
  fees?: { name: string; amount: number; billing: string }[]
}

export type PortalBankAccount = {
  id: string
  bank_name: string
  branch_name?: string | null
  account_name: string
  account_no: string
  routing_no?: string | null
  logo_url?: string | null
  notes?: string | null
}

export type PortalClubSettings = {
  club_name?: string | null
  allow_online_application?: boolean
  /** One-time fee paid with the application (club settings). 0 = none. */
  registration_fee?: number
  membership_types?: PortalMembershipType[]
  bank_accounts?: PortalBankAccount[]
}

export type PortalProposer = {
  id: string
  member_no: string
  name: string
}

export type ApplyResult = {
  application_no: string
  status: string
}

export type ApplicantAvailability = {
  available: boolean
  application_no?: string | null
  status?: string | null
}

export type ApplicationStatusResult = {
  application_no: string
  applied_at?: string | null
  status: string
  member_no?: string | null
  rejected_reason?: string | null
  can_sign_in?: boolean
}

export async function fetchPortalClubSettings() {
  return apiGet<PortalClubSettings>(`${BASE}/settings`)
}

/** Cached club-portal settings (membership types + fees, registration fee, banks). */
export function usePortalClubSettings() {
  return useApi<PortalClubSettings>(`${BASE}/settings`)
}

export type ApplicationFeeRow = { label: string; amount: number; when: 'application' | 'approval' }

/**
 * Fees for an application: the registration fee (paid with the form) plus the chosen
 * category's fee schedule (due on approval). Category fees are empty until one is chosen.
 */
export function applicationFeeRows(
  registrationFee: number | null | undefined,
  fees: PortalMembershipType['fees'] | null | undefined,
): { rows: ApplicationFeeRow[]; total: number } {
  const rows: ApplicationFeeRow[] = []
  const reg = Number(registrationFee) || 0
  if (reg > 0) rows.push({ label: 'Registration fee', amount: reg, when: 'application' })
  for (const f of fees || []) {
    rows.push({
      label: f.billing && f.billing !== 'one_time' ? `${f.name} (${f.billing})` : f.name,
      amount: Number(f.amount) || 0,
      when: 'approval',
    })
  }
  return { rows, total: rows.reduce((s, r) => s + r.amount, 0) }
}

export async function fetchPublicBankAccounts() {
  return apiGet<{ account_name?: string; banks: PortalBankAccount[] }>(`${BASE}/bank-accounts`)
}

export async function searchProposers(q: string) {
  const query = q.trim()
  if (query.length < 2) return [] as PortalProposer[]
  return apiGet<PortalProposer[]>(`${BASE}/proposers`, { q: query })
}

export async function checkApplicantAvailability(input: { email?: string; phone?: string }) {
  return apiPost<ApplicantAvailability>(`${BASE}/check-applicant`, input)
}

export async function fetchApplicationStatus(applicationNo: string, phone: string) {
  return apiPost<ApplicationStatusResult>(`${BASE}/application-status`, {
    application_no: applicationNo,
    phone,
  })
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl)
    if (!m) return null
    const mime = m[1]
    const bin = atob(m[2])
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const ext = mime.includes('png') ? 'png' : mime.includes('pdf') ? 'pdf' : 'jpg'
    return new File([bytes], `${filename}.${ext}`, { type: mime })
  } catch {
    return null
  }
}

function genderOf(sex?: string): string | undefined {
  const s = String(sex || '').toLowerCase()
  if (s.startsWith('m')) return 'male'
  if (s.startsWith('f')) return 'female'
  if (!s) return undefined
  return 'other'
}

function maritalOf(raw?: string): string | undefined {
  const s = String(raw || '').toLowerCase()
  if (['single', 'married', 'divorced', 'widowed'].includes(s)) return s
  return undefined
}

function childRelation(sex?: string): 'son' | 'daughter' | 'other' {
  const g = genderOf(sex)
  if (g === 'male') return 'son'
  if (g === 'female') return 'daughter'
  return 'other'
}

function append(fd: FormData, key: string, value: string | Blob | null | undefined) {
  if (value === null || value === undefined || value === '') return
  fd.append(key, value as string | Blob)
}

/** Single-line address for storage / admin review. */
function joinAddress(a: Address): string {
  return [a.address, a.policeStation && `PS: ${a.policeStation}`, a.postOffice && `PO: ${a.postOffice}`, a.postalCode, a.district, a.country]
    .filter(Boolean)
    .join(', ')
}

/**
 * Build multipart body expected by ClubPortalPublicController::apply.
 */
export function buildApplicationFormData(account: ApplicantAccount, form: ApplicationForm): FormData {
  const fd = new FormData()
  const p = form.personal
  const first = account.givenName.trim() || p.fullName.trim().split(/\s+/)[0] || 'Applicant'
  const last =
    account.surname.trim() ||
    (p.fullName.trim().split(/\s+/).length > 1 ? p.fullName.trim().split(/\s+/).slice(1).join(' ') : '')

  append(fd, 'first_name', first)
  append(fd, 'last_name', last)
  append(fd, 'father_name', p.fatherName)
  append(fd, 'mother_name', p.motherName)
  append(fd, 'marital_status', maritalOf(p.maritalStatus))
  append(fd, 'spouse_name', p.spouseName)
  append(fd, 'anniversary_date', p.anniversary)
  append(fd, 'date_of_birth', p.dob)
  append(fd, 'place_of_birth', p.birthPlace)
  append(fd, 'phone', p.phone || account.mobile)
  append(fd, 'alt_phone', p.tel)
  append(fd, 'email', (p.email || account.email).trim().toLowerCase())
  append(fd, 'nationality', p.nationality)
  append(fd, 'blood_group', p.bloodGroup)
  append(fd, 'national_id', p.nidNo)
  append(fd, 'passport_no', p.passportNo)
  append(fd, 'e_tin_no', p.etin)
  append(fd, 'qualification', p.education)
  append(fd, 'institute', p.institution)
  append(fd, 'profession', form.professional.profession)
  append(fd, 'designation', form.professional.designation)
  append(fd, 'company', form.professional.company)
  {
    const office = form.professional.address
    if (office.address || office.policeStation || office.postOffice || office.district || office.postalCode) {
      append(fd, 'office_address', joinAddress(office))
    }
  }

  append(fd, 'present_address', form.present.address)
  append(fd, 'police_station', form.present.policeStation)
  append(fd, 'post_office', form.present.postOffice)
  append(fd, 'postal_code', form.present.postalCode)
  append(fd, 'district', form.present.district)
  append(fd, 'country', form.present.country || 'Bangladesh')
  append(
    fd,
    'permanent_address',
    joinAddress(form.sameAsPresent ? form.present : form.permanent),
  )

  append(fd, 'membership_type_id', form.membership_type_id)
  append(fd, 'proposer_name', form.proposer.name)
  append(fd, 'proposer_member_no', form.proposer.memberId)

  append(fd, 'password', account.password)
  append(fd, 'password_confirmation', account.password)
  append(fd, 'accept_terms', form.agreed ? '1' : '0')

  form.children.forEach((c, i) => {
    if (!c.name.trim()) return
    append(fd, `dependents[${i}][name]`, c.name)
    append(fd, `dependents[${i}][relation]`, childRelation(c.sex))
    append(fd, `dependents[${i}][gender]`, genderOf(c.sex))
    append(fd, `dependents[${i}][date_of_birth]`, c.dob)
    append(fd, `dependents[${i}][occupation]`, c.occupation)
  })

  if (form.nominee.name.trim()) {
    append(fd, 'nominees[0][name]', form.nominee.name)
    append(fd, 'nominees[0][relation]', form.nominee.relation || 'other')
    append(fd, 'nominees[0][date_of_birth]', form.nominee.dob)
    append(fd, 'nominees[0][email]', form.nominee.email)
    append(fd, 'nominees[0][national_id]', form.nominee.nidNo)
    append(fd, 'nominees[0][passport_no]', form.nominee.passportNo)
    append(fd, 'nominees[0][occupation]', form.nominee.occupation)
    append(fd, 'nominees[0][phone]', form.nominee.phone)
    append(fd, 'nominees[0][share_percent]', '100')
    if (form.nominee.photo) {
      const nomineePhoto = dataUrlToFile(form.nominee.photo, 'nominee-photo')
      if (nomineePhoto) fd.append('nominees[0][photo]', nomineePhoto)
    }
  }

  form.otherClubs.forEach((c, i) => {
    if (!c.name.trim()) return
    append(fd, `other_clubs[${i}][club_name]`, c.name)
    append(fd, `other_clubs[${i}][membership_type]`, c.type)
    append(fd, `other_clubs[${i}][since_year]`, c.year)
  })

  if (p.photo) {
    const file = dataUrlToFile(p.photo, 'photo')
    if (file) fd.append('photo', file)
  }

  let di = 0
  const docs: { type: string; data: string | null; name: string }[] = [
    { type: 'nid', data: form.documents.nidCopy, name: 'nid' },
    { type: 'photo', data: form.documents.photos, name: 'photos' },
    { type: 'other', data: form.documents.tradeLicence, name: 'trade-licence' },
  ]
  for (const d of docs) {
    if (!d.data) continue
    const file = dataUrlToFile(d.data, d.name)
    if (!file) continue
    append(fd, `documents[${di}][type]`, d.type)
    fd.append(`documents[${di}][file]`, file)
    di++
  }

  return fd
}

export async function submitPortalApplication(account: ApplicantAccount, form: ApplicationForm): Promise<ApplyResult> {
  if (!form.membership_type_id) {
    throw new ApiError('Choose a membership category.', 422)
  }
  if (!form.agreed) {
    throw new ApiError('You must accept the declaration to submit.', 422)
  }
  const fd = buildApplicationFormData(account, form)
  return apiPost<ApplyResult>(`${BASE}/apply`, fd)
}
