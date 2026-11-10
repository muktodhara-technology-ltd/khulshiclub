import { useState, useEffect, useRef, useCallback } from 'react'
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


function NoticesSection() {
  const [yearFilter, setYearFilter] = useState('')
  const [catFilter, setCatFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<NoticeEntry | null>(null)
  const { data, error, loading, reload } = useNotices()

  if (!data) return loading ? <Loading /> : <LoadError message={error || 'Could not load notices.'} onRetry={reload} />

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
function ArticleDetail({ article: summary, onBack, onOpen }: { article: Article; onBack: () => void; onOpen: (a: Article) => void }) {
  const { data } = useNewsDetail(summary.slug)
  const article = data?.article ?? summary
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

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {['facebook', 'twitter', 'link'].map((s) => (
              <button key={s} style={{ width: 32, height: 32, borderRadius: '50%', background: T.surface100, border: `1px solid ${T.ink100}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.ink400} strokeWidth="2">
                  {s === 'link' ? <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></> : <circle cx="12" cy="12" r="10"/>}
                </svg>
              </button>
            ))}
          </div>
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

function NewsSection() {
  const [viewing, setViewing] = useState<Article | null>(null)
  const { data, error, loading, reload } = useNewsList()
  if (viewing) return <ArticleDetail key={viewing.slug} article={viewing} onBack={() => setViewing(null)} onOpen={setViewing} />
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onChange(Math.max(0, index - 1))
      if (e.key === 'ArrowRight') onChange(Math.min(album.photos.length - 1, index + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, album, onChange, onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(14,17,22,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      {/* Top-right controls */}
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
        <a href={photo.src} download target="_blank" rel="noopener" title="Download photo" style={glassBtn}>{downloadIcon}</a>
        <button style={glassBtn} onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>

      {/* Image */}
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <img src={photo.src} alt={photo.caption ?? album.name} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.50)', display: 'block' }} />

        {/* Prev */}
        {index > 0 && (
          <button
            onClick={() => onChange(index - 1)}
            style={{ ...glassBtn, position: 'absolute', left: -52, width: 44, height: 44 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}

        {/* Next */}
        {index < album.photos.length - 1 && (
          <button
            onClick={() => onChange(index + 1)}
            style={{ ...glassBtn, position: 'absolute', right: -52, width: 44, height: 44 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.90)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>

      {/* Caption bar */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }} onClick={(e) => e.stopPropagation()}>
        {photo.caption && <span style={{ fontFamily: 'CKCL', fontSize: 13, color: 'rgba(255,255,255,0.80)' }}>{photo.caption}</span>}
        <span style={{ fontFamily: 'CKCL', fontSize: 11, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{index + 1} / {album.photos.length}</span>
      </div>

      {/* Keyboard hints */}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'CKCL', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>← → to navigate · ESC to close</span>
      </div>
    </div>
  )
}

function AlbumDetail({ album: summary, onBack }: { album: AlbumEntry; onBack: () => void }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const { data, error, loading, reload } = useAlbumDetail(summary.slug)
  const album = data?.album

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
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 18, color: T.ink900 }}>{summary.name}</div>
          <span className="eyebrow" style={{ fontSize: 10, color: T.ink200, marginLeft: 4 }}>{album?.photos.length ?? summary.count} PHOTOS</span>
        </div>
      </div>

      {/* Masonry-style grid with varied heights */}
      {!album && (loading ? <Loading /> : <LoadError message={error || 'Could not load this album.'} onRetry={reload} />)}
      {album && <div className="masonry-grid">
        {album.photos.map((photo, i) => (
          <div
            key={i}
            className="mb-3 sm:mb-4" style={{ breakInside: 'avoid', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
            onClick={() => setLightbox(i)}
          >
            <img src={photo.src} alt={photo.caption ?? summary.name} loading="lazy" style={{ width: '100%', display: 'block', transition: 'transform 300ms' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }} />
          </div>
        ))}
      </div>}
    </>
  )
}

function GallerySection() {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumEntry | null>(null)
  const { data, error, loading, reload } = useAlbums()

  if (selectedAlbum) return <AlbumDetail album={selectedAlbum} onBack={() => setSelectedAlbum(null)} />
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

function VideoSection() {
  const [playing, setPlaying] = useState<VideoEntry | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const { data, error, loading, reload } = useVideos()

  if (!data) return loading ? <Loading /> : <LoadError message={error || 'Could not load videos.'} onRetry={reload} />
  if (!data.videos.length) return <StateBox>No videos yet.</StateBox>
  const VIDEOS = data.videos

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
export default function MediaCentrePage({ initialTab = 'notices' }: { initialTab?: MediaTab }) {
  const [tab, setTab] = useState<MediaTab>(initialTab)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleTab = useCallback((t: MediaTab) => {
    setTab(t)
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div style={{ background: T.surface50, minHeight: '100vh' }}>
      <PageHeader activeTab={tab} onTab={handleTab} />

      <div
        ref={contentRef}
        style={{ maxWidth: SITE_W, margin: '0 auto', padding: 'clamp(40px,5vw,64px) clamp(24px,5vw,80px)' }}
      >
        {tab === 'notices' && <NoticesSection />}
        {tab === 'news'    && <NewsSection />}
        {tab === 'gallery' && <GallerySection />}
        {tab === 'video'   && <VideoSection />}
      </div>

      <Footer />
    </div>
  )
}
