import { useState, useRef, useEffect } from 'react'
import Footer from './Footer'
import SubTabs from './SubTabs'
import { useReports, type Report } from '../lib/resources'
import { useSiteInfo } from '../lib/siteInfo'
import { usePortalClubSettings } from '../lib/apply'
import {
  downloadDuesStatementPdf,
  duesPhoto,
  fetchDuesPayMethods,
  fetchDuesStatement,
  fetchDuesSummary,
  lookupDuesMembers,
  sendDuesOtp,
  setDuesToken,
  settleDuesPay,
  startDuesPay,
  verifyDuesOtp,
  type DuesMemberHit,
  type DuesPayAccount,
} from '../lib/dues'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink900: '#0E1116', ink600: '#2A3039', ink400: '#5C6673', ink200: '#A8B0BB', ink100: '#E2E6EC',
  surface50: '#F7F8FA', surface100: '#EEF1F5',
  brand: '#E10B17', brandDim: '#FFF1F2',
  brass: '#B98B43', brassDim: '#FFF7E6',
  green: '#16A34A', greenDim: '#DCFCE7',
  amber: '#D97706', amberDim: '#FFFBEB',
  blue: '#1D4ED8', blueDim: '#EFF6FF',
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type ResourceTab = 'reports' | 'dues'
const TABS: { id: ResourceTab; label: string }[] = [
  { id: 'reports', label: 'Annual Reports' },
  { id: 'dues',    label: 'Club Dues' },
]

function StateBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '64px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.ink100}`, fontFamily: 'CKCL', fontSize: 15, color: T.ink400 }}>
      {children}
    </div>
  )
}

