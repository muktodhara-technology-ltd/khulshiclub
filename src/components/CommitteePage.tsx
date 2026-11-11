import { useState, useEffect } from 'react'
import Footer from './Footer'
import SubTabs from './SubTabs'
import SideNavCard from './SideNav'
import PersonPortrait from './PersonPortrait'
import { formatCommitteeTerm, useAbout } from '../lib/about'
import { SITE_W, SITE_HEADER_PAD_INLINE } from '../lib/layout'

// ─── Member data ──────────────────────────────────────────────────────────────
type MemberTier = 'Office Bearer' | 'Member'

type CommitteeMember = {
  id: number
  name: string
  designation: string
  company: string
  tier: MemberTier
  /** API photo URL; empty → initial letter is shown instead. */
  photo: string | null
  bio: string
}

/** Roster from Website Maintenance → About API (no local dummy). */

type FilterType = 'All' | 'Office Bearers' | 'Members'

// Shown on their own row above the rest of the committee
const LEADER_ROLES = ['President', 'Vice President', 'Founding President', 'Founding Vice President']

// ─── Member card ──────────────────────────────────────────────────────────────
function MemberCard({
  member,
  featured,
  onClick,
}: {
  member: CommitteeMember
  featured?: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      aria-label={`View profile of ${member.name}`}
    >
      {/* Photo container — square corners; name sits on the image so empty photos still read clearly */}
      <div
        style={{
          position: 'relative',
          aspectRatio: featured ? '3 / 4' : '4 / 5',
          borderRadius: 0,
          overflow: 'hidden',
          border: hovered ? `${featured ? 2 : 1}px solid #E10B17` : featured ? '2px solid #B98B43' : '1px solid rgba(185,139,67,0.45)',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: hovered
            ? '0 16px 48px -8px rgba(14,17,22,0.14), 0 4px 12px rgba(14,17,22,0.08)'
            : '0 8px 24px rgba(14,17,22,0.06)',
          transition: 'all 240ms ease-out',
        }}
      >
        <PersonPortrait src={member.photo} name={member.name} />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(10,13,16,0.92) 0%, rgba(10,13,16,0.55) 32%, transparent 58%)',
            pointerEvents: 'none',
          }}
        />

        <div
          className="absolute"
          style={{ left: 0, right: 0, bottom: 0, padding: featured ? 18 : 14, textAlign: 'left' }}
        >
          <div
            className="eyebrow"
            style={{
              display: 'inline-block',
              fontSize: 9,
              color: '#E8C584',
              borderRadius: 999,
              padding: '3px 9px',
              letterSpacing: '0.10em',
              background: 'rgba(14,17,22,0.35)',
              border: '1px solid rgba(232,197,132,0.35)',
              marginBottom: 8,
            }}
          >
            {member.tier === 'Office Bearer' ? 'Office Bearer' : member.tier || 'Member'}
          </div>
          <div
            style={{
              fontFamily: 'CKCL',
              fontWeight: 700,
              fontSize: featured ? 18 : 16,
              lineHeight: 1.25,
              color: '#FFFFFF',
              marginBottom: 4,
            }}
          >
            {member.name}
          </div>
          <div
            style={{
              fontFamily: 'CKCL',
              fontWeight: 600,
              fontSize: featured ? 13 : 12,
              color: hovered ? '#FFD0D3' : 'rgba(255,255,255,0.92)',
              marginBottom: 2,
              transition: 'color 160ms',
            }}
          >
            {member.designation}
          </div>
          {member.company ? (
            <div
              style={{
                fontFamily: 'CKCL',
                fontSize: 12,
                color: 'rgba(255,255,255,0.72)',
                lineHeight: 1.35,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {member.company}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function MemberModal({
  member,
  onClose,
}: {
  member: CommitteeMember
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(14,17,22,0.60)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="glass-strong relative w-full max-w-2xl"
        style={{
          borderRadius: 0,
          overflow: 'hidden',
          animation: 'fadeUp 240ms ease-out both',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 glass-strong flex items-center justify-center transition-colors"
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer' }}
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E1116" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Portrait */}
          <div
            style={{
              width: '100%',
              flexShrink: 0,
              aspectRatio: '4 / 3',
              background: '#EEF1F5',
              position: 'relative',
            }}
            className="sm:w-56 sm:aspect-auto sm:min-h-full"
          >
            <PersonPortrait src={member.photo} name={member.name} style={{ minHeight: 280 }} />
            {/* Tier chip */}
            <div
              className="absolute bottom-3 left-3 glass-strong eyebrow"
              style={{ fontSize: 9, color: '#B98B43', borderRadius: 999, padding: '4px 10px' }}
            >
              {/* Same label as the card — the tier set in About → Committee */}
              {member.tier === 'Office Bearer' ? 'Office Bearer' : member.tier || 'Member'}
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '28px 32px', flex: 1, minWidth: 0 }}>
            <div className="eyebrow mb-2" style={{ fontSize: 10, color: '#B98B43' }}>Executive Committee</div>
            <h2
              style={{
                fontFamily: 'CKCL',
                fontWeight: 600,
                fontSize: 'clamp(20px,2vw,26px)',
                lineHeight: 1.2,
                color: '#0E1116',
                margin: '0 0 6px',
              }}
            >
              {member.name}
            </h2>
            <div
              style={{
                fontFamily: 'CKCL',
                fontWeight: 600,
                fontSize: 14,
                color: '#E10B17',
                marginBottom: 2,
              }}
            >
              {member.designation}
            </div>
            <div
              style={{
                fontFamily: 'CKCL',
                fontSize: 13,
                color: '#5C6673',
                marginBottom: 20,
              }}
            >
              {member.company}
            </div>

            <div
              style={{
                height: 1,
                background: '#E2E6EC',
                marginBottom: 20,
              }}
            />

            <p
              style={{
                fontFamily: 'CKCL',
                fontSize: 14,
                lineHeight: 1.75,
                color: '#2A3039',
                margin: 0,
              }}
            >
              {member.bio}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page header (self-contained, no InnerPage dependency) ────────────────────
function PageHeader({
  title,
  subtitle,
  breadcrumb,
  tabs,
}: {
  title: string
  subtitle?: string
  breadcrumb: string[]
  tabs?: React.ReactNode
}) {
  return (
    <div
      // With mobile tabs the bar sits flush on the header's bottom edge, like the About pages
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
      <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,51,61,0.10) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '30%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,139,67,0.08) 0%, transparent 65%)', filter: 'blur(48px)', pointerEvents: 'none' }} />

      <div className="flex items-center gap-1.5 mb-4" style={{ position: 'relative', zIndex: 1 }}>
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="eyebrow" style={{ fontSize: 11, color: i < breadcrumb.length - 1 ? '#5C6673' : '#0E1116' }}>{crumb}</span>
            {i < breadcrumb.length - 1 && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </span>
        ))}
      </div>

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
        }}
      >
        {title}
      </h1>

      {subtitle ? (
        <p
          style={{
            fontFamily: 'CKCL',
            fontSize: 15,
            color: '#5C6673',
            margin: '10px 0 0',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {subtitle}
        </p>
      ) : null}

      {tabs && <div className="lg:hidden" style={{ position: 'relative', zIndex: 1, marginTop: 24 }}>{tabs}</div>}
    </div>
  )
}

// ─── Committees ───────────────────────────────────────────────────────────────
// Add a committee here (and to CommitteePageType) and it appears in the sidebar and mobile tabs.
export type CommitteePageType = 'founding' | 'executive'

export const COMMITTEES: { id: CommitteePageType; label: string }[] = [
  { id: 'founding', label: 'Founding Executive Committee' },
  { id: 'executive', label: 'Executive Committee' },
]

// ─── CommitteePage ────────────────────────────────────────────────────────────
export default function CommitteePage({
  type,
  onNavigate,
}: {
  type: CommitteePageType
  onNavigate: (type: CommitteePageType) => void
}) {
  const [filter, setFilter] = useState<FilterType>('All')
  const [selectedMember, setSelectedMember] = useState<CommitteeMember | null>(null)

  // Reset the filter when switching committees
  useEffect(() => { setFilter('All') }, [type])

  const title = COMMITTEES.find((c) => c.id === type)!.label
  const breadcrumb = ['Home', 'About', title]
  const { about, loading, error } = useAbout()
  // Founding = former committee only — never show anyone still on the running executive list
  const runningKeys = new Set(
    (about.executive_committee || [])
      .flatMap((m) => {
        const keys: string[] = []
        if (m.member_id) keys.push(`id:${String(m.member_id)}`)
        const name = (m.name || '').trim().toLowerCase()
        if (name) keys.push(`name:${name}`)
        return keys
      }),
  )
  const roster =
    type === 'founding'
      ? (about.founding_committee || []).filter((m) => {
          if (m.member_id && runningKeys.has(`id:${String(m.member_id)}`)) return false
          const name = (m.name || '').trim().toLowerCase()
          if (name && runningKeys.has(`name:${name}`)) return false
          return true
        })
      : about.executive_committee || []
  const members: CommitteeMember[] = roster.map((m, i) => ({
    id: i + 1,
    name: m.name,
    designation: m.designation,
    company: m.company,
    tier: (m.tier === 'Office Bearer' ? 'Office Bearer' : 'Member') as MemberTier,
    photo: m.photo || null,
    bio: m.bio || '',
  }))
  const termLabel =
    type === 'executive' ? formatCommitteeTerm(about.executive_committee_term) : ''

  const filtered = members.filter((m) => {
    if (filter === 'Office Bearers') return m.tier === 'Office Bearer'
    if (filter === 'Members') return m.tier === 'Member'
    return true
  })

  const leaders = LEADER_ROLES.flatMap((role) => filtered.filter((m) => m.designation === role))
  const others = filtered.filter((m) => !LEADER_ROLES.includes(m.designation))

  const counts: Record<FilterType, number> = {
    All: members.length,
    'Office Bearers': members.filter((m) => m.tier === 'Office Bearer').length,
    Members: members.filter((m) => m.tier === 'Member').length,
  }
  const showEmpty = !loading && members.length === 0

  return (
    <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
      <PageHeader
        title={title}
        subtitle={termLabel || undefined}
        breadcrumb={breadcrumb}
        tabs={<SubTabs tabs={COMMITTEES} active={type} onChange={onNavigate} />}
      />

      {/* Two-column body, same as the About pages */}
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
        {/* Desktop sidebar — full-height white panel, menu sticks inside it */}
        <div
          className="hidden lg:block"
          style={{ background: '#FFFFFF', borderLeft: '1px solid #E2E6EC', borderRight: '1px solid #E2E6EC', padding: 'clamp(40px,6vw,80px) 20px' }}
        >
          <div style={{ position: 'sticky', top: 120, width: 280 }}>
            <SideNavCard section="Committees" pages={COMMITTEES} currentId={type} onNavigate={onNavigate} />
          </div>
        </div>

        <main style={{ flex: 1, minWidth: 0, padding: 'clamp(40px,6vw,80px) 0' }}>
      {loading && members.length === 0 ? (
        <p style={{ fontFamily: 'CKCL', fontSize: 15, color: '#5C6673', marginBottom: 24 }}>Loading committee…</p>
      ) : null}
      {!loading && error && members.length === 0 ? (
        <p style={{ fontFamily: 'CKCL', fontSize: 15, color: '#E10B17', marginBottom: 24 }}>{error}</p>
      ) : null}
      {showEmpty && !error ? (
        <p style={{ fontFamily: 'CKCL', fontSize: 15, color: '#5C6673', marginBottom: 24 }}>
          {type === 'executive' && about.executive_committee_active === false
            ? termLabel
              ? `The Executive Committee term (${termLabel}) is not active, so the current roster is not shown.`
              : 'The Executive Committee term is not active, so the current roster is not shown.'
            : type === 'executive'
              ? 'No committee members published yet. Add the running roster under Website Maintenance → About → Executive Committee.'
              : 'No former committee members yet. People appear here after they are removed from Executive.'}
        </p>
      ) : null}
      {/* Filter chip row */}
      <div
        style={{
          position: 'sticky',
          top: 68,
          zIndex: 30,
          background: 'rgba(247,248,250,0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #E2E6EC',
          padding: '12px 0',
          marginBottom: 32,
          display: members.length ? undefined : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['All', 'Office Bearers', 'Members'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: 'CKCL',
                fontSize: 13,
                fontWeight: filter === f ? 600 : 500,
                color: filter === f ? '#FFFFFF' : '#5C6673',
                background: filter === f ? '#E10B17' : '#FFFFFF',
                border: filter === f ? '1px solid #E10B17' : '1px solid #E2E6EC',
                borderRadius: 999,
                padding: '7px 16px',
                cursor: 'pointer',
                transition: 'all 160ms',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {f}
              <span
                style={{
                  fontFamily: 'CKCL',
                  fontSize: 10,
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                {counts[f]}
              </span>
            </button>
          ))}

          <div style={{ marginLeft: 'auto', fontFamily: 'CKCL', fontSize: 13, color: '#A8B0BB' }}>
            {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
          </div>
        </div>
      </div>

      {/* Card grid — President & Vice President side by side on their own row, with a gold frame and larger text */}
      <div>
        {leaders.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-8 mx-auto sm:max-w-[624px] mb-10">
            {leaders.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                featured
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
          {others.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={() => setSelectedMember(member)}
            />
          ))}
        </div>

        {!loading && members.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 22, color: '#A8B0BB' }}>No members found</div>
            <button onClick={() => setFilter('All')} style={{ fontFamily: 'CKCL', fontSize: 14, color: '#E10B17', background: 'none', border: 'none', cursor: 'pointer' }}>Clear filter</button>
          </div>
        )}
      </div>
        </main>
      </div>

      {/* Modal */}
      {selectedMember && (
        <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

      <Footer />
    </div>
  )
}
