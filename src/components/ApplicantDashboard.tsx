import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { applicantName, formCompletion, type ApplicantRecord } from '../data/application'
import { applicationFeeRows, fetchApplicationStatus, usePortalClubSettings } from '../lib/apply'
import { pathForPage } from '../lib/routing'
import { SITE_W } from '../lib/layout'

// ─── Applicant dashboard ──────────────────────────────────────────────────────
// A slimmer version of the member portal for people applying to join:
// Dashboard · Membership Form · Preview · Password Change · Logout.

const T = {
  ink900: '#0E1116', ink700: '#1C2330', ink600: '#2A3039', ink400: '#5C6673', ink200: '#A8B0BB', ink100: '#E2E6EC',
  surface0: '#FFFFFF', surface50: '#F7F8FA', surface100: '#EEF1F5',
  brand: '#E10B17', brand700: '#B70813', brandDim: '#FFF1F2',
  brass: '#B98B43', brassLight: '#F9F3E8',
  green: '#16A34A', greenDim: '#DCFCE7',
  amber: '#D97706', amberDim: '#FEF3C7',
}

export type ApplicantSection = 'dashboard' | 'form' | 'password'

const ICON = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const Icons = {
  dashboard: <svg {...ICON}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  form: <svg {...ICON}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>,
  preview: <svg {...ICON}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  lock: <svg {...ICON}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  logout: <svg {...ICON}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
}

// Same active/inactive treatment as the member portal sidebar
function navItemStyle(active: boolean): React.CSSProperties {
  return {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '0 14px', height: 46, borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${active ? T.ink100 : 'transparent'}`,
    background: active ? T.surface0 : 'transparent',
    boxShadow: active ? '0 2px 8px rgba(14,17,22,0.06)' : 'none',
    color: active ? T.brand : T.ink600,
    fontFamily: 'CKCL', fontSize: 14, fontWeight: active ? 600 : 400,
    transition: 'background 160ms, color 160ms', textAlign: 'left',
  }
}

function statusChipStyle(record: ApplicantRecord): { label: string; bg: string; color: string } {
  if (record.status !== 'submitted') {
    return { label: 'Draft', bg: T.surface100, color: T.ink400 }
  }
  const s = String(record.serverStatus || 'pending').toLowerCase()
  if (s === 'approved') return { label: 'Approved', bg: T.greenDim, color: T.green }
  if (s === 'rejected') return { label: 'Rejected', bg: T.brandDim, color: T.brand }
  if (s === 'under_review') return { label: 'Under review', bg: T.amberDim, color: T.amber }
  return { label: 'Pending review', bg: T.amberDim, color: T.amber }
}

function StatusChip({ record }: { record: ApplicantRecord }) {
  const s = statusChipStyle(record)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'CKCL', fontWeight: 600, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: s.color, background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }}/>{s.label}
    </span>
  )
}

function ApplicantAvatar({ record, size }: { record: ApplicantRecord; size: number }) {
  const name = applicantName(record.account)
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const photo = record.form.personal.photo
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${T.brass}`, overflow: 'hidden', background: T.surface100, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}/>
        : <span style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: size * 0.34, color: T.brass }}>{initials}</span>}
    </div>
  )
}

// ─── Overview blocks ──────────────────────────────────────────────────────────
const CARD: React.CSSProperties = { background: T.surface0, borderRadius: 14, border: `1px solid ${T.surface100}`, boxShadow: '0 1px 3px rgba(14,17,22,0.04)' }

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{ ...CARD, padding: '18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 12, marginBottom: 16, borderBottom: `1px solid ${T.ink100}` }}>
        <h2 style={{ margin: 0, fontFamily: 'CKCL', fontWeight: 600, fontSize: 16, color: T.ink700 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function DefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr)', gap: 12, padding: '9px 0', borderBottom: `1px solid ${T.surface100}`, alignItems: 'center' }}>
      <span style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400 }}>{label}</span>
      <span style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: T.ink900, overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  )
}

