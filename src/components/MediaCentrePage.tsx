import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { articlePath } from '../lib/routing'
import Footer from './Footer'
import SubTabs from './SubTabs'
import {
  useNotices,
  useNewsList,
  useNewsDetail,
  useAlbums,
  useAlbumDetail,
  useVideos,
  type NoticeEntry,
  type AlbumEntry,
  type AlbumDetailData,
  type Article,
  type VideoEntry,
} from '../lib/media'
import { SITE_W } from '../lib/layout'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  ink900: '#0E1116', ink600: '#2A3039', ink400: '#5C6673', ink200: '#A8B0BB', ink100: '#E2E6EC',
  surface50: '#F7F8FA', surface100: '#EEF1F5',
  brand: '#E10B17', brass: '#B98B43',
}

// ─── Data (club/club-portal/website/media/*) ───────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'Meeting':       { bg: '#EFF6FF', color: '#1D4ED8' },
  'Payment':       { bg: '#FFF7E6', color: '#B98B43' },
  'News clipping': { bg: '#DCFCE7', color: '#16A34A' },
  'Obituary':      { bg: '#F3F4F6', color: '#4B5563' },
}
const catColorOf = (c: string) => CATEGORY_COLORS[c] ?? { bg: '#F3F4F6', color: '#4B5563' }

const CATEGORY_CHIP_COLORS: Record<string, { bg: string; color: string }> = {
  'Event':        { bg: '#FFF1F2', color: '#E10B17' },
  'Announcement': { bg: '#EFF6FF', color: '#1D4ED8' },
  'Club News':    { bg: '#DCFCE7', color: '#16A34A' },
}

// ─── Loading / empty / error states ───────────────────────────────────────────
function StateBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '64px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.ink100}`, fontFamily: 'CKCL', fontSize: 15, color: T.ink400 }}>
      {children}
    </div>
  )
}

function Loading() {
  return (
    <StateBox>
      <div style={{ width: 28, height: 28, margin: '0 auto 12px', borderRadius: '50%', border: `3px solid ${T.ink100}`, borderTopColor: T.brand, animation: 'spin 0.8s linear infinite' }} />
      Loading…
      <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
    </StateBox>
  )
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateBox>
      <div style={{ marginBottom: 14 }}>{message}</div>
      <button onClick={onRetry} style={{ padding: '9px 18px', fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: T.brand, border: 'none', borderRadius: 999, cursor: 'pointer' }}>Try again</button>
    </StateBox>
  )
}

const downloadIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>