// ─── PDF / report viewer ──────────────────────────────────────────────────────
function ReportViewer({ report, onClose }: { report: Report; onClose: () => void }) {
  const site = useSiteInfo()
  const clubName = site.club_name || site.short_name || 'Club'
  const hasFile = Boolean(report.file_url)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(14,17,22,0.90)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.title}</div>
          <div style={{ fontFamily: 'CKCL', fontSize: 10, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
            {[report.pages ? `${report.pages} pages` : null, report.size || null, report.publishedDate || null].filter(Boolean).join(' · ')}
          </div>
        </div>
        {report.file_url && (
          <a href={report.file_url} download target="_blank" rel="noopener noreferrer" title="Download" style={overlayBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
        )}
        <button onClick={onClose} style={overlayBtn}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: hasFile ? 'stretch' : 'flex-start', justifyContent: 'center', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        {hasFile ? (
          <iframe
            src={report.file_url!}
            title={report.title}
            style={{ width: '100%', maxWidth: 960, border: 'none', borderRadius: 10, background: '#FFFFFF', boxShadow: '0 20px 64px rgba(0,0,0,0.40)' }}
          />
        ) : (
          <div style={{ width: '100%', maxWidth: 720, minWidth: 280, background: '#FFFFFF', borderRadius: 10, boxShadow: '0 20px 64px rgba(0,0,0,0.40)', padding: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${T.brand}`, paddingBottom: 20, marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: T.ink900 }}>{clubName}</div>
                <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, marginTop: 2 }}>{report.title}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 28, color: T.ink900, lineHeight: 1.15 }}>{report.title}</div>
              {report.subtitle && <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, lineHeight: 1.65 }}>{report.subtitle}</div>}
              {report.cover && <img src={report.cover} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />}
              <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, marginTop: 8 }}>
                The PDF for this report has not been uploaded yet. Please check back later or contact the club office.
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '8px', textAlign: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'CKCL', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Press ESC to close</span>
      </div>
    </div>
  )
}

// ─── Annual Reports Section ───────────────────────────────────────────────────
function ReportsSection() {
  const [viewing, setViewing] = useState<Report | null>(null)
  const { data, error, loading, reload } = useReports()

  if (!data) {
    return loading ? (
      <StateBox>
        <div style={{ width: 28, height: 28, margin: '0 auto 12px', borderRadius: '50%', border: `3px solid ${T.ink100}`, borderTopColor: T.brand, animation: 'spin 0.8s linear infinite' }} />
        Loading reports…
      </StateBox>
    ) : (
      <StateBox>
        <div style={{ marginBottom: 14 }}>{error || 'Could not load reports.'}</div>
        <button onClick={reload} style={{ padding: '9px 18px', fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: T.brand, border: 'none', borderRadius: 999, cursor: 'pointer' }}>Try again</button>
      </StateBox>
    )
  }

  const featured = data.featured
  const rest = data.reports
  if (!featured) return <StateBox>No annual reports have been published yet.</StateBox>

  const metaBits = (r: Report) =>
    [
      r.pages ? { label: `${r.pages} pages` } : null,
      r.size ? { label: r.size } : null,
    ].filter(Boolean) as { label: string }[]

  return (
    <>
      {viewing && <ReportViewer report={viewing} onClose={() => setViewing(null)} />}

      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 24,
          border: `1px solid rgba(185,139,67,0.30)`,
          overflow: 'hidden',
          marginBottom: 40,
          boxShadow: '0 4px 20px rgba(14,17,22,0.08)',
        }}
        className="grid grid-cols-1 sm:grid-cols-[200px_1fr]"
      >
        <div className="h-44 sm:h-auto" style={{ position: 'relative', overflow: 'hidden', background: T.surface100 }}>
          {featured.cover && <img src={featured.cover} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent, rgba(14,17,22,0.06))' }} />
        </div>

        <div style={{ padding: 'clamp(20px,3vw,40px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'CKCL', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: T.brass, background: T.brassDim, border: `1px solid ${T.brass}40`, borderRadius: 999, padding: '4px 10px' }}>LATEST REPORT</span>
            {featured.publishedDate && <span className="eyebrow" style={{ fontSize: 10, color: T.ink200 }}>{featured.publishedDate}</span>}
          </div>

          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(20px,2.5vw,30px)', color: T.ink900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{featured.title}</div>
          {featured.subtitle && <p style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, lineHeight: 1.65, margin: 0, maxWidth: 520 }}>{featured.subtitle}</p>}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            {metaBits(featured).length > 0 && (
              <div style={{ display: 'flex', gap: 16 }}>
                {metaBits(featured).map((m) => (
                  <div key={m.label} style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400 }}>{m.label}</div>
                ))}
              </div>
            )}

            <div className="w-full sm:w-auto sm:ml-auto" style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setViewing(featured)}
                className="flex-1 sm:flex-none"
                style={{ whiteSpace: 'nowrap', padding: '10px 20px', fontFamily: 'CKCL', fontSize: 13, fontWeight: 700, color: '#FFFFFF', background: T.brand, border: 'none', borderRadius: 999, cursor: 'pointer', transition: 'background 160ms' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.brand }}
              >
                View Report
              </button>
              {featured.file_url && (
                <a
                  href={featured.file_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none"
                  style={{ whiteSpace: 'nowrap', padding: '10px 16px', fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.ink600, background: T.surface100, border: `1px solid ${T.ink100}`, borderRadius: 999, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {rest.length > 0 && (
        <>
          <div className="eyebrow mb-4" style={{ fontSize: 10, color: T.brass }}>PREVIOUS REPORTS</div>
          <div style={{ background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.ink100}`, overflow: 'hidden' }}>
            {rest.map((report, i) => (
              <div
                key={`${report.id}-${report.title}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '18px 24px',
                  borderBottom: i < rest.length - 1 ? `1px solid ${T.ink100}` : 'none',
                  transition: 'background 140ms',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.surface50 }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <div
                  style={{
                    width: 72, height: 52,
                    background: T.surface100,
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 13, color: T.ink900, letterSpacing: '-0.01em', textAlign: 'center', padding: '0 4px', lineHeight: 1.15 }}>{report.year}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 14, color: T.ink900, marginBottom: 3 }}>{report.title}</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {report.pages > 0 && <span style={{ fontFamily: 'CKCL', fontSize: 10, color: T.ink200 }}>{report.pages} pp</span>}
                    {report.size && <span style={{ fontFamily: 'CKCL', fontSize: 10, color: T.ink200 }}>{report.size}</span>}
                    {report.publishedDate && <span style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200 }}>Published {report.publishedDate}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setViewing(report)}
                    style={{ padding: '8px 16px', fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.brand, background: T.brandDim, border: `1px solid rgba(225,11,23,0.20)`, borderRadius: 8, cursor: 'pointer', transition: 'all 140ms' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.brand; (e.currentTarget as HTMLElement).style.color = '#FFFFFF' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.brandDim; (e.currentTarget as HTMLElement).style.color = T.brand }}
                  >
                    View
                  </button>
                  {report.file_url && (
                    <a
                      href={report.file_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ width: 34, height: 34, borderRadius: 8, background: T.surface100, border: `1px solid ${T.ink100}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink400 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUB LIVE_DUES DATA
// ═══════════════════════════════════════════════════════════════════════════════
type DueStatus = 'Paid' | 'Overdue' | 'Upcoming'
type DueEntry = {
  id: number; period: string; description: string; amount: number; dueDate: string; paidDate?: string; status: DueStatus
}

// Live dues rows are loaded after OTP via /club/club-portal/dues/*
let LIVE_DUES: DueEntry[] = []
let LIVE_OUTSTANDING = 0

type PayMethod = 'card' | 'bkash' | 'nagad' | 'bank'
const PAY_METHODS: { id: PayMethod; label: string; icon: React.ReactNode }[] = [
  {
    id: 'card', label: 'Card',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
  {
    id: 'bkash', label: 'bKash',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#E2136E" opacity=".12"/><text x="12" y="16" textAnchor="middle" fontSize="9" fontFamily="CKCL" fontWeight="700" fill="#E2136E">bK</text></svg>,
  },
  {
    id: 'nagad', label: 'Nagad',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#F26522" opacity=".12"/><text x="12" y="16" textAnchor="middle" fontSize="8" fontFamily="CKCL" fontWeight="700" fill="#F26522">N</text></svg>,
  },
  {
    id: 'bank', label: 'Bank Transfer',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  },
]

// ─── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: DueStatus }) {
  const styles: Record<DueStatus, { bg: string; color: string }> = {
    Paid:     { bg: T.greenDim, color: T.green },
    Overdue:  { bg: T.amberDim, color: T.amber },
    Upcoming: { bg: T.blueDim, color: T.blue },
  }
  const s = styles[status]
  return (
    <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 9, letterSpacing: '0.07em', color: s.color, background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 999, padding: '4px 9px', whiteSpace: 'nowrap' }}>
      {status.toUpperCase()}
    </span>
  )
}

// ─── Payment success screen ───────────────────────────────────────────────────
function PaymentSuccess({ amount, receiptNo, onDone }: { amount: number; receiptNo?: string; onDone: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 0 }}>
      <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: `1px solid ${T.ink100}`, borderRadius: 28, padding: 'clamp(36px,4vw,52px)', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 16px 48px rgba(14,17,22,0.10)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>

        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 24, color: T.ink900, marginBottom: 6 }}>Payment successful.</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, lineHeight: 1.6, marginBottom: 24 }}>Your payment has been recorded. Outstanding dues on this statement are updated.</div>

        <div style={{ background: T.surface50, border: `1px solid ${T.ink100}`, borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, marginBottom: 4 }}>AMOUNT PAID</div>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 28, color: T.ink900, letterSpacing: '-0.01em' }}>৳ {amount.toLocaleString('en-BD')}</div>
          {receiptNo && (
            <>
              <div style={{ height: 1, background: T.ink100, margin: '14px 0' }} />
              <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, marginBottom: 3 }}>RECEIPT</div>
              <div style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 13, color: T.ink600, letterSpacing: '0.06em' }}>{receiptNo}</div>
            </>
          )}
        </div>

        <button
          onClick={onDone}
          style={{ width: '100%', padding: '13px', fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: '#FFFFFF', background: T.green, border: 'none', borderRadius: 999, cursor: 'pointer', transition: 'background 160ms' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#15803D' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.green }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ─── Payment failed screen ────────────────────────────────────────────────────
function PaymentFailed({ onRetry }: { onRetry: () => void }) {
  const site = useSiteInfo()
  const phone = site.contact.phone
  const hours = [site.office.days, site.office.hours].filter(Boolean).join(' · ')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380 }}>
      <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: `1px solid ${T.ink100}`, borderRadius: 28, padding: 'clamp(36px,4vw,52px)', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 16px 48px rgba(14,17,22,0.10)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
        </div>

        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 24, color: T.ink900, marginBottom: 6 }}>Payment failed.</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, lineHeight: 1.6, marginBottom: 20 }}>Your payment could not be processed at this time. No amount has been charged. Please try again or contact the club office.</div>

        <div style={{ background: '#FFF1F2', border: '1px solid rgba(225,11,23,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink600, marginBottom: 8 }}>Need help? Contact us:</div>
          {phone && (
            <a href={site.contact.phone_href ?? undefined} style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 18, color: T.brand, textDecoration: 'none', display: 'block', marginBottom: 2 }}>{phone}</a>
          )}
          <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400 }}>{hours || 'Club Secretary'}</div>
        </div>

        <button
          onClick={onRetry}
          style={{ width: '100%', padding: '13px', fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: '#FFFFFF', background: T.brand, border: 'none', borderRadius: 999, cursor: 'pointer', transition: 'background 160ms', marginBottom: 10 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.brand }}
        >
          Try again
        </button>
        <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink200 }}>Error code: PAYMENT_DECLINED · {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  )
}