const linkBtn: React.CSSProperties = { fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.brand, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }

function overviewCopy(record: ApplicantRecord, done: number): { title: string; body: string; accent: string } {
  if (record.status !== 'submitted') {
    return {
      title: done === 0 ? 'Start your membership form.' : 'Finish your membership form.',
      body: 'Your answers save automatically, so you can come back and finish later.',
      accent: T.brand,
    }
  }
  const s = String(record.serverStatus || 'pending').toLowerCase()
  const submittedOn = record.submittedAt
    ? new Date(record.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const ref = record.reference ? `Reference ${record.reference}.` : ''
  if (s === 'approved') {
    return {
      title: 'Your membership has been approved.',
      body: [
        submittedOn ? `Submitted ${submittedOn}.` : null,
        ref,
        record.memberNo ? `Member no. ${record.memberNo}.` : null,
        record.canSignIn ? 'Sign in to the member portal with your applicant email and password.' : 'The club office will help you access the member portal.',
      ].filter(Boolean).join(' '),
      accent: T.green,
    }
  }
  if (s === 'rejected') {
    return {
      title: 'Your application was not approved.',
      body: [ref, record.rejectedReason ? `Reason: ${record.rejectedReason}` : 'Please contact the club office for details.'].filter(Boolean).join(' '),
      accent: T.brand,
    }
  }
  if (s === 'under_review') {
    return {
      title: 'Your application is under review.',
      body: `Submitted ${submittedOn} · ${ref} We'll email you after the committee decides.`,
      accent: T.amber,
    }
  }
  return {
    title: 'Your application is with the committee.',
    body: `Submitted ${submittedOn} · ${ref} We'll email you after the review.`,
    accent: T.amber,
  }
}

function Overview({ record, onSection, onPreview }: { record: ApplicantRecord; onSection: (s: ApplicantSection) => void; onPreview: () => void }) {
  const a = record.account
  const done = formCompletion(record.form)
  const submitted = record.status === 'submitted'
  const server = String(record.serverStatus || '').toLowerCase()
  const approved = submitted && server === 'approved'
  const copy = overviewCopy(record, done)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div className="eyebrow" style={{ fontSize: 11, color: T.brass, marginBottom: 6 }}>APPLICANT DASHBOARD</div>
        <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(22px,2.2vw,28px)', color: T.ink900, margin: 0, letterSpacing: '-0.01em' }}>Welcome, {a.givenName}.</h1>
      </div>

      {/* Next step */}
      <div style={{ ...CARD, padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, borderLeft: `3px solid ${copy.accent}` }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 16, color: T.ink900 }}>{copy.title}</div>
          <div style={{ fontFamily: 'CKCL', fontSize: 13.5, color: T.ink400, marginTop: 4, lineHeight: 1.55 }}>{copy.body}</div>
          {!submitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1, maxWidth: 320, height: 6, borderRadius: 999, background: T.surface100, overflow: 'hidden' }}>
                <div style={{ width: `${done}%`, height: '100%', background: T.brand, borderRadius: 999, transition: 'width 400ms' }}/>
              </div>
              <span style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.ink600 }}>{done}% complete</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onPreview} style={{ height: 42, padding: '0 18px', borderRadius: 999, border: `1.5px solid ${T.ink100}`, background: T.surface0, fontFamily: 'CKCL', fontSize: 13.5, fontWeight: 600, color: T.ink700, cursor: 'pointer' }}>Preview</button>
          {approved && record.canSignIn ? (
            <a href={pathForPage('member-login')} style={{ height: 42, padding: '0 20px', borderRadius: 999, border: 'none', background: T.brand, fontFamily: 'CKCL', fontSize: 13.5, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              Open member portal
            </a>
          ) : null}
          {!submitted && (
            <button onClick={() => onSection('form')} style={{ height: 42, padding: '0 20px', borderRadius: 999, border: 'none', background: T.brand, fontFamily: 'CKCL', fontSize: 13.5, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
              {done === 0 ? 'Start form' : 'Continue form'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5 items-start">
        <SectionCard title="Personal Information" action={!submitted ? <button style={linkBtn} onClick={() => onSection('form')}>Edit</button> : undefined}>
          <DefRow label="Name">{applicantName(a)}</DefRow>
          <DefRow label="Contact No">{record.form.personal.phone || a.mobile}</DefRow>
          <DefRow label="Email">{a.email}</DefRow>
          <DefRow label="Category">{record.form.category || <span style={{ color: T.ink200, fontWeight: 400 }}>Not selected yet</span>}</DefRow>
        </SectionCard>

        <PaymentInfo membershipTypeId={record.form.membership_type_id} />
      </div>
    </div>
  )
}

/** Registration fee + the chosen category's fees, both from club/club-portal/settings. */
function PaymentInfo({ membershipTypeId }: { membershipTypeId: string }) {
  const { data: settings, loading, error } = usePortalClubSettings()
  const type = settings?.membership_types?.find((t) => t.id === membershipTypeId)
  const { rows, total } = applicationFeeRows(settings?.registration_fee, type?.fees)
  const bdt = (n: number) => `BDT ${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
  const muted = { color: T.ink200, fontWeight: 400 }

  return (
    <SectionCard title="Payment Info">
      {loading && !settings ? (
        <DefRow label="Fees"><span style={muted}>Loading…</span></DefRow>
      ) : error && !settings ? (
        <DefRow label="Fees"><span style={muted}>Could not load fees</span></DefRow>
      ) : (
        <>
          {rows.map((r, i) => (
            <DefRow key={i} label={r.when === 'application' ? `${r.label} (with application)` : r.label}>{bdt(r.amount)}</DefRow>
          ))}
          {!type && <DefRow label="Category fees"><span style={muted}>Select a category to see fees</span></DefRow>}
          {rows.length > 0 && <DefRow label="Total">{bdt(total)}</DefRow>}
        </>
      )}
      <DefRow label="Payment status"><span style={{ color: T.amber }}>Not paid</span></DefRow>
      <p style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, lineHeight: 1.55, margin: '12px 0 0' }}>
        The club office will send payment details once your form has been reviewed.
      </p>
    </SectionCard>
  )
}

// ─── Password change ──────────────────────────────────────────────────────────
function PasswordChange({ record, onChangePassword }: { record: ApplicantRecord; onChangePassword: (pw: string) => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const reqs = [
    { label: 'At least 8 characters', met: next.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(next) },
    { label: 'One number', met: /\d/.test(next) },
  ]
  const valid = current && reqs.every((r) => r.met) && next === confirm

  const submit = () => {
    if (current !== record.account.password) { setError('Your current password is incorrect.'); return }
    onChangePassword(next)
    setDone(true)
  }

  const input = (label: string, value: string, set: (v: string) => void, invalid = false) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.ink700 }}>{label}</span>
      <input
        type={show ? 'text' : 'password'} value={value} onChange={(e) => { set(e.target.value); setError('') }}
        style={{ width: '100%', height: 48, padding: '0 14px', fontFamily: 'CKCL', fontSize: 15, color: T.ink900, background: T.surface0, border: `1.5px solid ${invalid ? T.brand : T.ink100}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
      />
    </label>
  )

  if (done) {
    return (
      <div style={{ ...CARD, maxWidth: 520, padding: '44px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.greenDim, color: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 21, color: T.ink900 }}>Password updated</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400 }}>Use your new password next time you log in.</div>
      </div>
    )
  }

  return (
    <div style={{ ...CARD, maxWidth: 520, padding: 'clamp(22px,3vw,32px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {input('Current password', current, setCurrent, !!error)}
      {input('New password', next, setNext)}
      {input('Confirm new password', confirm, setConfirm, confirm.length > 0 && confirm !== next)}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'CKCL', fontSize: 13, color: T.ink600, cursor: 'pointer' }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} style={{ accentColor: T.brand }}/> Show passwords
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {reqs.map((r) => (
          <span key={r.label} style={{ fontFamily: 'CKCL', fontSize: 12, color: r.met ? T.green : T.ink200 }}>{r.met ? '✓' : '•'} {r.label}</span>
        ))}
        {confirm.length > 0 && confirm !== next && <span style={{ fontFamily: 'CKCL', fontSize: 12, color: T.brand }}>Passwords do not match.</span>}
        {error && <span role="alert" style={{ fontFamily: 'CKCL', fontSize: 12, color: T.brand }}>{error}</span>}
      </div>

      <button
        onClick={submit} disabled={!valid}
        style={{ height: 46, borderRadius: 10, border: 'none', background: valid ? T.brand : T.surface100, fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: valid ? '#FFFFFF' : T.ink200, cursor: valid ? 'pointer' : 'not-allowed' }}
      >
        Update password
      </button>
    </div>
  )
}

// ─── Logout confirmation ──────────────────────────────────────────────────────
function LogoutModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,17,22,0.55)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onCancel}>
      <div role="dialog" aria-modal="true" style={{ background: T.surface0, borderRadius: 20, padding: '32px 28px', maxWidth: 380, width: '100%', boxShadow: '0 24px 64px rgba(14,17,22,0.18)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: T.brandDim, color: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{Icons.logout}</div>
        <h3 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: T.ink900, margin: '0 0 8px' }}>Log out?</h3>
        <p style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, margin: '0 0 24px', lineHeight: 1.6 }}>Your membership form is saved. Log in again with your email and password to continue.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 44, borderRadius: 10, border: `1.5px solid ${T.ink100}`, background: T.surface0, fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: T.ink700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: T.brand, fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>Log out</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────
type NavId = ApplicantSection | 'preview'

// `short`: label in the phone tab bar, where four full labels don't fit
const NAV: { id: NavId; label: string; short: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Dashboard', icon: Icons.dashboard },
  { id: 'form', label: 'Membership Form', short: 'Form', icon: Icons.form },
  { id: 'preview', label: 'Preview', short: 'Preview', icon: Icons.preview },
  { id: 'password', label: 'Password Change', short: 'Password', icon: Icons.lock },
]

// ─── Bottom tab bar (phones / tablets) — same look as the member portal's ─────
const TAB_BAR_H = 68

const TAB_ICONS: Record<NavId, (active: boolean) => React.ReactNode> = {
  dashboard: (a) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M3.5 10.2L12 3.5l8.5 6.7V19a1.5 1.5 0 01-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 013.5 19z"/>
    </svg>
  ),
  form: (a) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2.5H6.5a2 2 0 00-2 2v15a2 2 0 002 2h11a2 2 0 002-2V8z" fill={a ? 'currentColor' : 'none'}/>
      <polyline points="14 2.5 14 8 19.5 8"/>
      <line x1="8.5" y1="13" x2="15.5" y2="13" stroke={a ? '#FFFFFF' : 'currentColor'}/>
      <line x1="8.5" y1="17" x2="13" y2="17" stroke={a ? '#FFFFFF' : 'currentColor'}/>
    </svg>
  ),
  preview: (a) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z" fill={a ? 'currentColor' : 'none'}/>
      <circle cx="12" cy="12" r="3" fill={a ? '#FFFFFF' : 'none'}/>
    </svg>
  ),
  password: (a) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="10.5" width="17" height="11" rx="2.5" fill={a ? 'currentColor' : 'none'}/>
      <path d="M7.5 10.5V7a4.5 4.5 0 019 0v3.5"/>
      <circle cx="12" cy="16" r="1.4" fill={a ? '#FFFFFF' : 'currentColor'} stroke="none"/>
    </svg>
  ),
}