// ─── Tab navigation ───────────────────────────────────────────────────────────
type MediaTab = 'notices' | 'news' | 'gallery' | 'video'
const TABS: { id: MediaTab; label: string }[] = [
  { id: 'notices', label: 'Notices' },
  { id: 'news',    label: 'News & Events' },
  { id: 'gallery', label: 'Photo Gallery' },
  { id: 'video',   label: 'Video Gallery' },
]

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({ activeTab, onTab }: { activeTab: MediaTab; onTab: (t: MediaTab) => void }) {
  return (
    <div
      style={{
        minHeight: 'clamp(200px, 28vw, 320px)',
        background: '#EEF1F5',
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(225,11,23,0.09) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div
        style={{
          maxWidth: SITE_W, margin: '0 auto', width: '100%', boxSizing: 'border-box',
          padding: '108px clamp(24px,5vw,80px) 0', // top clears the floating navbar on phones
          position: 'relative', zIndex: 1,
        }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          {['Home', 'Media Centre'].map((c, i, arr) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="eyebrow" style={{ fontSize: 11, color: i < arr.length - 1 ? T.ink400 : T.ink900 }}>{c}</span>
              {i < arr.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
            </span>
          ))}
        </div>
        <div className="eyebrow mb-2" style={{ fontSize: 11, color: T.brass }}>MEDIA</div>
        <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: T.ink900, margin: '0 0 32px' }}>Media Centre.</h1>

        {/* Tab bar */}
        <SubTabs tabs={TABS} active={activeTab} onChange={onTab} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTICES
// ═══════════════════════════════════════════════════════════════════════════════
function PDFViewer({ notice, onClose }: { notice: NoticeEntry; onClose: () => void }) {
  const [zoom, setZoom] = useState(100)
  const isImage = !!notice.fileType && notice.fileType !== 'PDF'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(14,17,22,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        style={{
          background: 'rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'CKCL',
              fontSize: 14, fontWeight: 600, color: '#FFFFFF',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {notice.title}
          </div>
          <div style={{ fontFamily: 'CKCL', fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{notice.date} {notice.year}{notice.size ? ` · ${notice.size}` : ''}</div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Zoom (images only — PDFs use the browser's own viewer controls) */}
          {isImage && <>
          <button onClick={() => setZoom((z) => Math.max(50, z - 25))} style={{ ...glassBtn, color: 'rgba(255,255,255,0.80)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <span style={{ fontFamily: 'CKCL', fontSize: 11, color: 'rgba(255,255,255,0.60)', minWidth: 40, textAlign: 'center' }}>{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(200, z + 25))} style={{ ...glassBtn, color: 'rgba(255,255,255,0.80)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>

          </>}

          {/* Download */}
          {notice.file_url && (
            <a href={notice.file_url} download target="_blank" rel="noopener" title="Download" style={{ ...glassBtn, color: 'rgba(255,255,255,0.80)', marginLeft: 8 }}>
              {downloadIcon}
            </a>
          )}

          {/* Close */}
          <button onClick={onClose} style={{ ...glassBtn, color: 'rgba(255,255,255,0.80)', marginLeft: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Viewer area */}
      <div
        style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: isImage ? 'flex-start' : 'stretch', justifyContent: 'center', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!notice.file_url ? (
          <div style={{ alignSelf: 'center', background: '#FFFFFF', borderRadius: 16, padding: '40px 32px', maxWidth: 420, textAlign: 'center', fontFamily: 'CKCL', fontSize: 15, color: T.ink400 }}>
            The file for this notice hasn't been uploaded yet. Please check back later or contact the club office.
          </div>
        ) : isImage ? (
          <img src={notice.file_url} alt={notice.title} style={{ width: `${zoom}%`, maxWidth: 1000, minWidth: 280, height: 'auto', borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.40)', background: '#FFFFFF', transition: 'width 200ms' }} />
        ) : (
          <iframe src={notice.file_url} title={notice.title} style={{ width: '100%', maxWidth: 960, border: 'none', borderRadius: 8, background: '#FFFFFF', boxShadow: '0 24px 80px rgba(0,0,0,0.40)' }} />
        )}
      </div>

      {/* ESC hint */}
      <div style={{ padding: '10px', textAlign: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'CKCL', fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>Press ESC to close</span>
      </div>
    </div>
  )
}


type ItemProps = { item: string | null; onItem: (item: string | null) => void }

function NoticesSection({ item, onItem }: ItemProps) {
  const [yearFilter, setYearFilter] = useState('')
  const [catFilter, setCatFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const { data, error, loading, reload } = useNotices()

  if (!data) return loading ? <Loading /> : <LoadError message={error || 'Could not load notices.'} onRetry={reload} />

  // Open notice comes from the URL (/media/notices/<id>)
  const viewing = item ? data.notices.find((n) => String(n.id) === item) ?? null : null
  const setViewing = (n: NoticeEntry | null) => onItem(n ? String(n.id) : null)

  const NOTICES = data.notices
  const NOTICE_CATEGORIES = data.categories
  const NOTICE_YEARS = data.years

  const filtered = NOTICES.filter((n) => {
    if (yearFilter && n.year !== yearFilter) return false
    if (catFilter !== 'All' && n.category !== catFilter) return false
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped: { month: string; items: NoticeEntry[] }[] = []
  filtered.forEach((n) => {
    const last = grouped[grouped.length - 1]
    if (!last || last.month !== n.month) grouped.push({ month: n.month, items: [n] })
    else last.items.push(n)
  })

  return (
    <>
      {viewing && <PDFViewer notice={viewing} onClose={() => setViewing(null)} />}

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 28 }}>
        {/* Year select */}
        <div style={{ position: 'relative' }}>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            style={{ appearance: 'none', WebkitAppearance: 'none', padding: '9px 32px 9px 14px', fontFamily: 'CKCL', fontSize: 13, color: T.ink600, background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 10, cursor: 'pointer', outline: 'none' }}
          >
            <option value="">All years</option>
            {NOTICE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2.5" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        {/* Type chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['All', ...NOTICE_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              style={{
                padding: '7px 14px', fontFamily: 'CKCL', fontSize: 12, fontWeight: catFilter === cat ? 700 : 500,
                color: catFilter === cat ? '#FFFFFF' : T.ink400,
                background: catFilter === cat ? T.brand : '#FFFFFF',
                border: `1px solid ${catFilter === cat ? T.brand : T.ink100}`,
                borderRadius: 999, cursor: 'pointer', transition: 'all 160ms',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 10, padding: '9px 14px', flex: '1 1 180px', minWidth: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notices…" style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'CKCL', fontSize: 13, color: T.ink900, flex: 1, minWidth: 0 }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: T.ink200 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
        </div>
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.ink100}` }}>
          <div style={{ fontFamily: 'CKCL', fontSize: 15, color: T.ink400 }}>{NOTICES.length ? 'No notices match that search.' : 'No notices have been published yet.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map((group) => (
            <div key={group.month}>
              <div className="eyebrow mb-3" style={{ fontSize: 10, color: T.brass }}>{group.month.toUpperCase()}</div>
              <div style={{ background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.ink100}`, overflow: 'hidden' }}>
                {group.items.map((n, i) => {
                  const catColor = catColorOf(n.category)
                  return (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '16px 20px',
                        borderBottom: i < group.items.length - 1 ? `1px solid ${T.ink100}` : 'none',
                        transition: 'background 140ms',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.surface50 }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      {/* Date block */}
                      <div style={{ width: 52, height: 52, background: '#FFF1F2', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 17, color: T.brand, lineHeight: 1 }}>{n.date.split(' ')[0]}</span>
                        <span className="eyebrow" style={{ fontSize: 8, color: T.ink400, marginTop: 2 }}>{n.date.split(' ')[1]}</span>
                      </div>

                      {/* Title */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'CKCL',
                            fontSize: n.bangla ? 15 : 14, fontWeight: 500,
                            color: T.ink900, lineHeight: 1.4,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {n.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 9, letterSpacing: '0.06em', color: catColor.color, background: catColor.bg, border: `1px solid ${catColor.color}30`, borderRadius: 999, padding: '3px 8px' }}>{n.category.toUpperCase()}</span>
                          {n.fileType && <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 9, color: T.ink200, background: T.surface100, borderRadius: 999, padding: '3px 8px' }}>{n.fileType}</span>}
                          {n.size && <span style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200 }}>{n.size}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => setViewing(n)}
                          style={{ padding: '8px 16px', fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.brand, background: '#FFF1F2', border: `1px solid rgba(225,11,23,0.20)`, borderRadius: 8, cursor: 'pointer', transition: 'all 140ms' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.brand; (e.currentTarget as HTMLElement).style.color = '#FFFFFF' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#FFF1F2'; (e.currentTarget as HTMLElement).style.color = T.brand }}
                        >
                          View
                        </button>
                        {n.file_url && (
                          <a href={n.file_url} download target="_blank" rel="noopener" title="Download" style={{ width: 34, height: 34, borderRadius: 8, background: T.surface100, border: `1px solid ${T.ink100}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 140ms', color: T.ink400 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.ink100 }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.surface100 }}
                          >
                            {downloadIcon}
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEWS & EVENTS
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Share row on article details: Facebook · WhatsApp · X · LinkedIn · Copy link ───
const SHARE_ICON: Record<string, React.ReactNode> = {
  facebook: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>,
  whatsapp: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 01-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 01-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 016.7 2.78 9.4 9.4 0 012.77 6.7c0 5.23-4.25 9.47-9.47 9.47zm8.06-17.54A11.32 11.32 0 0012.04.62C5.76.62.65 5.73.65 12c0 2.01.52 3.97 1.52 5.7L.55 23.62l6.04-1.58a11.36 11.36 0 005.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.19-5.9-3.33-8.05z"/></svg>,
  x: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z"/></svg>,
  linkedin: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>,
  link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  more: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>,
}
const SHARE_BRAND: Record<string, string> = { facebook: '#1877F2', whatsapp: '#25D366', x: '#0E1116', linkedin: '#0A66C2', link: '#E10B17', more: '#E10B17' }

function ShareButton({ id, label, href, onClick, children }: { id: string; label: string; href?: string; onClick?: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false)
  const style: React.CSSProperties = {
    width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
    background: hover ? SHARE_BRAND[id] : T.surface100,
    border: `1px solid ${hover ? SHARE_BRAND[id] : T.ink100}`,
    color: hover ? '#FFFFFF' : T.ink400,
    transition: 'background 160ms, border-color 160ms, color 160ms, transform 160ms',
    transform: hover ? 'translateY(-2px)' : 'none',
    textDecoration: 'none',
  }
  const events = { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) }
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} style={style} {...events}>{children}</a>
    : <button type="button" onClick={onClick} aria-label={label} title={label} style={style} {...events}>{children}</button>
}

function ShareButtons({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}${articlePath(slug)}` : articlePath(slug)
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for browsers without the async clipboard (or non-HTTPS)
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
      <span className="eyebrow hidden sm:inline" style={{ fontSize: 10, color: T.ink200, marginRight: 2 }}>Share</span>
      <ShareButton id="facebook" label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${u}`}>{SHARE_ICON.facebook}</ShareButton>
      <ShareButton id="whatsapp" label="Share on WhatsApp" href={`https://wa.me/?text=${t}%20${u}`}>{SHARE_ICON.whatsapp}</ShareButton>
      <ShareButton id="x" label="Share on X" href={`https://twitter.com/intent/tweet?url=${u}&text=${t}`}>{SHARE_ICON.x}</ShareButton>
      <ShareButton id="linkedin" label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`}>{SHARE_ICON.linkedin}</ShareButton>
      <ShareButton id="link" label={copied ? 'Link copied' : 'Copy link'} onClick={copy}>{copied ? SHARE_ICON.check : SHARE_ICON.link}</ShareButton>
      {canNativeShare && (
        <ShareButton id="more" label="More share options" onClick={() => { navigator.share({ title, url }).catch(() => {}) }}>{SHARE_ICON.more}</ShareButton>
      )}
      {copied && (
        <span
          role="status"
          style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: '#FFFFFF', background: T.ink900, borderRadius: 8, padding: '6px 10px', whiteSpace: 'nowrap', zIndex: 5 }}
        >
          Link copied
        </span>
      )}
    </div>
  )
}

function ArticleDetail({ slug, article: summary, onBack, onOpen }: { slug: string; article?: Article | null; onBack: () => void; onOpen: (a: Article) => void }) {
  const { data, error, loading, reload } = useNewsDetail(slug)
  const article = data?.article ?? summary ?? null
  // Opened straight from the URL (refresh / shared link): wait for the API
  if (!article) return loading ? <Loading /> : <LoadError message={error || 'Could not load this news item.'} onRetry={reload} />
  const related = data?.related ?? []
  const cc = CATEGORY_CHIP_COLORS[article.category] ?? { bg: T.surface100, color: T.ink400 }
  const bodyParagraphs = article.body ?? []

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.ink400, marginBottom: 28, padding: 0 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = T.ink900 }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = T.ink400 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back to News & Events
      </button>

      {/* Full content width (same as the page container) */}
      <div style={{ width: '100%' }}>
        {/* Hero image */}
        {article.image && (
          <div className="h-[240px] sm:h-[480px]" style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 32 }}>
            <img src={article.image} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Metadata row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className="eyebrow" style={{ fontSize: 10, color: T.ink200 }}>{article.date}</span>
          <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 9, letterSpacing: '0.06em', color: cc.color, background: cc.bg, borderRadius: 999, padding: '4px 10px' }}>{article.category.toUpperCase()}</span>
          <ShareButtons slug={article.slug} title={article.title} />
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(26px,3.5vw,44px)', color: T.ink900, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 28 }}>{article.title}</h1>

        {/* Body */}
        {bodyParagraphs.length > 0 ? (
          <>
            {bodyParagraphs.map((para, i) => (
              <p key={i} style={{ fontFamily: 'CKCL', fontSize: 17, lineHeight: 1.75, color: T.ink600, marginBottom: 20 }}>{para}</p>
            ))}
          </>
        ) : (
          <p style={{ fontFamily: 'CKCL', fontSize: 17, lineHeight: 1.75, color: T.ink600 }}>{article.excerpt}</p>
        )}

        {/* Related news */}
        {related.length > 0 && <div style={{ marginTop: 56, paddingTop: 32, borderTop: `1px solid ${T.ink100}` }}>
          <div className="eyebrow mb-5" style={{ fontSize: 10, color: T.brass }}>RELATED NEWS</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {related.map((a) => {
              const acc = CATEGORY_CHIP_COLORS[a.category] ?? { bg: T.surface100, color: T.ink400 }
              return (
                <div key={a.id} onClick={() => { onOpen(a); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ background: '#FFFFFF', borderRadius: 16, border: `1px solid ${T.ink100}`, overflow: 'hidden', cursor: 'pointer' }}>
                  <div className="h-[110px] sm:h-[140px]" style={{ overflow: 'hidden', background: T.surface100 }}>
                    {a.image && <img src={a.image} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 400ms' }} />}
                  </div>
                  <div className="p-3 sm:px-4 sm:py-3.5">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      <span className="eyebrow" style={{ fontSize: 9, color: T.ink200 }}>{a.date}</span>
                      <span style={{ fontFamily: 'CKCL', fontSize: 9, color: acc.color, background: acc.bg, borderRadius: 999, padding: '2px 7px' }}>{a.category.toUpperCase()}</span>
                    </div>
                    <div className="text-[13px] sm:text-[14px]" style={{ fontFamily: 'CKCL', fontWeight: 600, color: T.ink900, lineHeight: 1.3 }}>{a.title}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>}
      </div>
    </div>
  )
}

function NewsSection({
  item: slug,
  articleHint = null,
  onArticle,
}: {
  item: string | null
  articleHint?: Article | null
  onArticle: (a: Article | null) => void
}) {
  // Open article comes from the URL (/media/news/<slug>); the hint shows it instantly while the API loads
  const setViewing = onArticle
  const { data, error, loading, reload } = useNewsList()
  if (slug) {
    const summary = articleHint?.slug === slug ? articleHint : data?.featured?.slug === slug ? data.featured : data?.articles.find((a) => a.slug === slug) ?? null
    return <ArticleDetail key={slug} slug={slug} article={summary} onBack={() => setViewing(null)} onOpen={setViewing} />
  }
  if (!data) return loading ? <Loading /> : <LoadError message={error || 'Could not load news.'} onRetry={reload} />
  if (!data.featured) return <StateBox>No news has been published yet.</StateBox>

  const featured = data.featured
  const rest = data.articles
  const fcc = CATEGORY_CHIP_COLORS[featured.category] ?? { bg: T.surface100, color: T.ink400 }

  return (
    <>
      {/* Featured */}
      <div
        style={{ background: '#FFFFFF', borderRadius: 24, border: `1px solid ${T.ink100}`, overflow: 'hidden', marginBottom: 28, cursor: 'pointer', display: 'grid' }}
        onClick={() => setViewing(featured)}
        // Phones: image stacked above the text; tablet up: side by side
        className="grid-cols-1 sm:grid-cols-2"
      >
        <div className="h-[200px] sm:h-auto sm:min-h-[280px]" style={{ overflow: 'hidden', background: T.surface100 }}>
          {featured.image && <img src={featured.image} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 400ms' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }} />}
        </div>
        <div style={{ padding: 'clamp(24px,4vw,40px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <span className="eyebrow" style={{ fontSize: 10, color: T.ink200 }}>{featured.date}</span>
            <span style={{ fontFamily: 'CKCL', fontSize: 9, letterSpacing: '0.06em', color: fcc.color, background: fcc.bg, borderRadius: 999, padding: '3px 8px' }}>{featured.category.toUpperCase()}</span>
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontFamily: 'CKCL', fontSize: 9, letterSpacing: '0.06em', borderRadius: 999, padding: '3px 8px' }}>FEATURED</span>
          </div>
          <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(20px,2.5vw,30px)', color: T.ink900, lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 12 }}>{featured.title}</h2>
          <p style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.65, color: T.ink400, marginBottom: 20 }}>{featured.excerpt}</p>
          <a href="#" onClick={(e) => { e.preventDefault(); setViewing(featured) }} style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 700, color: T.brand, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
            Read article <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
        {rest.map((a) => {
          const acc = CATEGORY_CHIP_COLORS[a.category] ?? { bg: T.surface100, color: T.ink400 }
          return (
            <div key={a.id} style={{ background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.ink100}`, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 200ms, transform 200ms' }}
              onClick={() => setViewing(a)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(14,17,22,0.10)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
            >
              <div className="h-[120px] sm:h-[200px]" style={{ overflow: 'hidden', background: T.surface100 }}>
                {a.image && <img src={a.image} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
              <div className="p-3 sm:px-5 sm:py-[18px]">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span className="eyebrow" style={{ fontSize: 9, color: T.ink200 }}>{a.date}</span>
                  <span style={{ fontFamily: 'CKCL', fontSize: 9, color: acc.color, background: acc.bg, borderRadius: 999, padding: '3px 8px' }}>{a.category.toUpperCase()}</span>
                </div>
                <h3 className="text-[14px] sm:text-[17px]" style={{ fontFamily: 'CKCL', fontWeight: 600, color: T.ink900, lineHeight: 1.25, letterSpacing: '-0.01em', marginBottom: 6 }}>{a.title}</h3>
                <p className="text-[12px] sm:text-[13px]" style={{ fontFamily: 'CKCL', lineHeight: 1.55, color: T.ink400, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.excerpt}</p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHOTO GALLERY
// ═══════════════════════════════════════════════════════════════════════════════
type LightboxState = { album: AlbumDetailData; index: number } | null

function Lightbox({ state, onChange, onClose }: { state: NonNullable<LightboxState>; onChange: (i: number) => void; onClose: () => void }) {
  const { album, index } = state
  const photo = album.photos[index]

  const last = album.photos.length - 1
  const prev = useCallback(() => onChange(Math.max(0, index - 1)), [index, onChange])
  const next = useCallback(() => onChange(Math.min(last, index + 1)), [index, last, onChange])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next, onClose])

  // Lock page scroll while open; warm the neighbouring photos so the next click is instant.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      const src = album.photos[i]?.src
      if (src) { const img = new Image(); img.src = src }
    }
  }, [index, album])

  // Prev/next sit at fixed spots on the screen edges, so they never move when the photo size changes.
  const navBtn = (side: 'left' | 'right'): React.CSSProperties => ({
    ...glassBtn, position: 'fixed', top: '50%', transform: 'translateY(-50%)', [side]: 'max(12px, 2vw)', width: 48, height: 48, zIndex: 2, cursor: 'pointer',
  })

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={album.name}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,17,22,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      {/* Top-right controls */}
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8, zIndex: 2 }} onClick={(e) => e.stopPropagation()}>
        <a href={photo.src} download target="_blank" rel="noopener" title="Download photo" style={glassBtn}>{downloadIcon}</a>
        <button type="button" aria-label="Close" style={{ ...glassBtn, cursor: 'pointer' }} onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>

      {/* Image (full photo, never cropped) */}
      <img
        key={photo.src}
        src={photo.src}
        alt={photo.caption ?? album.name}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 'calc(100vw - 140px)', maxHeight: '82vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.50)', display: 'block' }}
      />

      {index > 0 && (
        <button type="button" aria-label="Previous photo" style={navBtn('left')} onClick={(e) => { e.stopPropagation(); prev() }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}
      {index < last && (
        <button type="button" aria-label="Next photo" style={navBtn('right')} onClick={(e) => { e.stopPropagation(); next() }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {/* Caption bar */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }} onClick={(e) => e.stopPropagation()}>
        {photo.caption && <span style={{ fontFamily: 'CKCL', fontSize: 13, color: 'rgba(255,255,255,0.80)' }}>{photo.caption}</span>}
        <span style={{ fontFamily: 'CKCL', fontSize: 11, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{index + 1} / {album.photos.length}</span>
      </div>

      {/* Keyboard hints */}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'CKCL', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>← → to navigate · ESC to close</span>
      </div>
    </div>,
    document.body,
  )
}

function AlbumDetail({ slug, album: summary, onBack }: { slug: string; album?: AlbumEntry | null; onBack: () => void }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const { data, error, loading, reload } = useAlbumDetail(slug)
  const album = data?.album
  const albumName = album?.name ?? summary?.name ?? ''

  return (
    <>
      {album && lightbox !== null && (
        <Lightbox
          state={{ album, index: lightbox }}
          onChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Sticky album header */}
      <div
        ref={headerRef}
        style={{
          position: 'sticky', top: 80, zIndex: 30,
          background: 'rgba(247,248,250,0.90)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${T.ink100}`,
          padding: '14px 0',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.ink400, padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Albums
          </button>
          <span style={{ color: T.ink200 }}>·</span>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 18, color: T.ink900 }}>{albumName}</div>
          <span className="eyebrow" style={{ fontSize: 10, color: T.ink200, marginLeft: 4 }}>{album?.photos.length ?? summary?.count ?? 0} PHOTOS</span>
        </div>
      </div>

      {/* Uniform grid: every tile the same 3:2 size; click opens the full photo in the lightbox */}
      {!album && (loading ? <Loading /> : <LoadError message={error || 'Could not load this album.'} onRetry={reload} />)}
      {album && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {album.photos.map((photo, i) => (
          <button
            type="button"
            key={i}
            aria-label={`Open photo ${i + 1} of ${album.photos.length}`}
            style={{ aspectRatio: '3/2', borderRadius: 14, overflow: 'hidden', cursor: 'zoom-in', position: 'relative', padding: 0, border: 0, background: T.surface100, display: 'block', width: '100%' }}
            onClick={() => setLightbox(i)}
          >
            <img src={photo.src} alt={photo.caption ?? albumName} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 300ms' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }} />
          </button>
        ))}
      </div>}
    </>
  )
}

function GallerySection({ item, onItem }: ItemProps) {
  const { data, error, loading, reload } = useAlbums()
  const setSelectedAlbum = (a: AlbumEntry | null) => onItem(a ? a.slug : null)

  // Open album comes from the URL (/media/gallery/<slug>)
  if (item) return <AlbumDetail key={item} slug={item} album={data?.albums.find((a) => a.slug === item) ?? null} onBack={() => setSelectedAlbum(null)} />
  if (!data) return loading ? <Loading /> : <LoadError message={error || 'Could not load the gallery.'} onRetry={reload} />
  if (!data.albums.length) return <StateBox>No photo albums yet.</StateBox>
  const ALBUMS = data.albums

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
      {ALBUMS.map((album) => {
        return (
          <div
            key={album.id}
            style={{ borderRadius: 20, overflow: 'hidden', cursor: 'pointer', background: T.surface100, position: 'relative', aspectRatio: '4/3' }}
            onClick={() => setSelectedAlbum(album)}
            onMouseEnter={(e) => {
              const img = e.currentTarget.querySelector('img') as HTMLImageElement | null
              if (img) img.style.transform = 'scale(1.05)'
              const stacked = e.currentTarget.querySelectorAll('.stack-layer') as NodeListOf<HTMLElement>
              stacked.forEach((el, i) => { el.style.transform = `translateX(${(i + 1) * 6}px) rotate(${(i + 1) * 2}deg) scale(0.97)` })
            }}
            onMouseLeave={(e) => {
              const img = e.currentTarget.querySelector('img') as HTMLImageElement | null
              if (img) img.style.transform = 'scale(1)'
              const stacked = e.currentTarget.querySelectorAll('.stack-layer') as NodeListOf<HTMLElement>
              stacked.forEach((el) => { el.style.transform = '' })
            }}
          >
            {/* Stacked-photo depth effect */}
            <div className="stack-layer" style={{ position: 'absolute', inset: 4, borderRadius: 16, background: '#D4D8E0', transition: 'transform 260ms ease-out', zIndex: 0, right: 8 }} />
            <div className="stack-layer" style={{ position: 'absolute', inset: 2, borderRadius: 17, background: '#C8CDD6', transition: 'transform 260ms ease-out 40ms', zIndex: 1, right: 12 }} />

            {/* Main card */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', zIndex: 2 }}>
              {album.cover && <img src={album.cover} alt={album.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 400ms ease-out' }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,17,22,0.70) 0%, transparent 55%)' }} />

              {/* Glass bottom panel */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }} className="px-3 py-2.5 sm:px-[18px] sm:py-3.5">
                <div style={{ minWidth: 0 }}>
                  <div className="text-[12px] sm:text-[14px] truncate" style={{ fontFamily: 'CKCL', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}>{album.name}</div>
                  <div className="text-[9px] sm:text-[10px]" style={{ fontFamily: 'CKCL', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{album.count} PHOTOS{album.year ? ` · ${album.year}` : ''}</div>
                </div>
                <div className="hidden sm:flex" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO GALLERY
// ═══════════════════════════════════════════════════════════════════════════════
function VideoModal({ video, onClose }: { video: VideoEntry; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(14,17,22,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, width: '100%', maxWidth: 860, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.50)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Player: YouTube/Vimeo embed, otherwise the thumbnail with a link out */}
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
          {video.embed_url ? (
            <iframe
              src={`${video.embed_url}${video.embed_url.includes('?') ? '&' : '?'}autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <>
              {video.thumb && <img src={video.thumb} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.55 }} />}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
                {video.video_url ? (
                  <a href={video.video_url} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: '#FFFFFF', background: T.brand, borderRadius: 999, textDecoration: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Watch video
                  </a>
                ) : (
                  <div style={{ fontFamily: 'CKCL', fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>This video will be available soon.</div>
                )}
              </div>
            </>
          )}
          <button onClick={onClose} aria-label="Close" style={{ ...glassBtn, position: 'absolute', top: 12, right: 12, zIndex: 2 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {/* Info */}
        <div style={{ padding: '20px 24px 24px' }}>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: '#FFFFFF', marginBottom: 6 }}>{video.title}</div>
          {video.description && <div style={{ fontFamily: 'CKCL', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{video.description}</div>}
        </div>
      </div>
    </div>
  )
}

function VideoSection({ item, onItem }: ItemProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const { data, error, loading, reload } = useVideos()

  if (!data) return loading ? <Loading /> : <LoadError message={error || 'Could not load videos.'} onRetry={reload} />
  if (!data.videos.length) return <StateBox>No videos yet.</StateBox>
  const VIDEOS = data.videos
  // Playing video comes from the URL (/media/video/<id>)
  const playing = item ? VIDEOS.find((v) => String(v.id) === item) ?? null : null
  const setPlaying = (v: VideoEntry | null) => onItem(v ? String(v.id) : null)

  return (
    <>
      {playing && <VideoModal video={playing} onClose={() => setPlaying(null)} />}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {VIDEOS.map((v) => (
          <div
            key={v.id}
            onClick={() => setPlaying(v)}
            onMouseEnter={() => setHovered(v.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.ink100}`, overflow: 'hidden', cursor: 'pointer', transform: hovered === v.id ? 'translateY(-4px)' : '', boxShadow: hovered === v.id ? '0 12px 32px rgba(14,17,22,0.10)' : '', transition: 'all 220ms' }}
          >
            {/* 16:9 thumbnail */}
            <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: '#111' }}>
              {v.thumb && <img src={v.thumb} alt={v.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 400ms', transform: hovered === v.id ? 'scale(1.04)' : 'scale(1)' }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,17,22,0.28)' }} />

              {/* Centred play button */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  className="w-10 h-10 sm:w-16 sm:h-16"
                  style={{
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.30)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: hovered === v.id ? 'scale(1.10)' : 'scale(1)',
                    transition: 'transform 260ms ease-out',
                  }}
                >
                  <svg className="w-4 h-4 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="#FFFFFF"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>

              {/* Duration chip */}
              {v.duration && <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(14,17,22,0.75)', borderRadius: 6, padding: '3px 8px', fontFamily: 'CKCL', fontSize: 11, color: '#FFFFFF', fontWeight: 500 }}>{v.duration}</div>}
            </div>

            {/* Info */}
            <div className="p-3 sm:px-[18px] sm:py-4">
              <span className="eyebrow" style={{ fontSize: 9, color: T.ink200, display: 'block', marginBottom: 6 }}>{v.date}</span>
              <div className="text-[13px] sm:text-[16px]" style={{ fontFamily: 'CKCL', fontWeight: 600, color: T.ink900, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{v.title}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Shared glass button style ─────────────────────────────────────────────────
const glassBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%',
  background: 'rgba(255,255,255,0.10)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 160ms',
  color: 'rgba(255,255,255,0.80)',
}

// ─── Page ─────────────────────────────────────────────────────────────────────
/**
 * Media Centre is driven by the URL: /media/<tab> for a tab, /media/<tab>/<item> for an open
 * notice, article, album or video. The app owns tab + item and syncs them to the address bar,
 * so a refresh or shared link reopens the same view.
 */
export default function MediaCentrePage({
  tab,
  item = null,
  articleHint = null,
  onChange,
}: {
  tab: MediaTab
  item?: string | null
  articleHint?: Article | null
  onChange: (tab: MediaTab, item: string | null, articleHint?: Article | null) => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)

  const handleTab = useCallback((t: MediaTab) => {
    onChange(t, null)
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [onChange])
  const onItem = (next: string | null) => onChange(tab, next)

  return (
    <div style={{ background: T.surface50, minHeight: '100vh' }}>
      <PageHeader activeTab={tab} onTab={handleTab} />

      <div
        ref={contentRef}
        style={{ maxWidth: SITE_W, margin: '0 auto', padding: 'clamp(40px,5vw,64px) clamp(24px,5vw,80px)' }}
      >
        {tab === 'notices' && <NoticesSection item={item} onItem={onItem} />}
        {tab === 'news'    && <NewsSection item={item} articleHint={articleHint} onArticle={(a) => onChange('news', a?.slug ?? null, a)} />}
        {tab === 'gallery' && <GallerySection item={item} onItem={onItem} />}
        {tab === 'video'   && <VideoSection item={item} onItem={onItem} />}
      </div>

      <Footer />
    </div>
  )
}