// ─── Payment summary card ─────────────────────────────────────────────────────
type PayState = 'idle' | 'processing' | 'success' | 'failed'

function PaymentCard({ outstanding, dues, onPaid }: {
  outstanding: number
  dues: DueEntry[]
  onPaid: () => void
}) {
  const [method, setMethod] = useState<PayMethod>('bkash')
  const [payState, setPayState] = useState<PayState>('idle')
  const [receiptNo, setReceiptNo] = useState('')
  const [paidAmount, setPaidAmount] = useState(0)
  const [payError, setPayError] = useState('')
  const [reference, setReference] = useState('')
  const [gateways, setGateways] = useState<string[]>([])
  const [banks, setBanks] = useState<DuesPayAccount[]>([])
  const [wallets, setWallets] = useState<{ bkash: DuesPayAccount | null; nagad: DuesPayAccount | null }>({ bkash: null, nagad: null })
  const [memberNo, setMemberNo] = useState('')
  const overdueDues = dues.filter((d) => d.status === 'Overdue')

  useEffect(() => {
    let alive = true
    fetchDuesPayMethods()
      .then((m) => {
        if (!alive || !m) return
        setGateways(Array.isArray(m.gateways) ? m.gateways : [])
        setBanks(Array.isArray(m.banks) ? m.banks : [])
        setWallets({
          bkash: m.wallets?.bkash || null,
          nagad: m.wallets?.nagad || null,
        })
        setMemberNo(m.member_no || '')
      })
      .catch(() => { /* keep empty instructions */ })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    setReference('')
    setPayError('')
  }, [method])

  const hasOnlineCard = gateways.includes('sslcommerz')
  const hasOnlineBkash = gateways.includes('bkash')
  const wallet = method === 'bkash' ? wallets.bkash : method === 'nagad' ? wallets.nagad : null

  const handlePay = async () => {
    if (outstanding <= 0) return
    setPayError('')

    // Online hosted checkout only when that gateway is actually configured
    if (method === 'card') {
      if (!hasOnlineCard) {
        setPayError('Card payment is not enabled yet. Use bKash, Nagad, or bank transfer.')
        return
      }
      setPayState('processing')
      try {
        const started = await startDuesPay({ gateway: 'sslcommerz', pay_all_due: true })
        if (started?.gateway_url) {
          window.location.href = started.gateway_url
          return
        }
        throw new Error('Could not start card checkout.')
      } catch (e) {
        setPayError(e instanceof Error ? e.message : 'Payment failed')
        setPayState('failed')
      }
      return
    }

    if (method === 'bkash' && hasOnlineBkash) {
      setPayState('processing')
      try {
        const started = await startDuesPay({ gateway: 'bkash', pay_all_due: true })
        if (started?.gateway_url) {
          window.location.href = started.gateway_url
          return
        }
        throw new Error('Could not start bKash checkout.')
      } catch (e) {
        setPayError(e instanceof Error ? e.message : 'Payment failed')
        setPayState('failed')
      }
      return
    }

    // Offline: must pay to the number/account first, then submit TrxID / reference
    if (method === 'bkash' || method === 'nagad') {
      if (!wallet?.account_no) {
        setPayError(`${method === 'bkash' ? 'bKash' : 'Nagad'} number is not configured. Contact the club office.`)
        return
      }
    }
    if (method === 'bank' && banks.length === 0) {
      setPayError('Bank accounts are not configured. Contact the club office.')
      return
    }
    if (reference.trim().length < 6) {
      setPayError(method === 'bank'
        ? 'Enter the bank transfer reference / UTR (at least 6 characters).'
        : 'Enter the TrxID from your payment SMS (at least 6 characters).')
      return
    }

    setPayState('processing')
    try {
      const settled = await settleDuesPay(method, reference.trim())
      setPaidAmount(Number(settled?.amount || outstanding))
      setReceiptNo(settled?.receipt_no || settled?.tran_id || '')
      setPayState('success')
      onPaid()
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Payment failed')
      setPayState('failed')
    }
  }

  if (payState === 'success') {
    return <PaymentSuccess amount={paidAmount || outstanding} receiptNo={receiptNo} onDone={() => { setPayState('idle'); onPaid() }} />
  }
  if (payState === 'failed') {
    return <PaymentFailed onRetry={() => setPayState('idle')} />
  }

  const copyText = async (value: string) => {
    try { await navigator.clipboard.writeText(value) } catch { /* ignore */ }
  }

  const primaryLabel = (() => {
    if (outstanding <= 0) return 'Nothing to pay'
    if (payState === 'processing') return 'Processing…'
    if (method === 'card' && hasOnlineCard) return `Pay ৳ ${outstanding.toLocaleString('en-BD')} by card`
    if (method === 'bkash' && hasOnlineBkash) return `Continue to bKash`
    if (method === 'card') return 'Card not available'
    return `I paid — submit TrxID`
  })()

  const canClick =
    outstanding > 0 &&
    payState !== 'processing' &&
    !(method === 'card' && !hasOnlineCard)

  return (
    <div
      id="pay-card"
      style={{
        position: 'sticky',
        top: 100,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: `1px solid rgba(185,139,67,0.30)`,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(14,17,22,0.08)',
      }}
    >
      <div style={{ background: 'linear-gradient(135deg,rgba(225,11,23,0.06) 0%,rgba(185,139,67,0.06) 100%)', padding: '24px 24px 20px', borderBottom: `1px solid ${T.ink100}` }}>
        <div className="eyebrow" style={{ fontSize: 10, color: T.brass, marginBottom: 10 }}>OUTSTANDING BALANCE</div>
        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 38, color: T.ink900, letterSpacing: '-0.02em', lineHeight: 1 }}>
          <span style={{ fontFamily: 'CKCL', fontSize: 20, verticalAlign: 'super', marginRight: 2, fontWeight: 700 }}>৳</span>
          {outstanding.toLocaleString('en-BD')}
        </div>
        <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, marginTop: 6 }}>
          {outstanding > 0 ? 'Choose a method, pay to the club, then submit your TrxID' : 'Nothing outstanding'}
        </div>
      </div>

      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.ink100}` }}>
        <div className="eyebrow mb-3" style={{ fontSize: 9, color: T.ink200 }}>BREAKDOWN</div>
        {(overdueDues.length ? overdueDues : dues.filter((d) => d.status !== 'Paid')).slice(0, 6).map((d) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.surface100}` }}>
            <span style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, flex: 1, paddingRight: 8, lineHeight: 1.4 }}>{d.description}</span>
            <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 13, color: T.amber, whiteSpace: 'nowrap' }}>৳ {d.amount.toLocaleString('en-BD')}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
          <span style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 700, color: T.ink900 }}>Total</span>
          <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 14, color: T.ink900 }}>৳ {outstanding.toLocaleString('en-BD')}</span>
        </div>
      </div>

      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.ink100}` }}>
        <div className="eyebrow mb-3" style={{ fontSize: 9, color: T.ink200 }}>PAY WITH</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PAY_METHODS.map((pm) => {
            const active = method === pm.id
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => setMethod(pm.id)}
                style={{
                  padding: '11px 12px',
                  background: active ? '#FFF1F2' : '#FFFFFF',
                  border: `1.5px solid ${active ? T.brand : T.ink100}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 160ms',
                  boxShadow: active ? `0 0 0 3px rgba(225,11,23,0.10)` : 'none',
                  color: active ? T.brand : T.ink400,
                }}
              >
                {pm.icon}
                <span style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? T.brand : T.ink600 }}>{pm.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Method-specific how-to-pay */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.ink100}`, background: T.surface50 }}>
        <div className="eyebrow mb-2" style={{ fontSize: 9, color: T.brass }}>HOW TO PAY</div>

        {method === 'card' && (
          <p style={{ margin: 0, fontFamily: 'CKCL', fontSize: 13, color: T.ink600, lineHeight: 1.55 }}>
            {hasOnlineCard
              ? 'You will be redirected to a secure card checkout (SSLCommerz). No card details are stored on the club site.'
              : 'Online card checkout is not enabled for this club yet. Please pay by bKash, Nagad, or bank transfer.'}
          </p>
        )}

        {(method === 'bkash' || method === 'nagad') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {method === 'bkash' && hasOnlineBkash ? (
              <p style={{ margin: 0, fontFamily: 'CKCL', fontSize: 13, color: T.ink600, lineHeight: 1.55 }}>
                Continue to the official bKash checkout. You will complete payment in the bKash window.
              </p>
            ) : wallet?.account_no ? (
              <>
                <p style={{ margin: 0, fontFamily: 'CKCL', fontSize: 13, color: T.ink600, lineHeight: 1.55 }}>
                  1. Open {method === 'bkash' ? 'bKash' : 'Nagad'} → Send Money / Payment<br />
                  2. Pay <strong>৳ {outstanding.toLocaleString('en-BD')}</strong> to the number below<br />
                  3. Put <strong>{memberNo || 'your membership ID'}</strong> in the reference<br />
                  4. Enter the TrxID from the confirmation SMS, then submit
                </p>
                <div style={{ background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, marginBottom: 4 }}>
                    {wallet.branch_name || 'Merchant'} number
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 20, color: T.ink900, letterSpacing: '0.02em' }}>{wallet.account_no}</div>
                    <button type="button" onClick={() => void copyText(wallet.account_no)} style={{ fontFamily: 'CKCL', fontSize: 11, fontWeight: 600, color: T.brand, background: T.brandDim, border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Copy</button>
                  </div>
                  {wallet.account_name && (
                    <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, marginTop: 6 }}>{wallet.account_name}</div>
                  )}
                  {wallet.notes && (
                    <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink400, marginTop: 6, lineHeight: 1.45 }}>{wallet.notes}</div>
                  )}
                </div>
                <label style={{ display: 'block' }}>
                  <div style={{ fontFamily: 'CKCL', fontSize: 11, fontWeight: 600, color: T.ink400, marginBottom: 6 }}>TrxID *</div>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. 8H7K2L9M0N"
                    style={{ width: '100%', height: 44, padding: '0 12px', fontFamily: 'CKCL', fontSize: 14, color: T.ink900, background: '#FFFFFF', border: `1.5px solid ${T.ink100}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
                  />
                </label>
              </>
            ) : (
              <p style={{ margin: 0, fontFamily: 'CKCL', fontSize: 13, color: T.brand, lineHeight: 1.55 }}>
                {method === 'bkash' ? 'bKash' : 'Nagad'} number is not set up yet. Contact the club office.
              </p>
            )}
          </div>
        )}

        {method === 'bank' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontFamily: 'CKCL', fontSize: 13, color: T.ink600, lineHeight: 1.55 }}>
              Transfer <strong>৳ {outstanding.toLocaleString('en-BD')}</strong> to any club account below.
              Use <strong>{memberNo || 'your membership ID'}</strong> in the narration, then enter the bank reference.
            </p>
            {banks.length === 0 ? (
              <p style={{ margin: 0, fontFamily: 'CKCL', fontSize: 13, color: T.brand }}>No bank accounts published yet.</p>
            ) : banks.map((b) => (
              <div key={b.id} style={{ background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 14, color: T.ink900 }}>{b.bank_name}</div>
                {b.branch_name && <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, marginTop: 2 }}>{b.branch_name} branch</div>}
                <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink600, marginTop: 8 }}>{b.account_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                  <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 16, color: T.ink900 }}>{b.account_no}</div>
                  <button type="button" onClick={() => void copyText(b.account_no)} style={{ fontFamily: 'CKCL', fontSize: 11, fontWeight: 600, color: T.brand, background: T.brandDim, border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Copy</button>
                </div>
                {b.routing_no && <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, marginTop: 4 }}>Routing: {b.routing_no}</div>}
                {b.notes && <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink400, marginTop: 6 }}>{b.notes}</div>}
              </div>
            ))}
            <label style={{ display: 'block' }}>
              <div style={{ fontFamily: 'CKCL', fontSize: 11, fontWeight: 600, color: T.ink400, marginBottom: 6 }}>Bank reference / UTR *</div>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transfer reference number"
                style={{ width: '100%', height: 44, padding: '0 12px', fontFamily: 'CKCL', fontSize: 14, color: T.ink900, background: '#FFFFFF', border: `1.5px solid ${T.ink100}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
              />
            </label>
          </div>
        )}

        {payError && (
          <div style={{ marginTop: 10, fontFamily: 'CKCL', fontSize: 12, color: T.brand, lineHeight: 1.45 }}>{payError}</div>
        )}
      </div>

      <div style={{ padding: '18px 24px' }}>
        <button
          type="button"
          onClick={handlePay}
          disabled={!canClick}
          style={{
            width: '100%',
            padding: '15px',
            fontFamily: 'CKCL',
            fontSize: 15,
            fontWeight: 700,
            color: '#FFFFFF',
            background: !canClick ? '#B70813' : T.brand,
            border: 'none',
            borderRadius: 999,
            cursor: !canClick ? 'default' : 'pointer',
            transition: 'background 160ms',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            letterSpacing: '-0.01em',
            opacity: !canClick ? 0.55 : 1,
          }}
          onMouseEnter={(e) => { if (canClick) (e.currentTarget as HTMLElement).style.background = '#B70813' }}
          onMouseLeave={(e) => { if (canClick) (e.currentTarget as HTMLElement).style.background = T.brand }}
        >
          {payState === 'processing' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              Processing…
            </>
          ) : primaryLabel}
        </button>
        <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, textAlign: 'center', marginTop: 10, lineHeight: 1.45 }}>
          Selecting a method alone does not pay. Follow the steps, then submit.
        </div>
      </div>
    </div>
  )
}

// ─── Dues statement table ─────────────────────────────────────────────────────
function DuesTable() {
  const cols = ['Period', 'Description', 'Amount', 'Due Date', 'Status', '']

  return (
    <div className="hidden sm:block" style={{ background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.ink100}`, overflow: 'hidden' }}>
      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 2.4fr 1.2fr 1.2fr 1fr 0.7fr',
          background: T.surface50,
          borderBottom: `1px solid ${T.ink100}`,
          padding: '0 20px',
        }}
        className="hidden sm:grid"
      >
        {cols.map((col) => (
          <div
            key={col}
            style={{ padding: '13px 0', fontFamily: 'CKCL', fontWeight: 500, fontSize: 9, letterSpacing: '0.08em', color: T.ink200, textAlign: col === 'Amount' ? 'right' : 'left' }}
          >
            {col.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Rows */}
      {LIVE_DUES.map((due, i) => (
        <div
          key={due.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 2.4fr 1.2fr 1.2fr 1fr 0.7fr',
            padding: '16px 20px',
            borderBottom: i < LIVE_DUES.length - 1 ? `1px solid ${T.ink100}` : 'none',
            alignItems: 'center',
            background: due.status === 'Overdue' ? 'rgba(255,251,235,0.40)' : 'transparent',
            transition: 'background 140ms',
          }}
          className="hidden sm:grid"
          onMouseEnter={(e) => { if (due.status !== 'Overdue') (e.currentTarget as HTMLElement).style.background = T.surface50 }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = due.status === 'Overdue' ? 'rgba(255,251,235,0.40)' : 'transparent' }}
        >
          {/* Period */}
          <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400 }}>{due.period}</div>
          {/* Description */}
          <div style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 500, color: T.ink900, paddingRight: 12 }}>{due.description}</div>
          {/* Amount */}
          <div style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 14, color: due.status === 'Overdue' ? T.amber : T.ink900, textAlign: 'right', paddingRight: 16 }}>
            ৳ {due.amount.toLocaleString('en-BD')}
          </div>
          {/* Due date */}
          <div style={{ fontFamily: 'CKCL', fontSize: 12, color: due.status === 'Overdue' ? T.amber : T.ink400 }}>
            {due.status === 'Paid' ? due.paidDate : due.dueDate}
          </div>
          {/* Status */}
          <div><StatusChip status={due.status} /></div>
          {/* Action */}
          <div>
            {due.status === 'Paid' ? (
              <button style={{ fontFamily: 'CKCL', fontSize: 11, fontWeight: 600, color: T.green, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Receipt</button>
            ) : due.status === 'Overdue' ? (
              <span style={{ fontFamily: 'CKCL', fontSize: 11, fontWeight: 600, color: T.amber }}>Pay now</span>
            ) : null}
          </div>
        </div>
      ))}

    </div>
  )
}

