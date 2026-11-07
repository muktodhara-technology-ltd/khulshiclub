import { createContext, useContext, useId, useState, type ReactNode } from 'react'
import Footer from './Footer'
import { useMembership, type MembershipProcess, type MembershipTier } from '../lib/membership'
import { useSiteInfo } from '../lib/siteInfo'
import { usePortalClubSettings, type PortalMembershipType } from '../lib/apply'

// ─── Live content (Admin → Membership → Membership Process) ───────────────────
type ProcessData = MembershipProcess
type Tier = MembershipTier

/** "Life Member" / "life" → "life", so a CMS tier can be matched to an ERP membership type. */
const tierKey = (name: string) => name.toLowerCase().replace(/\bmembers?(hip)?\b/g, '').replace(/\s+/g, ' ').trim()

/** The ERP membership type (with its fee package) whose name matches this tier, if any. */
function matchMembershipType(tierName: string, types: PortalMembershipType[]): PortalMembershipType | undefined {
  const key = tierKey(tierName)
  if (!key) return undefined
  return types.find((t) => tierKey(t.name) === key)
}

const STEP_ICON_PATHS: Record<string, ReactNode> = {
  document: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  check: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  people: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  card: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  money: <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></>,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
}
const stepIcon = (icon: ReactNode | string) =>
  typeof icon === 'string'
    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E10B17" strokeWidth="2">{STEP_ICON_PATHS[icon] ?? STEP_ICON_PATHS.document}</svg>
    : icon

const ProcessCtx = createContext<ProcessData | null>(null)
const useProcess = () => useContext(ProcessCtx)!

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({ title }: { title?: string }) {
  const site = useSiteInfo()
  const clubName = site.short_name || site.club_name
  return (
    <div
      style={{
        minHeight: 'clamp(200px, 28vw, 320px)',
        background: '#EEF1F5',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        paddingBlock: 'clamp(24px,5vw,80px)',
        paddingTop: 108, // clears the floating navbar (20px offset + 72px bar) on phones
        // Align with the 1280px content column, like the Media & Resources headers
        paddingInline: 'max(clamp(24px,5vw,80px), calc((100% - 1280px) / 2 + clamp(24px,5vw,80px)))',
        paddingBottom: 40,
      }}
    >
      <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(242,51,61,0.10) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '25%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(185,139,67,0.08) 0%,transparent 65%)', filter: 'blur(48px)', pointerEvents: 'none' }} />
      <div className="flex items-center gap-1.5 mb-4" style={{ position: 'relative', zIndex: 1 }}>
        {['Home', 'Membership', 'Membership Process'].map((crumb, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="eyebrow" style={{ fontSize: 11, color: i < arr.length - 1 ? '#5C6673' : '#0E1116' }}>{crumb}</span>
            {i < arr.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
          </span>
        ))}
      </div>
      <div className="eyebrow mb-3" style={{ fontSize: 11, color: '#B98B43', position: 'relative', zIndex: 1 }}>MEMBERSHIP</div>
      <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(32px,4vw,56px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0E1116', margin: 0, position: 'relative', zIndex: 1 }}>
        {title
          ? title.split('\n').map((line, i) => <span key={i}>{i > 0 && <br/>}{line}</span>)
          : <>How to join{clubName ? <><br/>{clubName}.</> : '.'}</>}
      </h1>
    </div>
  )
}