function ApplicantTabBar({ section, onSelect }: { section: ApplicantSection; onSelect: (id: NavId) => void }) {
  const idx = NAV.findIndex((t) => t.id === section)

  return (
    <nav
      id="applicant-tab-bar"
      aria-label="Applicant dashboard"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'linear-gradient(180deg, rgba(236,214,216,0.78) 0%, rgba(246,240,241,0.86) 100%)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderTop: '1px solid rgba(255,255,255,0.55)',
        boxShadow: '0 -6px 24px rgba(14,17,22,0.08)',
      }}
    >
      {/* Tron-style light trails racing along the top edge, in opposite directions */}
      <style>{`
        .tabbar-tron { position:absolute; left:0; right:0; top:-9px; height:18px; overflow:hidden; pointer-events:none; }
        .tabbar-tron::before, .tabbar-tron::after {
          content:''; position:absolute; top:8px; height:2px; width:38%; border-radius:2px;
          animation: tron-run 3.2s linear infinite;
        }
        .tabbar-tron::before {
          background: linear-gradient(90deg, transparent, rgba(225,11,23,0.7) 70%, #FF5A63 94%, #FFFFFF);
          filter: drop-shadow(0 0 3px #E10B17) drop-shadow(0 0 7px rgba(225,11,23,0.75));
        }
        .tabbar-tron::after {
          background: linear-gradient(270deg, transparent, rgba(185,139,67,0.7) 70%, #E8C584 94%, #FFFFFF);
          filter: drop-shadow(0 0 3px #B98B43) drop-shadow(0 0 7px rgba(232,197,132,0.75));
          animation-name: tron-run-back; animation-duration: 4.4s;
        }
        @keyframes tron-run { from { left:-38%; } to { left:100%; } }
        @keyframes tron-run-back { from { left:100%; } to { left:-38%; } }
        @media (prefers-reduced-motion: reduce) { .tabbar-tron { display:none; } }
      `}</style>
      <div aria-hidden className="tabbar-tron"/>

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${NAV.length}, 1fr)`, height: TAB_BAR_H, maxWidth: 640, margin: '0 auto' }}>
        {/* Active marker — slides along the top edge */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0, width: `${100 / NAV.length}%`, height: 3,
            display: 'flex', justifyContent: 'center',
            transform: `translateX(${idx * 100}%)`,
            transition: 'transform 320ms cubic-bezier(0.34, 1.25, 0.64, 1)',
          }}
        >
          <span style={{ width: 44, height: 3, borderRadius: '0 0 3px 3px', background: T.brand }}/>
        </div>

        {NAV.map((tab) => {
          const active = tab.id === section
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 0',
                color: active ? T.brand : '#6B6F76',
                fontFamily: 'CKCL', fontSize: 12, fontWeight: active ? 600 : 500,
                transition: 'color 200ms',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ display: 'flex', transform: active ? 'translateY(-1px)' : 'none', transition: 'transform 200ms' }}>{TAB_ICONS[tab.id](active)}</span>
              {tab.short}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function ApplicantDashboard({
  record, section, onSection, onPreview, onLogout, onChangePassword, onRecordChange, formSlot,
}: {
  record: ApplicantRecord
  section: ApplicantSection
  onSection: (s: ApplicantSection) => void
  onPreview: () => void
  onLogout: () => void
  onChangePassword: (pw: string) => void
  onRecordChange?: (r: ApplicantRecord) => void
  formSlot: React.ReactNode
}) {
  const [confirmLogout, setConfirmLogout] = useState(false)
  const name = applicantName(record.account)
  const select = (id: NavId) => (id === 'preview' ? onPreview() : onSection(id))

  // localStorage stays "submitted"; refresh live club status so approve/reject shows correctly.
  useEffect(() => {
    if (record.status !== 'submitted' || !record.reference || !onRecordChange) return
    let alive = true
    const phone = record.form.personal.phone || record.account.mobile
    fetchApplicationStatus(record.reference, phone)
      .then((res) => {
        if (!alive) return
        if (
          res.status === record.serverStatus &&
          res.member_no === record.memberNo &&
          res.can_sign_in === record.canSignIn &&
          (res.rejected_reason || null) === (record.rejectedReason || null)
        ) {
          return
        }
        onRecordChange({
          ...record,
          serverStatus: res.status,
          memberNo: res.member_no ?? null,
          rejectedReason: res.rejected_reason ?? null,
          canSignIn: Boolean(res.can_sign_in),
        })
      })
      .catch(() => { /* keep last known chip */ })
    return () => { alive = false }
  }, [record.status, record.reference, record.form.personal.phone, record.account.mobile]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ maxWidth: SITE_W, margin: '0 auto', padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,48px) 0' }}>
      {/* Bottom tab bar replaces the sidebar below 1024px; keep the page and the form's step bar clear of it */}
      <style>{`
        @media (min-width:1024px) { #applicant-tab-bar { display:none !important; } }
        @media (max-width:1023px) {
          body { padding-bottom: calc(${TAB_BAR_H}px + env(safe-area-inset-bottom)); }
          #form-footer-bar { bottom: calc(${TAB_BAR_H}px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">

        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex" style={{ ...CARD, position: 'sticky', top: 104, flexDirection: 'column', padding: '24px 14px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '0 8px 20px', textAlign: 'center' }}>
            <ApplicantAvatar record={record} size={76}/>
            <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 17, color: T.brand, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.25 }}>{name}</div>
            <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, overflowWrap: 'anywhere' }}>{record.account.email}</div>
            <StatusChip record={record}/>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${T.ink100}`, paddingTop: 14 }}>
            {NAV.map((item) => {
              const active = item.id === section
              return (
                <button
                  key={item.id} onClick={() => select(item.id)} style={navItemStyle(active)} aria-current={active ? 'page' : undefined}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = T.surface50 }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ display: 'flex', color: active ? T.brand : T.ink400 }}>{item.icon}</span>{item.label}
                </button>
              )
            })}
            <div style={{ height: 1, background: T.ink100, margin: '8px 0' }}/>
            <button
              onClick={() => setConfirmLogout(true)} style={navItemStyle(false)}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = T.brandDim; el.style.color = T.brand700 }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = T.ink600 }}
            >
              <span style={{ display: 'flex' }}>{Icons.logout}</span>Logout
            </button>
          </nav>
        </aside>

        <div style={{ minWidth: 0 }}>
          {/* Phones / tablets: identity row (sections are in the bottom tab bar) */}
          <div className="lg:hidden" style={{ marginBottom: 20 }}>
            <div style={{ ...CARD, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ApplicantAvatar record={record} size={48}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 15, color: T.brand, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <div style={{ marginTop: 4 }}><StatusChip record={record}/></div>
              </div>
              <button onClick={() => setConfirmLogout(true)} aria-label="Logout" style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${T.ink100}`, background: T.surface0, color: T.ink600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>{Icons.logout}</button>
            </div>
          </div>

          {section === 'dashboard' && <Overview record={record} onSection={onSection} onPreview={onPreview}/>}
          {section === 'form' && formSlot}
          {section === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 48 }}>
              <div>
                <div className="eyebrow" style={{ fontSize: 11, color: T.brass, marginBottom: 6 }}>ACCOUNT</div>
                <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(22px,2.2vw,28px)', color: T.ink900, margin: 0 }}>Password change</h1>
              </div>
              <PasswordChange record={record} onChangePassword={onChangePassword}/>
            </div>
          )}
        </div>
      </div>

      <ApplicantTabBar section={section} onSelect={select}/>
      {confirmLogout && <LogoutModal onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); onLogout() }}/>}
    </div>
  )
}