// ─── Mobile statement: summary + dues grouped by billing period ──────────────
const taka = (n: number) => `৳ ${n.toLocaleString('en-BD')}`

function MobileStatement() {
  const overdue = LIVE_DUES.filter((d) => d.status === 'Overdue')
  const paidTotal = LIVE_DUES.filter((d) => d.status === 'Paid').reduce((s, d) => s + d.amount, 0)
  // Current period first
  const periods = [...new Set(LIVE_DUES.map((d) => d.period))].reverse()

  const stats = [
    { label: 'Outstanding', value: taka(LIVE_OUTSTANDING), color: T.ink900 },
    { label: 'Overdue', value: `${overdue.length} ${overdue.length === 1 ? 'item' : 'items'}`, color: T.amber },
    { label: 'Paid', value: taka(paidTotal), color: T.green },
  ]

  return (
    <div className="sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 16 }}>
        {stats.map((st, i) => (
          <div key={st.label} style={{ padding: '14px 12px', borderLeft: i > 0 ? `1px solid ${T.ink100}` : 'none', minWidth: 0 }}>
            <div className="eyebrow" style={{ fontSize: 9, color: T.ink400, marginBottom: 4 }}>{st.label}</div>
            <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 15, color: st.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.value}</div>
          </div>
        ))}
      </div>

      {periods.map((period) => {
        const items = LIVE_DUES.filter((d) => d.period === period)
        const total = items.reduce((s, d) => s + d.amount, 0)
        return (
          <section key={period}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10, padding: '0 2px' }}>
              <div className="eyebrow" style={{ fontSize: 10, color: T.ink600 }}>{period}</div>
              <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400 }}>{items.length} items · {taka(total)}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((due) => {
                const isOverdue = due.status === 'Overdue'
                return (
                  <div
                    key={due.id}
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid ${isOverdue ? 'rgba(217,119,6,0.30)' : T.ink100}`,
                      borderLeft: `3px solid ${isOverdue ? T.amber : due.status === 'Paid' ? T.green : T.blue}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                    }}
                  >
                    {/* Description + amount */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: T.ink900, lineHeight: 1.35, minWidth: 0 }}>{due.description}</div>
                      <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 15, color: isOverdue ? T.amber : T.ink900, whiteSpace: 'nowrap' }}>{taka(due.amount)}</div>
                    </div>

                    {/* Date + status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10 }}>
                      <div style={{ fontFamily: 'CKCL', fontSize: 12, color: isOverdue ? T.amber : T.ink400 }}>
                        {due.status === 'Paid' ? `Paid ${due.paidDate}` : `Due ${due.dueDate}`}
                      </div>
                      <StatusChip status={due.status} />
                    </div>

                    {/* Action */}
                    {due.status !== 'Upcoming' && (
                      <div style={{ borderTop: `1px solid ${T.ink100}`, marginTop: 12, paddingTop: 10 }}>
                        {due.status === 'Paid' ? (
                          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.green, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download receipt
                          </button>
                        ) : (
                          <button
                            onClick={() => document.getElementById('pay-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.amber, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            Pay now
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function DuesSection() {
  const [rows, setRows] = useState<DueEntry[]>([])
  const [outstanding, setOutstanding] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfNote, setPdfNote] = useState('')
  const [, bump] = useState(0)

  const exportPdf = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    setPdfNote('')
    try {
      await downloadDuesStatementPdf()
      setPdfNote('Statement PDF downloaded.')
      window.setTimeout(() => setPdfNote(''), 2500)
    } catch (e) {
      setPdfNote(e instanceof Error ? e.message : 'Could not download PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([fetchDuesSummary(), fetchDuesStatement()])
      .then(([summary, statement]) => {
        if (!alive) return
        const dueTotal = Number(summary?.total_due || 0)
        const entries = (statement?.entries || []).map((e, i) => {
          const debit = Number(e.debit || 0)
          const credit = Number(e.credit || 0)
          const status: DueStatus = credit > 0 ? 'Paid' : (debit > 0 ? 'Overdue' : 'Upcoming')
          return {
            id: i + 1,
            period: e.date || '—',
            description: e.description || e.type || 'Charge',
            amount: debit > 0 ? debit : credit,
            dueDate: e.date || '—',
            paidDate: credit > 0 ? (e.date || undefined) : undefined,
            status,
          } as DueEntry
        })
        LIVE_DUES = entries
        LIVE_OUTSTANDING = dueTotal
        setRows(entries)
        setOutstanding(dueTotal)
        setError('')
        bump((n) => n + 1)
      })
      .catch((e: Error) => { if (alive) setError(e.message || 'Could not load statement') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [reloadKey])

  if (loading) {
    return <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, padding: 40, textAlign: 'center' }}>Loading your statement…</div>
  }
  if (error) {
    return <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.brand, padding: 40, textAlign: 'center' }}>{error}</div>
  }

  const overdueCount = rows.filter((d) => d.status === 'Overdue').length

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
      {/* Left — statement table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div className="eyebrow mb-1" style={{ fontSize: 10, color: T.brass }}>STATEMENT</div>
            <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, color: T.ink900, margin: 0, letterSpacing: '-0.01em' }}>Account Statement</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <button
              type="button"
              onClick={() => { void exportPdf() }}
              disabled={pdfBusy}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: pdfBusy ? T.ink200 : T.ink600, background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 10, cursor: pdfBusy ? 'default' : 'pointer' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {pdfBusy ? 'Preparing PDF…' : 'Export PDF'}
            </button>
            {pdfNote && (
              <div style={{ fontFamily: 'CKCL', fontSize: 11, color: pdfNote.includes('download') ? T.green : T.brand }}>{pdfNote}</div>
            )}
          </div>
        </div>
        <DuesTable />
        <MobileStatement />

        {/* Overdue notice */}
        <div style={{ marginTop: 16, padding: '14px 18px', background: T.amberDim, border: `1px solid rgba(217,119,6,0.25)`, borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.amber} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink600, lineHeight: 1.55 }}>
            {overdueCount > 0
              ? <>Your account has <strong style={{ color: T.amber }}>{overdueCount} overdue item{overdueCount === 1 ? '' : 's'}</strong> totalling <strong style={{ fontFamily: 'CKCL' }}>৳ {outstanding.toLocaleString('en-BD')}</strong>. Please settle outstanding dues to keep full facility access.</>
              : <>No overdue items. Current balance due: <strong style={{ fontFamily: 'CKCL' }}>৳ {outstanding.toLocaleString('en-BD')}</strong>.</>}
          </div>
        </div>
      </div>

      {/* Right — sticky payment card */}
      <PaymentCard
        outstanding={outstanding}
        dues={rows}
        onPaid={() => setReloadKey((k) => k + 1)}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE_DUES ACCESS — find member → verify by OTP → statement (live API)
// ═══════════════════════════════════════════════════════════════════════════════
const OTP_LENGTH = 6
const RESEND_SECONDS = 30

type DuesUiMember = {
  id: string
  name: string
  memberNo: string
  tier: string
  avatar: string | null
  phone_masked: string
  email_masked: string
  has_phone: boolean
  has_email: boolean
  designation?: string
  company?: string
}

function mapHit(m: DuesMemberHit): DuesUiMember {
  return {
    id: m.id,
    name: m.full_name,
    memberNo: m.member_no,
    tier: m.membership_type || 'Member',
    avatar: duesPhoto(m.photo_url),
    phone_masked: m.phone_masked || '',
    email_masked: m.email_masked || '',
    has_phone: !!m.has_phone,
    has_email: !!m.has_email,
  }
}

function MemberAvatar({ m, size }: { m: DuesUiMember; size: number }) {
  const initials = m.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: T.surface100, border: '2px solid rgba(185,139,67,0.55)', boxShadow: '0 0 0 3px rgba(185,139,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {m.avatar
        ? <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        : <span style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: size * 0.34, color: T.brass }}>{initials}</span>}
    </div>
  )
}

