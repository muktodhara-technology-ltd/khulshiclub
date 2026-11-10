import { useState, useEffect, useRef } from 'react'
import Footer from './Footer'
import SubTabs from './SubTabs'
import SideNavCard from './SideNav'
import { mediaUrl } from '../lib/api/client'
import {
  aboutPageAnchors,
  getAboutPage,
  isAboutMenuPage,
  useAbout,
  type AboutBlock,
} from '../lib/about'
import {
  getMembershipPage,
  isMembershipMenuPage,
  membershipPageAnchors,
  useMembership,
} from '../lib/membership'
import { SITE_W, SITE_HEADER_PAD_INLINE } from '../lib/layout'

// ─── Sibling page definitions ─────────────────────────────────────────────────
export type PageId =
  | 'about-club'
  | 'mission-vision'
  | 'terms'
  | 'refund-policy'
  | 'benefits'
  | 'affiliated-clubs'

type SiblingGroup = { section: string; pages: { id: PageId; label: string }[] }

const SIBLING_GROUPS: SiblingGroup[] = [
  {
    section: 'About',
    pages: [
      { id: 'about-club', label: 'About Club' },
      { id: 'mission-vision', label: 'Mission & Vision' },
      { id: 'terms', label: 'Terms & Conditions' },
      { id: 'refund-policy', label: 'Refund & Return Policy' },
    ],
  },
  {
    section: 'Membership',
    pages: [
      { id: 'benefits', label: 'Benefits of Members' },
      { id: 'affiliated-clubs', label: 'Affiliated Clubs' },
    ],
  },
]

const ALL_PAGES = SIBLING_GROUPS.flatMap((g) => g.pages)

function groupOf(id: PageId) {
  return SIBLING_GROUPS.find((g) => g.pages.some((p) => p.id === id))!
}

function nextPage(id: PageId): { id: PageId; label: string } | null {
  const idx = ALL_PAGES.findIndex((p) => p.id === id)
  return ALL_PAGES[idx + 1] ?? null
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({
  breadcrumb,
  title,
  tabs,
}: {
  breadcrumb: string[]
  title: string
  tabs?: React.ReactNode
}) {
  return (
    <div
      // With mobile tabs the bar sits flush on the header's bottom edge, like the Media Centre
      className={tabs ? 'pb-0 lg:pb-10' : 'pb-10'}
      style={{
        minHeight: 'clamp(200px, 28vw, 320px)',
        background: '#EEF1F5',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        paddingTop: 108, // clears the floating navbar (20px offset + 72px bar) on phones
        // Align with the site content column, like the Media & Resources headers
        paddingInline: SITE_HEADER_PAD_INLINE,
      }}
    >
      {/* Radial glows */}
      <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,51,61,0.10) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '30%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,139,67,0.08) 0%, transparent 65%)', filter: 'blur(48px)', pointerEvents: 'none' }} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4" style={{ position: 'relative', zIndex: 1 }}>
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className="eyebrow"
              style={{ fontSize: 11, color: i < breadcrumb.length - 1 ? '#5C6673' : '#0E1116', cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default' }}
            >
              {crumb}
            </span>
            {i < breadcrumb.length - 1 && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </span>
        ))}
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'CKCL',
          fontWeight: 600,
          fontSize: 'clamp(28px,3.5vw,56px)',
          lineHeight: 1.1,
          letterSpacing: '-0.015em',
          color: '#0E1116',
          margin: 0,
          position: 'relative',
          zIndex: 1,
          maxWidth: 720,
        }}
      >
        {title}
      </h1>

      {tabs && <div className="lg:hidden" style={{ position: 'relative', zIndex: 1, marginTop: 24 }}>{tabs}</div>}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  currentId,
  anchors,
  onNavigate,
}: {
  currentId: PageId
  anchors?: { id: string; label: string }[]
  onNavigate: (id: PageId) => void
}) {
  const group = groupOf(currentId)
  const [activeAnchor, setActiveAnchor] = useState(anchors?.[0]?.id ?? '')

  const scrollTo = (anchorId: string) => {
    const el = document.getElementById(anchorId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveAnchor(anchorId)
  }

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Sibling nav glass card */}
      <SideNavCard section={group.section} pages={group.pages} currentId={currentId} onNavigate={onNavigate} />

      {/* On this page (anchors) */}
      {anchors && anchors.length > 0 && (
        <div style={{ borderRadius: 16, padding: '16px 20px', background: '#F7F8FA', border: '1px solid #E2E6EC' }}>
          <div className="eyebrow mb-3" style={{ fontSize: 10, color: '#A8B0BB' }}>On this page</div>
          <nav className="flex flex-col gap-1">
            {anchors.map((a) => (
              <button
                key={a.id}
                onClick={() => scrollTo(a.id)}
                className="text-left transition-colors"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'CKCL',
                  fontSize: 13,
                  color: activeAnchor === a.id ? '#E10B17' : '#5C6673',
                  padding: '4px 0',
                  fontWeight: activeAnchor === a.id ? 600 : 400,
                  transition: 'color 160ms',
                }}
              >
                {a.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </aside>
  )
}

// ─── Mobile sibling chip row ──────────────────────────────────────────────────
function SiblingTabs({
  currentId,
  onNavigate,
}: {
  currentId: PageId
  onNavigate: (id: PageId) => void
}) {
  return <SubTabs tabs={groupOf(currentId).pages} active={currentId} onChange={onNavigate} />
}

// ─── Long-form content primitives ─────────────────────────────────────────────
function LFH2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      style={{
        fontFamily: 'CKCL',
        fontWeight: 600,
        fontSize: 'clamp(22px,2vw,30px)',
        lineHeight: 1.25,
        letterSpacing: '-0.01em',
        color: '#0E1116',
        margin: '48px 0 16px',
        scrollMarginTop: 140,
      }}
    >
      {children}
    </h2>
  )
}

function LFH3({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      style={{
        fontFamily: 'CKCL',
        fontWeight: 700,
        fontSize: 18,
        lineHeight: 1.3,
        color: '#0E1116',
        margin: '32px 0 12px',
        scrollMarginTop: 140,
      }}
    >
      {children}
    </h3>
  )
}

function LFP({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'CKCL',
        fontSize: 16,
        lineHeight: 1.75,
        color: '#2A3039',
        margin: '0 0 20px',
      }}
    >
      {children}
    </p>
  )
}