// ─── Timeline steps ────────────────────────────────────────────────────────────
function Timeline() {
  const STEPS = useProcess().steps
  return (
    <div style={{ position: 'relative' }}>
      {/* Vertical connector line */}
      <div
        style={{
          position: 'absolute',
          left: 27,
          top: 28,
          bottom: 28,
          width: 2,
          background: 'linear-gradient(to bottom, #E10B17, rgba(225,11,23,0.20))',
          zIndex: 0,
        }}
      />

      <div className="flex flex-col gap-6">
        {STEPS.map((step, i) => (
          <div key={i} className="flex gap-6 relative">
            {/* Node */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '2px solid #E10B17',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
                boxShadow: '0 0 0 4px rgba(225,11,23,0.08)',
              }}
            >
              {stepIcon(step.icon)}
            </div>

            {/* Card */}
            <div
              className="glass-strong flex-1"
              style={{
                borderRadius: 20,
                padding: '24px 28px',
                marginBottom: 8,
              }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      fontFamily: 'CKCL',
                      fontWeight: 500,
                      fontSize: 11,
                      color: '#E10B17',
                      letterSpacing: '0.10em',
                    }}
                  >
                    {step.num}
                  </span>
                  <h3
                    style={{
                      fontFamily: 'CKCL',
                      fontWeight: 700,
                      fontSize: 18,
                      color: '#0E1116',
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {step.title}
                  </h3>
                </div>
                {/* Duration chip */}
                <div
                  className="eyebrow shrink-0"
                  style={{
                    fontSize: 9,
                    color: '#B98B43',
                    background: 'rgba(185,139,67,0.10)',
                    border: '1px solid rgba(185,139,67,0.30)',
                    borderRadius: 999,
                    padding: '5px 12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⏱ {step.duration}
                </div>
              </div>
              <p
                style={{
                  fontFamily: 'CKCL',
                  fontSize: 15,
                  lineHeight: 1.70,
                  color: '#5C6673',
                  margin: 0,
                }}
              >
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Membership tier cards ─────────────────────────────────────────────────────
// Card-shaped tiers: the front is the "membership card", Details flips it to the terms on the back.
// Small caps label over a value, as on the member portal card
function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0, fontFamily: 'CKCL' }}>
      <div className="eyebrow" style={{ fontSize: 'clamp(7px,2.2cqw,8.5px)', lineHeight: 1.2, color: 'rgba(255,255,255,0.62)' }}>{label}</div>
      <div style={{ fontSize: 'clamp(11px,3.6cqw,14px)', fontWeight: 600, lineHeight: 1.25, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</div>
    </div>
  )
}

// Ticked list of what a tier includes
function Entitlements({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((e) => (
        <li key={e} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E10B17" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}><polyline points="20 6 9 17 4 12"/></svg>
          <span style={{ fontFamily: 'CKCL', fontSize: 12.5, lineHeight: 1.4, color: '#2A3039' }}>{e}</span>
        </li>
      ))}
    </ul>
  )
}

// Labelled block on the expanded card back
function BackSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: 9, color: '#8A929C', marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: 'CKCL', fontSize: 12.5, color: '#2A3039', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

function TierCard({ tier, onApply }: { tier: Tier; onApply: () => void }) {
  const site = useSiteInfo()
  // Fees come from the matching membership type's fee package (club/club-portal/settings)
  const { data: clubSettings } = usePortalClubSettings()
  const fees = matchMembershipType(tier.name, clubSettings?.membership_types || [])?.fees || []
  const [flipped, setFlipped] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [from, to] = tier.colors
  const moreId = useId()
  // Flipping back to the front also returns the card to its normal shape
  const flipBack = () => { setFlipped(false); setExpanded(false) }

  return (
    <div className="mcard" style={{ perspective: 1400, aspectRatio: expanded ? 'auto' : '1.586', containerType: 'inline-size' }}>
      <div className={`mcard-inner${flipped ? ' is-flipped' : ''}`} style={{ position: 'relative', width: '100%', height: expanded ? 'auto' : '100%', transformStyle: 'preserve-3d' }}>

        {/* Front — a specimen of the member's card, as in the member portal */}
        <div
          className="mcard-face"
          inert={flipped}
          aria-hidden={flipped || undefined}
          // Whole front flips too; the Details button stays as the keyboard target
          onClick={() => setFlipped(true)}
          style={{
            color: '#FFFFFF', fontFamily: 'CKCL', cursor: 'pointer',
            background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
            boxShadow: '0 18px 40px -18px rgba(14,17,22,0.55)',
          }}
        >
          {/* Sheen and card arcs */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.22) 0%, transparent 55%)', pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', right: '-18%', bottom: '-55%', width: '75%', aspectRatio: '1', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', right: '-8%', bottom: '-40%', width: '55%', aspectRatio: '1', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', pointerEvents: 'none' }}/>

          <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', gap: '4cqw' }}>
            {/* Header band: club mark + Details (flips to the back) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: '2.6cqw', borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 'clamp(14px,5cqw,18px)', letterSpacing: '0.04em', lineHeight: 1 }}>{site.short_name || site.club_name}</div>
                <div style={{ fontSize: 'clamp(7.5px,2.4cqw,9.5px)', color: 'rgba(255,255,255,0.7)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.club_name ? `${site.club_name} · ` : ''}Membership Card</div>
              </div>
              <button
                className="mcard-btn"
                onClick={() => setFlipped(true)}
                aria-label={`Details: ${tier.name}`}
                style={{ background: 'rgba(255,255,255,0.92)', border: 'none', color: from }}
              >
                Details
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
              </button>
            </div>

            {/* Body: framed portrait placeholder | labelled fields */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '4.5cqw', alignItems: 'stretch' }}>
              <div style={{ height: '100%', aspectRatio: '4 / 5', flexShrink: 0, borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.15)', boxShadow: '0 6px 16px rgba(0,0,0,0.25)' }}>
                <svg viewBox="0 0 80 100" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMax slice" style={{ display: 'block' }}>
                  <circle cx="40" cy="38" r="17" fill="#FFFFFF" opacity="0.45"/>
                  <path d="M8 100c0-20 14.3-34 32-34s32 14 32 34z" fill="#FFFFFF" opacity="0.45"/>
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <CardField label="Name">
                  <span style={{ fontSize: 'clamp(12px,4.4cqw,17px)', letterSpacing: '0.02em' }}>YOUR NAME</span>
                </CardField>
                <CardField label="Membership type">{tier.name}</CardField>
                <CardField label="Occupation">Your occupation</CardField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <CardField label="Membership code">
                    <span style={{ letterSpacing: '0.14em' }}>{tier.name.split(' ').map((w) => w[0]).join('')}0000</span>
                  </CardField>
                  <CardField label="Blood group">O+</CardField>
                </div>
                <CardField label="Date of issue">00 Jan 0000</CardField>
              </div>
            </div>
          </div>
        </div>

        {/* Back — terms and entitlements; "See more" lets it grow past the card shape */}
        <div
          className="mcard-face"
          inert={!flipped}
          aria-hidden={!flipped || undefined}
          style={{
            transform: 'rotateY(180deg)',
            background: '#FFFFFF',
            border: '1px solid #E2E6EC',
            boxShadow: '0 18px 40px -18px rgba(14,17,22,0.30)',
            paddingTop: 0,
            // In flow when expanded, so its content sets the card's height
            ...(expanded && { position: 'relative', inset: 'auto' }),
          }}
        >
          {/* Colour stripe in place of a magnetic strip */}
          <div style={{ height: 6, margin: '0 -20px 14px', background: `linear-gradient(90deg, ${from}, ${to})` }}/>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: expanded ? 'auto' : 'calc(100% - 20px)', minHeight: 0 }}>
            <div className="flex items-start justify-between gap-2">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 15.5, color: '#0E1116', lineHeight: 1.2 }}>{tier.name}</div>
                <div className="eyebrow" style={{ fontSize: 9, color: '#B98B43', marginTop: 3 }}>{tier.term}</div>
              </div>
              <button
                onClick={flipBack}
                aria-label="Back to card"
                style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 999, border: '1px solid #E2E6EC', background: '#F7F8FA', color: '#5C6673', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
            </div>

            {expanded ? (
              <div id={moreId} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '2px 0 6px' }}>
                <p style={{ fontFamily: 'CKCL', fontSize: 13, color: '#2A3039', lineHeight: 1.5, margin: 0 }}>{tier.tagline}.</p>
                <BackSection title="Term">{tier.term}</BackSection>
                <BackSection title="Eligibility">{tier.eligibility}</BackSection>
                <BackSection title="What's included"><Entitlements items={tier.entitlements}/></BackSection>
                {fees.length > 0 && (
                  <BackSection title="Fees">
                    {fees.map((f, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span>{f.billing && f.billing !== 'one_time' ? `${f.name} (${f.billing})` : f.name}</span>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>৳ {Number(f.amount).toLocaleString('en-BD', { maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                  </BackSection>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontFamily: 'CKCL', fontSize: 11.5, color: '#5C6673', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tier.eligibility}</div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <Entitlements items={tier.entitlements}/>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="mcard-btn mcard-more"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={expanded ? moreId : undefined}
                style={{ flex: 1, justifyContent: 'center', background: '#FFFFFF', border: '1px solid #E2E6EC', color: '#0E1116' }}
              >
                {expanded ? 'See less' : 'See more'}
              </button>
              {!tier.closed && (
                <button className="mcard-btn mcard-apply" onClick={onApply} style={{ flex: 1, justifyContent: 'center', background: '#E10B17', border: 'none', color: '#FFFFFF' }}>
                  Apply Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Required documents panel ─────────────────────────────────────────────────
function DocumentsPanel() {
  const { documents: DOCS, documents_note, application_form_url } = useProcess()
  return (
    <div className="glass-strong" style={{ borderRadius: 24, padding: '36px 40px' }}>
      <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
        <div>
          <div className="eyebrow mb-2" style={{ fontSize: 10, color: '#B98B43' }}>Checklist</div>
          <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 26, color: '#0E1116', margin: 0, letterSpacing: '-0.01em' }}>Required Documents</h2>
        </div>
        {application_form_url && <a
          href={application_form_url ?? undefined}
          target="_blank"
          rel="noopener"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'CKCL', fontSize: 13, fontWeight: 600,
            color: '#FFFFFF', textDecoration: 'none',
            background: '#E10B17', borderRadius: 999,
            padding: '10px 20px', whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#E10B17' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Application Form
        </a>}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {DOCS.map((doc, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4"
            style={{
              background: doc.required ? '#FFFFFF' : 'rgba(247,248,250,0.60)',
              borderRadius: 14,
              border: `1px solid ${doc.required ? '#E2E6EC' : 'transparent'}`,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: doc.required ? '#FFF1F2' : '#EEF1F5',
                border: `1.5px solid ${doc.required ? '#E10B17' : '#A8B0BB'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {doc.required
                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E10B17" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              }
            </div>
            <div>
              <span style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.5, color: '#2A3039' }}>{doc.item}</span>
              {!doc.required && (
                <div style={{ fontFamily: 'CKCL', fontSize: 11, color: '#A8B0BB', marginTop: 2 }}>Optional</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {documents_note && <div
        style={{
          marginTop: 20,
          padding: '16px 20px',
          background: 'rgba(255,241,242,0.60)',
          borderRadius: 12,
          fontFamily: 'CKCL',
          fontSize: 13,
          color: '#5C6673',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: '#0E1116' }}>Note:</strong> {documents_note}
      </div>}
    </div>
  )
}

// ─── FAQ accordion ─────────────────────────────────────────────────────────────
function FAQAccordion() {
  const [open, setOpen] = useState<number>(0)
  const FAQS = useProcess().faqs

  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((faq, i) => {
        const isOpen = open === i
        return (
          <div
            key={i}
            style={{
              borderRadius: 16,
              background: isOpen ? '#FFFFFF' : 'rgba(255,255,255,0.60)',
              border: `1px solid ${isOpen ? '#E2E6EC' : 'rgba(226,230,236,0.50)'}`,
              overflow: 'hidden',
              transition: 'all 200ms',
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between gap-4 text-left"
              style={{
                padding: '18px 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <span
                  style={{
                    fontFamily: 'CKCL',
                    fontWeight: 500,
                    fontSize: 10,
                    color: '#E10B17',
                    flexShrink: 0,
                    letterSpacing: '0.06em',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontFamily: 'CKCL',
                    fontWeight: 600,
                    fontSize: 15,
                    color: '#0E1116',
                    lineHeight: 1.4,
                    textAlign: 'left',
                  }}
                >
                  {faq.q}
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isOpen ? '#E10B17' : '#A8B0BB'}
                strokeWidth="2.5"
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 240ms ease-out',
                  flexShrink: 0,
                }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {isOpen && (
              <div
                style={{
                  padding: '0 24px 22px 24px',
                  paddingLeft: 52,
                  animation: 'fadeUp 200ms ease-out both',
                }}
              >
                <p
                  style={{
                    fontFamily: 'CKCL',
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: '#5C6673',
                    margin: 0,
                  }}
                >
                  {faq.a}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── CTA band ─────────────────────────────────────────────────────────────────
function CTABand() {
  const { cta_title, cta_text, contact_line, contact_label, application_form_url } = useProcess()
  // The last word of the heading is set in italic, as in the original design
  const words = (cta_title || '').trim().split(/\s+/)
  const last = words.length > 1 ? words.pop() : ''
  return (
    <div
      style={{
        background: '#0E1116',
        padding: 'clamp(64px,8vw,96px) clamp(24px,5vw,80px)',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* Glows */}
      <div style={{ position: 'absolute', top: '50%', left: '25%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'radial-gradient(circle,rgba(225,11,23,0.10) 0%,transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '50%', right: '15%', width: 400, height: 400, background: 'radial-gradient(circle,rgba(185,139,67,0.07) 0%,transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
        <div className="eyebrow mb-4" style={{ color: '#B98B43', fontSize: 11 }}>READY TO APPLY?</div>
        <h2
          style={{
            fontFamily: 'CKCL',
            fontWeight: 600,
            fontSize: 'clamp(32px,4vw,52px)',
            color: '#FFFFFF',
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            margin: '0 0 20px',
          }}
        >
          {words.join(' ')}{last && <><br/><span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.70)' }}>{last}</span></>}
        </h2>
        <p
          style={{
            fontFamily: 'CKCL',
            fontSize: 16,
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.65)',
            marginBottom: 36,
          }}
        >
          {cta_text}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {application_form_url && <a
            href={application_form_url ?? undefined}
            target="_blank"
            rel="noopener"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'CKCL', fontSize: 15, fontWeight: 600,
              color: '#FFFFFF', textDecoration: 'none',
              background: '#E10B17', borderRadius: 999,
              padding: '14px 28px',
              transition: 'background 160ms',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#E10B17' }}
          >
            Download Application Form
          </a>}
          <a
            href="#contact"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'CKCL', fontSize: 15, fontWeight: 600,
              color: 'rgba(255,255,255,0.80)', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999, padding: '14px 28px',
              transition: 'all 160ms',
            }}
          >
            {contact_label || 'Contact the club'}
          </a>
        </div>
        <div
          style={{
            fontFamily: 'CKCL',
            fontSize: 13,
            color: 'rgba(255,255,255,0.35)',
            marginTop: 20,
          }}
        >
          {contact_line}
        </div>
      </div>
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────
export default function MembershipProcessPage({ onApply }: { onApply?: () => void }) {
  const apply = () => onApply?.()
  const { membership, fromApi, loading, error } = useMembership()
  const process = fromApi ? membership.process : null
  const hasContent = Boolean(
    process && (
      process.steps.length ||
      process.tiers.length ||
      process.intro_lead ||
      process.faqs.length
    )
  )

  if (loading && !fromApi) {
    return (
      <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
        <PageHeader />
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(48px,6vw,80px) clamp(24px,5vw,80px)' }}>
          {[100, 94, 70, 0, 100, 88].map((w, i) => (
            <div key={i} style={{ height: w ? 14 : 28, width: `${w}%`, maxWidth: 760, background: w ? '#EEF1F5' : 'transparent', borderRadius: 6, marginBottom: 14 }} />
          ))}
        </div>
      </div>
    )
  }

  if (!hasContent || !process) {
    return (
      <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
        <PageHeader />
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(48px,6vw,80px) clamp(24px,5vw,80px)' }}>
          <p style={{ fontFamily: 'CKCL', fontSize: 16, color: error ? '#E10B17' : '#5C6673', lineHeight: 1.6 }}>
            {error
              ? 'Could not load membership process.'
              : 'Membership process content is not published yet. Add it in Website Maintenance → Membership → Membership Process.'}
          </p>
        </div>
        <Footer />
      </div>
    )
  }

  const TIERS = process.tiers
  return (
    <ProcessCtx.Provider value={process}>
    <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
      <PageHeader title={process.page_title} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(48px,6vw,80px) clamp(24px,5vw,80px)' }}>

        {/* Intro */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <p style={{ fontFamily: 'CKCL', fontSize: 17, lineHeight: 1.75, color: '#2A3039', margin: 0 }}>
            {process.intro_lead}
          </p>
          <p style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.70, color: '#5C6673', margin: 0 }}>
            {process.intro_note}
          </p>
        </div>

        {/* Timeline */}
        <div className="mb-20">
          <div className="eyebrow mb-10" style={{ color: '#B98B43', fontSize: 11 }}>THE PROCESS</div>
          <div style={{ maxWidth: 800 }}>
            <Timeline />
          </div>
        </div>

        {/* Tier cards */}
        <div className="mb-20">
          <div className="eyebrow mb-3" style={{ color: '#B98B43', fontSize: 11 }}>MEMBERSHIP TIERS</div>
          <h2
            style={{
              fontFamily: 'CKCL',
              fontWeight: 600,
              fontSize: 'clamp(24px,2.8vw,38px)',
              color: '#0E1116',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              marginBottom: 16,
            }}
          >
            {process.tiers_title || 'Choose your membership type.'}
          </h2>
          {process.tiers_text ? (
            <p style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.65, color: '#5C6673', maxWidth: 520, marginBottom: 40 }}>
              {process.tiers_text}
            </p>
          ) : (
            <div style={{ marginBottom: 24 }} />
          )}

          <style>{`
            .mcard-inner { transition: transform 750ms cubic-bezier(.22,1,.36,1); }
            .mcard:hover .mcard-inner:not(.is-flipped) { transform: translateY(-4px); }
            .mcard-inner.is-flipped { transform: rotateY(180deg); }
            .mcard-face { position:absolute; inset:0; border-radius:18px; overflow:hidden; padding:18px 20px; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
            .mcard-btn { display:inline-flex; align-items:center; gap:6px; flex-shrink:0; padding:8px 14px; border-radius:999px; font-family:CKCL; font-size:12.5px; font-weight:600; white-space:nowrap; cursor:pointer; transition:background 160ms, transform 160ms; }
            .mcard-btn:hover { transform:translateY(-1px); }
            .mcard-apply:hover { background:#B70813 !important; }
            .mcard-more:hover { background:#F7F8FA !important; }
            @media (prefers-reduced-motion: reduce) { .mcard-inner { transition:none; } }
          `}</style>

          {/* Radial glow backdrop for cards */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse,rgba(225,11,23,0.05) 0%,transparent 70%)', pointerEvents: 'none' }} />
            {/* 1 / 2 / 3 per row; the short last row centres */}
            <div className="flex flex-wrap justify-center gap-5" style={{ paddingBottom: 16 }}>
              {TIERS.map((tier) => (
                <div key={tier.name} className="w-full sm:w-[calc(50%-10px)] lg:w-[calc((100%-40px)/3)]" style={{ maxWidth: 420 }}>
                  <TierCard tier={tier} onApply={apply}/>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Required documents */}
        <div className="mb-20">
          <DocumentsPanel />
        </div>

        {/* FAQ */}
        <div className="mb-4">
          <div className="eyebrow mb-3" style={{ color: '#B98B43', fontSize: 11 }}>FREQUENTLY ASKED</div>
          <h2
            style={{
              fontFamily: 'CKCL',
              fontWeight: 600,
              fontSize: 'clamp(24px,2.8vw,38px)',
              color: '#0E1116',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              marginBottom: 32,
            }}
          >
            Questions about joining.
          </h2>
          <FAQAccordion />
        </div>
      </div>

      <CTABand />
      <Footer />
    </div>
    </ProcessCtx.Provider>
  )
}