function TierChip({ tier }: { tier: string }) {
  const t = tier.toLowerCase()
  const s = t.includes('found')
    ? { bg: T.brassDim, color: T.brass }
    : t.includes('life')
      ? { bg: T.brandDim, color: T.brand }
      : { bg: T.surface100, color: T.ink400 }
  return (
    <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 9, letterSpacing: '0.07em', color: s.color, background: s.bg, border: `1px solid ${s.color}40`, borderRadius: 999, padding: '4px 9px', whiteSpace: 'nowrap' }}>
      {tier.toUpperCase()}
    </span>
  )
}

function GateSteps({ step }: { step: 1 | 2 }) {
  const steps = ['Find member', 'Verify', 'Statement']
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 24 }}>
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < step
        const on = n === step
        return (
          <div key={label} className="flex items-center gap-2" style={{ minWidth: 0 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'CKCL', fontSize: 11, fontWeight: 700, background: on ? T.brand : done ? T.green : T.surface100, color: on || done ? '#FFFFFF' : T.ink400 }}>
              {done ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : n}
            </span>
            <span style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: on ? 600 : 500, color: on ? T.ink900 : T.ink400, whiteSpace: 'nowrap' }}>{label}</span>
            {i < steps.length - 1 && <span style={{ width: 18, height: 1, background: T.ink100, flexShrink: 0 }}/>}
          </div>
        )
      })}
    </div>
  )
}