function LFUl({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E10B17', flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontFamily: 'CKCL', fontSize: 16, lineHeight: 1.65, color: '#2A3039' }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function LFOl({ items }: { items: string[] }) {
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10, counterReset: 'lf-ol' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'CKCL',
              fontSize: 11,
              fontWeight: 500,
              color: '#E10B17',
              letterSpacing: '0.04em',
              minWidth: 24,
              marginTop: 3,
            }}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: 'CKCL', fontSize: 16, lineHeight: 1.65, color: '#2A3039' }}>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function LFBlockquote({ children, attribution }: { children: React.ReactNode; attribution?: string }) {
  return (
    <blockquote
      style={{
        margin: '32px 0',
        paddingLeft: 24,
        borderLeft: '3px solid #B98B43',
      }}
    >
      <p
        style={{
          fontFamily: 'CKCL',
          fontWeight: 500,
          fontStyle: 'italic',
          fontSize: 20,
          lineHeight: 1.55,
          color: '#0E1116',
          margin: 0,
        }}
      >
        {children}
      </p>
      {attribution && (
        <div
          className="eyebrow mt-3"
          style={{ fontSize: 10, color: '#B98B43' }}
        >
          {attribution}
        </div>
      )}
    </blockquote>
  )
}

function LFCallout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#FFF1F2',
        borderRadius: 12,
        padding: '20px 24px',
        borderLeft: '3px solid #E10B17',
        margin: '24px 0',
      }}
    >
      <div style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.65, color: '#2A3039' }}>{children}</div>
    </div>
  )
}

function LFLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={href}
      style={{
        color: '#E10B17',
        textDecoration: 'underline',
        textDecorationColor: hovered ? '#E10B17' : 'rgba(225,11,23,0.40)',
        transition: 'text-decoration-color 160ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </a>
  )
}

function LFImage({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure style={{ margin: '32px 0' }}>
      <div style={{ borderRadius: 16, overflow: 'hidden', background: '#EEF1F5' }}>
        <img src={src} alt={alt} style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 400 }} />
      </div>
      <figcaption
        style={{
          fontFamily: 'CKCL',
          fontSize: 13,
          color: '#5C6673',
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        {caption}
      </figcaption>
    </figure>
  )
}

function ClauseSection({ num, title, children, id }: { num: number; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ marginBottom: 40, scrollMarginTop: 140 }}>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="eyebrow" style={{ fontSize: 11, color: '#E10B17', flexShrink: 0 }}>{String(num).padStart(2, '0')}</span>
        <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, lineHeight: 1.25, color: '#0E1116', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ paddingLeft: 32 }}>{children}</div>
    </section>
  )
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid #E2E6EC', margin: '40px 0' }} />
}