const gateCard: React.CSSProperties = {
  maxWidth: 600, margin: '0 auto', background: '#FFFFFF', border: '1px solid rgba(185,139,67,0.30)',
  borderRadius: 24, padding: 'clamp(22px,3.5vw,36px)', boxShadow: '0 8px 32px rgba(14,17,22,0.06)',
}

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px', fontFamily: 'CKCL', fontSize: 14, color: T.ink900,
  background: T.surface50, border: `1.5px solid ${T.ink100}`, borderRadius: 12, outline: 'none',
}

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '13px', fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: '#FFFFFF',
  background: disabled ? '#F3A3A8' : T.brand, border: 'none', borderRadius: 999, cursor: disabled ? 'default' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 160ms',
})

const Spinner = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>

function FindMember({ onSelect }: { onSelect: (m: DuesUiMember) => void }) {
  // Filter options = the club's active membership types (club/club-portal/settings).
  const { data: clubSettings } = usePortalClubSettings()
  const memberTypes = (clubSettings?.membership_types || []).map((t) => t.name)
  const [type, setType] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DuesUiMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const q = query.trim()

  useEffect(() => {
    if (q.length < 2) { setResults([]); setError(''); return }
    let alive = true
    setLoading(true)
    const t = window.setTimeout(() => {
      lookupDuesMembers(q, type || undefined)
        .then((rows) => { if (alive) { setResults((rows || []).map(mapHit)); setError('') } })
        .catch((e: Error) => { if (alive) { setResults([]); setError(e.message || 'Search failed') } })
        .finally(() => { if (alive) setLoading(false) })
    }, 280)
    return () => { alive = false; window.clearTimeout(t) }
  }, [q, type])

  return (
    <div style={gateCard}>
      <GateSteps step={1}/>
      <div className="eyebrow mb-2" style={{ fontSize: 10, color: T.brass }}>CLUB LIVE_DUES</div>
      <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(20px,2.4vw,26px)', color: T.ink900, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Find your membership.</h2>
      <p style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, lineHeight: 1.6, margin: '0 0 22px' }}>
        Select your member type and search by name or membership ID. We'll verify it's you before showing your statement.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
        <label style={{ display: 'block' }}>
          <span className="eyebrow" style={{ display: 'block', fontSize: 9, color: T.ink400, marginBottom: 6 }}>MEMBER TYPE</span>
          <div style={{ position: 'relative' }}>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="dues-field"
              style={{ ...fieldStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: 36, cursor: 'pointer' }}
            >
              <option value="">All types</option>
              {memberTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.ink400} strokeWidth="2.2" style={{ position: 'absolute', right: 14, top: 16, pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </label>
        <label style={{ display: 'block' }}>
          <span className="eyebrow" style={{ display: 'block', fontSize: 9, color: T.ink400, marginBottom: 6 }}>MEMBER SEARCH</span>
          <div style={{ position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2" style={{ position: 'absolute', left: 14, top: 15, pointerEvents: 'none' }}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or membership ID"
              className="dues-field"
              style={{ ...fieldStyle, paddingLeft: 40 }}
              autoComplete="off"
            />
          </div>
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        {q.length < 2 ? (
          <div style={{ fontFamily: 'CKCL', fontSize: 12.5, color: T.ink200, textAlign: 'center', padding: '14px 0' }}>Type at least 2 characters to search.</div>
        ) : loading ? (
          <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400, textAlign: 'center', padding: '18px 12px' }}>Searching…</div>
        ) : error ? (
          <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.brand, textAlign: 'center', padding: '18px 12px' }}>{error}</div>
        ) : results.length === 0 ? (
          <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400, textAlign: 'center', padding: '18px 12px', background: T.surface50, borderRadius: 12 }}>
            No members match “{query.trim()}”{type ? ` in ${type}` : ''}. Check the spelling or try your membership ID.
          </div>
        ) : (
          <div style={{ border: `1px solid ${T.ink100}`, borderRadius: 14, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
            {results.map((m, i) => (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className="dues-result"
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#FFFFFF', border: 'none', borderTop: i ? `1px solid ${T.ink100}` : 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <MemberAvatar m={m} size={40}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 14, color: T.ink900, lineHeight: 1.3 }}>{m.name}</div>
                  <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, marginTop: 2 }}>{m.memberNo} · {m.tier}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2.2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type Channel = 'phone' | 'email'

function OtpInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const set = (v: string) => onChange(v.replace(/\D/g, '').slice(0, OTP_LENGTH))

  return (
    <div className="flex justify-between gap-2" onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH); set(v); refs.current[Math.min(v.length, OTP_LENGTH - 1)]?.focus() }}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={value[i] ?? ''}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          autoFocus={i === 0}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1)
            if (!d) return
            set(value.slice(0, i) + d + value.slice(i + 1))
            refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              if (value[i]) set(value.slice(0, i) + value.slice(i + 1))
              else if (i > 0) { set(value.slice(0, i - 1) + value.slice(i)); refs.current[i - 1]?.focus() }
            } else if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus()
            else if (e.key === 'ArrowRight') refs.current[i + 1]?.focus()
          }}
          className="dues-field"
          style={{ width: '100%', maxWidth: 54, height: 56, textAlign: 'center', fontFamily: 'CKCL', fontSize: 22, fontWeight: 600, color: T.ink900, background: T.surface50, border: `1.5px solid ${error ? T.brand : value[i] ? T.ink400 : T.ink100}`, borderRadius: 12, outline: 'none' }}
        />
      ))}
    </div>
  )
}

function VerifyMember({ member, onBack, onVerified }: { member: DuesUiMember; onBack: () => void; onVerified: (via: Channel, sessionMember: DuesUiMember) => void }) {
  const [channel, setChannel] = useState<Channel>(member.has_phone ? 'phone' : 'email')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [resendIn])

  const destination = channel === 'phone' ? member.phone_masked : member.email_masked

  const sendCode = async () => {
    setBusy(true)
    setError('')
    try {
      await sendDuesOtp(member.id, channel)
      setSent(true)
      setCode('')
      setResendIn(RESEND_SECONDS)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send OTP')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    setError('')
    try {
      const data = await verifyDuesOtp(member.id, channel, code)
      const sm = data.member
      onVerified(channel, {
        ...member,
        name: sm.full_name || member.name,
        memberNo: sm.member_no || member.memberNo,
        tier: sm.membership_type || member.tier,
        avatar: duesPhoto(sm.photo_url) || member.avatar,
        designation: sm.designation || undefined,
        company: sm.company || undefined,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const channels: { id: Channel; label: string; icon: React.ReactNode; enabled: boolean }[] = [
    { id: 'phone', label: 'Text message', enabled: member.has_phone, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg> },
    { id: 'email', label: 'Email', enabled: member.has_email, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></svg> },
  ]

  return (
    <div style={gateCard}>
      <GateSteps step={2}/>
      <button onClick={sent ? () => { setSent(false); setError('') } : onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'CKCL', fontSize: 12.5, fontWeight: 600, color: T.ink400, background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 16 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>
        {sent ? 'Use a different method' : 'Change member'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: T.surface50, border: `1px solid ${T.ink100}`, borderRadius: 14, marginBottom: 22 }}>
        <MemberAvatar m={member} size={44}/>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 14.5, color: T.ink900 }}>{member.name}</div>
          <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, marginTop: 2 }}>{member.memberNo} · {member.tier}</div>
        </div>
      </div>

      {!sent ? (
        <>
          <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: T.ink900, margin: '0 0 6px' }}>Verify it's you.</h2>
          <p style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, lineHeight: 1.6, margin: '0 0 16px' }}>We'll send a one-time code to the contact on your membership record.</p>
          <div role="radiogroup" aria-label="Send code by" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ marginBottom: 20 }}>
            {channels.map((c) => {
              const on = channel === c.id
              return (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={on}
                  disabled={!c.enabled}
                  onClick={() => c.enabled && setChannel(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', textAlign: 'left', background: on ? T.brandDim : '#FFFFFF', border: `1.5px solid ${on ? T.brand : T.ink100}`, borderRadius: 14, cursor: c.enabled ? 'pointer' : 'not-allowed', color: on ? T.brand : T.ink400, boxShadow: on ? '0 0 0 3px rgba(225,11,23,0.10)' : 'none', transition: 'all 160ms', minWidth: 0, opacity: c.enabled ? 1 : 0.45 }}
                >
                  {c.icon}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.ink900 }}>{c.label}</span>
                    <span style={{ display: 'block', fontFamily: 'CKCL', fontSize: 12, color: T.ink400, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.id === 'phone' ? (member.phone_masked || 'Not on file') : (member.email_masked || 'Not on file')}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {error && <div role="alert" style={{ fontFamily: 'CKCL', fontSize: 12.5, color: T.brand, marginBottom: 12 }}>{error}</div>}
          <button onClick={sendCode} disabled={busy} style={primaryBtn(busy)}>
            {busy ? <><Spinner/> Sending…</> : 'Send OTP'}
          </button>
        </>
      ) : (
        <>
          <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: T.ink900, margin: '0 0 6px' }}>Enter your code.</h2>
          <p style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, lineHeight: 1.6, margin: '0 0 18px' }}>
            We sent a {OTP_LENGTH}-digit code to <strong style={{ color: T.ink900, fontWeight: 600 }}>{destination}</strong>.
          </p>
          <OtpInput value={code} onChange={(v) => { setCode(v); setError('') }} error={!!error}/>
          {error && <div role="alert" style={{ fontFamily: 'CKCL', fontSize: 12.5, color: T.brand, marginTop: 10 }}>{error}</div>}
          <button onClick={verify} disabled={busy || code.length < OTP_LENGTH} style={{ ...primaryBtn(busy || code.length < OTP_LENGTH), marginTop: 20 }}>
            {busy ? <><Spinner/> Verifying…</> : 'Verify & continue'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14 }}>
            <button onClick={sendCode} disabled={resendIn > 0 || busy} style={{ fontFamily: 'CKCL', fontSize: 12.5, fontWeight: 600, color: resendIn > 0 ? T.ink200 : T.brand, background: 'none', border: 'none', padding: 0, cursor: resendIn > 0 ? 'default' : 'pointer' }}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MemberSummary({ member, via, onSignOut }: { member: DuesUiMember; via: Channel; onSignOut: () => void }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(185,139,67,0.30)', borderRadius: 20, padding: 'clamp(18px,2.5vw,24px)', marginBottom: 28, boxShadow: '0 4px 20px rgba(14,17,22,0.05)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4" style={{ flex: 1, minWidth: 0 }}>
          <MemberAvatar m={member} size={72}/>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(17px,2vw,21px)', color: T.ink900, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{member.name}</div>
            <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400, marginTop: 3, lineHeight: 1.45 }}>
              {[member.designation, member.company].filter(Boolean).join(', ') || member.tier}
            </div>
            <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 8 }}>
              <TierChip tier={member.tier}/>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'CKCL', fontWeight: 500, fontSize: 9, letterSpacing: '0.07em', color: T.green, background: T.greenDim, border: `1px solid ${T.green}30`, borderRadius: 999, padding: '4px 9px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green }}/>VERIFIED
              </span>
            </div>
          </div>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t border-[#E2E6EC] pt-3 sm:border-t-0 sm:pt-0">
          <div className="sm:text-right">
            <div className="eyebrow" style={{ fontSize: 9, color: T.ink200 }}>MEMBERSHIP ID</div>
            <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 15, color: T.ink900, letterSpacing: '0.04em', marginTop: 2 }}>{member.memberNo}</div>
          </div>
          <button onClick={onSignOut} style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.ink400, background: T.surface50, border: `1px solid ${T.ink100}`, borderRadius: 999, padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Not you? Sign out
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'CKCL', fontSize: 11.5, color: T.ink200, marginTop: 14 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        Verified by {via === 'phone' ? 'text message' : 'email'} for this session
      </div>
    </div>
  )
}