// ─── Next page card ───────────────────────────────────────────────────────────
function NextPageCard({ page, onNavigate }: { page: { id: PageId; label: string }; onNavigate: (id: PageId) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={() => onNavigate(page.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center justify-between p-6 mt-12 transition-all"
      style={{
        background: hovered ? '#FFF1F2' : '#F7F8FA',
        border: `1px solid ${hovered ? '#E10B17' : '#E2E6EC'}`,
        borderRadius: 16,
        cursor: 'pointer',
        transition: 'all 200ms',
      }}
    >
      <div>
        <div className="eyebrow mb-1" style={{ fontSize: 10, color: '#A8B0BB' }}>Next</div>
        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: '#0E1116' }}>{page.label}</div>
      </div>
      <svg
        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E10B17" strokeWidth="2.5"
        style={{ transform: hovered ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 200ms', flexShrink: 0 }}
      >
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>
  )
}

// ─── Content from Website Maintenance → About / Membership (block editor) ────


function listItems(items: unknown[] | undefined): string[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => (typeof item === 'string' ? item : String((item as { text?: string })?.text || '')))
    .filter((t) => t.trim())
}

function PlainList({ items, numbered }: { items: string[]; numbered: boolean }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: numbered ? 14 : 12 }}>
          {numbered ? (
            <span
              style={{
                flexShrink: 0,
                fontFamily: 'CKCL',
                fontSize: 11,
                fontWeight: 500,
                color: '#E10B17',
                letterSpacing: '0.04em',
                minWidth: 24,
                marginTop: 3,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
          ) : (
            <span style={{ color: '#E10B17', fontWeight: 700, fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>•</span>
          )}
          <span style={{ fontFamily: 'CKCL', fontSize: 16, lineHeight: 1.65, color: '#2A3039' }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function renderBlock(b: AboutBlock, key: number) {
  const text = (b.text || '').trim()
  const extra = (b.extra || '').trim()
  switch (b.type) {
    case 'heading':
      return text ? <LFH2 key={key}>{text}</LFH2> : null
    case 'subheading':
      return text ? <LFH3 key={key}>{text}</LFH3> : null
    case 'bullets': {
      const items = listItems(b.items)
      return items.length ? <PlainList key={key} items={items} numbered={false} /> : null
    }
    case 'numbers': {
      const items = listItems(b.items)
      return items.length ? <PlainList key={key} items={items} numbered /> : null
    }
    case 'quote':
      return text ? (
        <LFBlockquote key={key} attribution={extra || undefined}>
          {text}
        </LFBlockquote>
      ) : null
    case 'callout':
      return text ? <LFCallout key={key}>{text}</LFCallout> : null
    case 'image': {
      const src = mediaUrl(b.preview || b.image || '') || ''
      return src ? <LFImage key={key} src={src} alt={extra || text || ''} caption={extra || text || ''} /> : null
    }
    case 'paragraph':
      return text ? <LFP key={key}>{text}</LFP> : null
    case 'link':
      if (!text && !extra) return null
      return (
        <LFP key={key}>
          <LFLink href={extra || '#'}>{text || extra}</LFLink>
        </LFP>
      )
    case 'divider':
      return <hr key={key} style={{ border: 0, borderTop: '1px solid #E2E6EC', margin: '28px 0' }} />
    default:
      return null
  }
}

/** Numbered clauses wrap the blocks that follow them, up to the next clause. */
function BlockContent({ blocks }: { blocks: AboutBlock[] }) {
  const out: React.ReactNode[] = []
  let clauseNum = 0
  let clause: { id: string; number: number; title: string; body: React.ReactNode[] } | null = null
  const flush = () => {
    if (clause) {
      out.push(
        <ClauseSection key={clause.id} num={clause.number} title={clause.title} id={clause.id}>
          {clause.body}
        </ClauseSection>
      )
    }
    clause = null
  }
  blocks.forEach((b, i) => {
    if (b.type === 'clause') {
      flush()
      const title = (b.text || '').trim()
      if (!title) return
      clauseNum += 1
      clause = { id: `clause-${clauseNum}`, number: clauseNum, title, body: [] }
      return
    }
    const el = renderBlock(b, i)
    if (!el) return
    if (clause) clause.body.push(el)
    else out.push(el)
  })
  flush()
  return <div>{out}</div>
}

function ContentEmpty({ area = 'About' }: { area?: string }) {
  return (
    <p style={{ fontFamily: 'CKCL', fontSize: 16, color: '#5C6673', lineHeight: 1.6 }}>
      This page has no published content yet. Add it in Website Maintenance → {area}.
    </p>
  )
}

function ContentLoading() {
  return (
    <div style={{ padding: '24px 0' }}>
      {[100, 92, 96, 60, 0, 100, 88, 70].map((w, i) => (
        <div key={i} style={{ height: w ? 14 : 24, width: `${w}%`, background: w ? '#EEF1F5' : 'transparent', borderRadius: 6, marginBottom: 14 }} />
      ))}
    </div>
  )
}

// ─── Page config map ──────────────────────────────────────────────────────────
type PageConfig = {
  title: string
  breadcrumb: string[]
  anchors?: { id: string; label: string }[]
  content: React.FC
}

const PAGE_CONFIG: Record<PageId, PageConfig> = {
  'about-club': {
    title: 'About Club',
    breadcrumb: ['Home', 'About', 'About Club'],
    content: ContentEmpty,
  },
  'mission-vision': {
    title: 'Mission & Vision',
    breadcrumb: ['Home', 'About', 'Mission & Vision'],
    content: ContentEmpty,
  },
  'terms': {
    title: 'Terms & Conditions',
    breadcrumb: ['Home', 'About', 'Terms & Conditions'],
    content: ContentEmpty,
  },
  'refund-policy': {
    title: 'Refund & Return Policy',
    breadcrumb: ['Home', 'About', 'Refund & Return Policy'],
    content: ContentEmpty,
  },
  'benefits': {
    title: 'Benefits of Members',
    breadcrumb: ['Home', 'Membership', 'Benefits of Members'],
    content: ContentEmpty,
  },
  'affiliated-clubs': {
    title: 'Affiliated Clubs',
    breadcrumb: ['Home', 'Membership', 'Affiliated Clubs'],
    content: ContentEmpty,
  },
}

// ─── Inner Page shell ─────────────────────────────────────────────────────────
export default function InnerPage({
  pageId,
  onNavigate,
}: {
  pageId: PageId
  onNavigate: (id: PageId | 'home') => void
}) {
  const config = PAGE_CONFIG[pageId]
  const next = nextPage(pageId)
  const aboutMenu = isAboutMenuPage(pageId)
  const membershipMenu = isMembershipMenuPage(pageId)
  const { about, fromApi: aboutFromApi, loading: aboutLoading, error: aboutError } = useAbout()
  const { membership, fromApi: membershipFromApi, loading: membershipLoading, error: membershipError } = useMembership()
  const error = aboutMenu ? aboutError : membershipMenu ? membershipError : null

  const livePage = aboutMenu
    ? getAboutPage(about, pageId)
    : membershipMenu
      ? getMembershipPage(membership, pageId)
      : null
  const liveBlocks = livePage?.blocks?.filter(Boolean) || []
  const title = (livePage?.title || '').trim() || config.title
  const cmsAnchors = aboutMenu
    ? aboutPageAnchors(livePage)
    : membershipMenu
      ? membershipPageAnchors(livePage)
      : []
  const anchors = cmsAnchors.length ? cmsAnchors : config.anchors
  const fromApi = aboutMenu ? aboutFromApi : membershipMenu ? membershipFromApi : false
  const loading = aboutMenu ? aboutLoading : membershipMenu ? membershipLoading : false
  const emptyArea = aboutMenu ? 'About' : 'Membership'

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pageId])

  const handleNavigate = (id: PageId) => {
    onNavigate(id)
  }

  let body: React.ReactNode
  if (aboutMenu || membershipMenu) {
    if (loading && !fromApi) body = <ContentLoading />
    else if (fromApi && liveBlocks.length) body = <BlockContent blocks={liveBlocks} />
    else body = <ContentEmpty area={emptyArea} />
  } else {
    body = <ContentEmpty />
  }

  return (
    <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
      <PageHeader
        breadcrumb={[...config.breadcrumb.slice(0, -1), title]}
        title={title}
        tabs={<SiblingTabs currentId={pageId} onNavigate={handleNavigate} />}
      />

      <div
        style={{
          maxWidth: SITE_W,
          margin: '0 auto',
          padding: '0 clamp(24px,5vw,80px)',
          display: 'flex',
          gap: 48,
          alignItems: 'stretch',
        }}
      >
        <div
          className="hidden lg:block"
          style={{
            background: '#FFFFFF',
            borderLeft: '1px solid #E2E6EC',
            borderRight: '1px solid #E2E6EC',
            padding: 'clamp(40px,6vw,80px) 20px',
          }}
        >
          <div style={{ position: 'sticky', top: 120 }}>
            <Sidebar
              key={pageId + (fromApi ? ':live' : '') + (error || '')}
              currentId={pageId}
              anchors={anchors}
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        <main style={{ flex: 1, maxWidth: 720, minWidth: 0, padding: 'clamp(40px,6vw,80px) 0' }}>
          {body}
          {next && <NextPageCard page={next} onNavigate={handleNavigate} />}
        </main>
      </div>

      <Footer />
    </div>
  )
}