type DuesAccess = { member: DuesUiMember; via: Channel } | null

function DuesGate({ access, onAccess }: { access: DuesAccess; onAccess: (a: DuesAccess) => void }) {
  const [selected, setSelected] = useState<DuesUiMember | null>(null)

  if (access) {
    return (
      <>
        <MemberSummary member={access.member} via={access.via} onSignOut={() => { setDuesToken(null); onAccess(null); setSelected(null) }}/>
        <DuesSection/>
      </>
    )
  }
  return (
    <>
      <style>{`
        .dues-field:focus { border-color: ${T.ink400} !important; background: #FFFFFF !important; box-shadow: 0 0 0 3px rgba(14,17,22,0.06); }
        .dues-result:hover { background: ${T.surface50} !important; }
        .dues-field::-webkit-search-cancel-button { cursor: pointer; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      {selected
        ? <VerifyMember member={selected} onBack={() => setSelected(null)} onVerified={(via, m) => onAccess({ member: m, via })}/>
        : <FindMember onSelect={setSelected}/>}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function PageHeader({ tab, onTab }: { tab: ResourceTab; onTab: (t: ResourceTab) => void }) {
  return (
    <div style={{ minHeight: 'clamp(200px, 28vw, 320px)', background: T.surface100, position: 'relative', overflow: 'hidden', paddingBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(225,11,23,0.09) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box', padding: '108px clamp(24px,5vw,80px) 0', position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-1.5 mb-3">
          {['Home', 'Resources'].map((c, i, arr) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="eyebrow" style={{ fontSize: 11, color: i < arr.length - 1 ? T.ink400 : T.ink900 }}>{c}</span>
              {i < arr.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
            </span>
          ))}
        </div>
        <div className="eyebrow mb-2" style={{ fontSize: 11, color: T.brass }}>RESOURCES</div>
        <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: T.ink900, margin: '0 0 32px' }}>Member Resources.</h1>

        <SubTabs tabs={TABS} active={tab} onChange={onTab} />
      </div>
    </div>
  )
}

const overlayBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'background 140ms',
}

export default function ResourcesPage() {
  const [tab, setTab] = useState<ResourceTab>('reports')
  // Held here so switching tabs doesn't drop a verified session
  const [duesAccess, setDuesAccess] = useState<DuesAccess>(null)

  return (
    <div style={{ background: T.surface50, minHeight: '100vh' }}>
      <PageHeader tab={tab} onTab={setTab} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(40px,5vw,64px) clamp(24px,5vw,80px)' }}>
        {tab === 'reports' && <ReportsSection />}
        {tab === 'dues'    && <DuesGate access={duesAccess} onAccess={setDuesAccess} />}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Footer />
    </div>
  )
}
