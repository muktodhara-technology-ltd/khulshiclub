import { useState } from 'react'
import { useSiteInfo, officeLine } from '../lib/siteInfo'
import { SITE_W } from '../lib/layout'
import ClubLogo from './ClubLogo'

// Text tones on the dark footer — kept readable (WCAG AA on #0E1116)
const TONE = {
  label: 'rgba(255,255,255,0.45)',
  body: 'rgba(255,255,255,0.62)',
  strong: 'rgba(255,255,255,0.88)',
  hover: '#FFFFFF',
  line: 'rgba(255,255,255,0.08)',
}

// ─── Social icon circle ───────────────────────────────────────────────────────
function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: '50%',
        border: `1px solid ${hovered ? '#E10B17' : 'rgba(255,255,255,0.16)'}`,
        background: hovered ? '#E10B17' : 'rgba(255,255,255,0.04)',
        color: '#FFFFFF',
        textDecoration: 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'background 200ms, border-color 200ms, transform 200ms',
        flexShrink: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </a>
  )
}

const SOCIAL_ICONS: Record<string, (size: number) => React.ReactNode> = {
  facebook: (size) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>,
  youtube: (size) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.94 1.94C5.12 20 12 20 12 20s6.88 0 8.6-.48a2.78 2.78 0 001.94-1.94A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>,
  instagram: (size) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  linkedin: (size) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>,
}
const SOCIAL_LABELS: Record<string, string> = { facebook: 'Facebook', youtube: 'YouTube', instagram: 'Instagram', linkedin: 'LinkedIn' }

// Only the networks filled in under Admin → Site Info are shown
function SocialRow({ size }: { size: number }) {
  const { social } = useSiteInfo()
  const links = Object.entries(social).filter(([k, url]) => url && SOCIAL_ICONS[k])
  if (!links.length) return null
  return (
    <div className="flex items-center gap-2.5">
      {links.map(([k, url]) => (
        <SocialIcon key={k} href={url as string} label={SOCIAL_LABELS[k]}>{SOCIAL_ICONS[k](size)}</SocialIcon>
      ))}
    </div>
  )
}

// ─── Logo — Site Info logo, or the club name when none is uploaded ───────────
function FooterLogo({ height, className }: { height: number; className?: string }) {
  return (
    <div className={className} style={{ display: 'inline-flex' }}>
      <ClubLogo height={height} color="#FFFFFF" />
    </div>
  )
}

// ─── Footer link — brightens and nudges right on hover ────────────────────────
function FooterLink({ href, children, size = 14, tone = TONE.body }: { href: string; children: React.ReactNode; size?: number; tone?: string }) {
  return (
    <a
      href={href}
      style={{ fontFamily: 'CKCL', fontSize: size, color: tone, textDecoration: 'none', display: 'inline-block', transition: 'color 160ms, transform 160ms' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = TONE.hover; el.style.transform = 'translateX(3px)' }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = tone; el.style.transform = '' }}
    >
      {children}
    </a>
  )
}

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow mb-5" style={{ fontSize: 11, fontWeight: 600, color: '#D4A95E' }}>{children}</div>
}

// ─── Contact detail row: icon + small label + value ──────────────────────────
const CONTACT_ICON = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function ContactRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(225,11,23,0.14)', color: '#FF5A63', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: 10, color: TONE.label, marginBottom: 3 }}>{label}</div>
        {children}
      </div>
    </div>
  )
}

// ─── Mobile accordion column ─────────────────────────────────────────────────
function AccordionCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${TONE.line}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '18px 0' }}
      >
        <span className="eyebrow" style={{ fontSize: 11, fontWeight: 600, color: '#D4A95E' }}>{title}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TONE.label} strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <ul style={{ listStyle: 'none', padding: '0 0 18px', margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map((l) => (
            <li key={l.label}><FooterLink href={l.href} size={15}>{l.label}</FooterLink></li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Payment methods strip (asset in /favicon) ─────────────────────────────────
const PAY_METHODS_IMG = '/favicon/footer-desktop-pay.webp'

// ─── Map band ─────────────────────────────────────────────────────────────────
function MapBand() {
  const site = useSiteInfo()
  const MAP_SRC = site.address.embed_url

  return (
    <div style={{ position: 'relative', height: 280, background: '#1a1e26', overflow: 'hidden' }}>
      {/* OpenStreetMap iframe */}
      {MAP_SRC && <iframe
        title={`${site.short_name || site.club_name} location map`}
        src={MAP_SRC}
        width="100%"
        height="100%"
        style={{ border: 'none', display: 'block', filter: 'grayscale(30%) brightness(0.85)', pointerEvents: 'none' }}
        loading="lazy"
      />}

      {/* Glass info card — floating left; centred on mobile and tablet */}
      <style>{`@media (max-width:1023px) { .map-card { left:50% !important; transform:translate(-50%,-50%) !important; width:calc(100% - 40px); text-align:center; } }`}</style>
      <div
        className="map-card absolute glass-strong"
        style={{
          top: '50%', left: 'clamp(24px, 5vw, 80px)',
          transform: 'translateY(-50%)',
          borderRadius: 20,
          padding: '24px 28px',
          maxWidth: 300,
          zIndex: 10,
        }}
      >
        {/* Club logo (Site Info) */}
        <div className="mb-4">
          <ClubLogo height={28} />
        </div>
        <p style={{ fontFamily: 'CKCL', fontSize: 13, lineHeight: 1.6, color: '#2A3039', margin: '0 0 16px' }}>
          {site.address.full}
        </p>
        <a
          href={site.address.map_url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'CKCL', fontSize: 13, fontWeight: 600,
            color: '#FFFFFF', textDecoration: 'none',
            background: '#E10B17', borderRadius: 999,
            padding: '9px 18px',
            transition: 'background 160ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#E10B17' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Open in Maps
        </a>
      </div>
    </div>
  )
}

// ─── Main Footer ──────────────────────────────────────────────────────────────
const EXPLORE_LINKS = [
  { label: 'About Club', href: '#about' },
  { label: 'Facilities', href: '#facilities' },
  { label: 'Membership Process', href: '#membership' },
  { label: 'Member List', href: '#' },
  { label: 'Notices', href: '#media' },
  { label: 'News & Events', href: '#media' },
]

const MEMBER_LINKS = [
  { label: 'Member Login', href: '#' },
  { label: 'Club Dues', href: '#' },
  { label: 'Annual Reports', href: '#' },
  { label: 'Benefits of Members', href: '#' },
  { label: 'Terms & Conditions', href: '#' },
  { label: 'Refund & Return Policy', href: '#' },
]

export default function Footer({ maxWidth = SITE_W }: { maxWidth?: number }) {
  const site = useSiteInfo()
  const PHONES = site.contact.phones
  const MAPS_URL = site.address.map_url ?? '#'
  const email = site.contact.email
  return (
    <footer style={{ background: '#0E1116' }}>
      {/* Map band */}
      <MapBand />

      {/* Main columns */}
      <div style={{ maxWidth, margin: '0 auto', padding: '64px clamp(24px,5vw,80px) 0' }}>

        {/* Desktop grid */}
        <div className="hidden lg:grid lg:grid-cols-[1.35fr_1fr_1fr_1.35fr] gap-x-10 gap-y-12 pb-14">

          {/* Column 1 — Brand */}
          <div>
            <FooterLogo height={42} className="mb-6" />
            <p style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.7, color: TONE.body, maxWidth: 280, margin: '0 0 24px' }}>
              {site.about_text}
            </p>
            <SocialRow size={16} />
            <a
              href="#membership"
              style={{
                marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: '#FFFFFF', textDecoration: 'none',
                background: '#E10B17', borderRadius: 999, padding: '11px 20px',
                boxShadow: '0 6px 20px rgba(225,11,23,0.30)',
                transition: 'background 160ms, transform 160ms',
              }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#B70813'; el.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#E10B17'; el.style.transform = '' }}
            >
              Become a Member
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
            </a>
          </div>

          {/* Column 2 — Explore */}
          <nav aria-label="Explore">
            <ColumnTitle>Explore</ColumnTitle>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {EXPLORE_LINKS.map((l) => <li key={l.label}><FooterLink href={l.href}>{l.label}</FooterLink></li>)}
            </ul>
          </nav>

          {/* Column 3 — Members */}
          <nav aria-label="Members">
            <ColumnTitle>Members</ColumnTitle>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {MEMBER_LINKS.map((l) => <li key={l.label}><FooterLink href={l.href}>{l.label}</FooterLink></li>)}
            </ul>
          </nav>

          {/* Column 4 — Contact */}
          <div>
            <ColumnTitle>Contact</ColumnTitle>
            <div className="flex flex-col gap-5">
              <ContactRow label="Address" icon={<svg {...CONTACT_ICON}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}>
                <a
                  href={MAPS_URL} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.6, color: TONE.body, textDecoration: 'none', transition: 'color 160ms' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = TONE.hover }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = TONE.body }}
                >
                  {site.address.full}
                </a>
              </ContactRow>
              <ContactRow label="Phone" icon={<svg {...CONTACT_ICON}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>}>
                <div className="flex flex-col gap-1">
                  {PHONES.map((ph) => <FooterLink key={ph.label} href={ph.href} tone={TONE.strong}>{ph.label}</FooterLink>)}
                </div>
              </ContactRow>
              <ContactRow label="Email" icon={<svg {...CONTACT_ICON}><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>}>
                {email && <FooterLink href={`mailto:${email}`} tone={TONE.strong}>{email}</FooterLink>}
              </ContactRow>
              <ContactRow label="Hours" icon={<svg {...CONTACT_ICON}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>}>
                <div style={{ fontFamily: 'CKCL', fontSize: 14, color: TONE.strong }}>{officeLine(site)}</div>
                {site.office.note && <div style={{ fontFamily: 'CKCL', fontSize: 13, color: TONE.label, marginTop: 2 }}>{site.office.note}</div>}
              </ContactRow>
            </div>
          </div>
        </div>

        {/* Mobile + tablet accordion */}
        <div className="lg:hidden pb-6">
          {/* Brand block */}
          <div className="pb-7 flex flex-col items-center text-center" style={{ borderBottom: `1px solid ${TONE.line}` }}>
            <FooterLogo height={36} className="mb-5" />
            <p style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.65, color: TONE.body, maxWidth: 300, margin: '0 auto 18px' }}>
              {site.tagline}
            </p>
            <SocialRow size={15} />
          </div>

          {/* Quick contact — tappable without opening an accordion */}
          <div className="grid grid-cols-2 gap-3 py-5" style={{ borderBottom: `1px solid ${TONE.line}` }}>
            {[
              { label: 'Call', href: site.contact.phone_href ?? '#', icon: <svg {...CONTACT_ICON}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg> },
              { label: 'Email', href: email ? `mailto:${email}` : '#', icon: <svg {...CONTACT_ICON}><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg> },
            ].map((b) => (
              <a
                key={b.label}
                href={b.href}
                className="flex items-center justify-center gap-2"
                style={{ height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: TONE.strong, fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
              >
                <span style={{ color: '#FF5A63', display: 'flex' }}>{b.icon}</span>
                {b.label}
              </a>
            ))}
          </div>

          <AccordionCol title="Explore" links={EXPLORE_LINKS} />
          <AccordionCol title="Members" links={MEMBER_LINKS} />
          <AccordionCol
            title="Contact"
            links={[
              ...PHONES.map((ph) => ({ label: ph.label, href: ph.href })),
              ...(email ? [{ label: email, href: `mailto:${email}` }] : []),
              ...(site.address.short ? [{ label: site.address.short, href: MAPS_URL }] : []),
              { label: officeLine(site), href: '#contact' },
            ]}
          />
        </div>
      </div>

      {/* Payments + bottom bar */}
      <div style={{ borderTop: `1px solid ${TONE.line}` }}>
        <div style={{ maxWidth, margin: '0 auto', padding: '22px clamp(24px,5vw,80px)' }}>
          <div
            className="flex items-center gap-5 pb-5"
            style={{ borderBottom: `1px solid ${TONE.line}`, width: '100%' }}
          >
            <div className="eyebrow" style={{ fontSize: 10, color: TONE.label, flex: '0 0 auto', whiteSpace: 'nowrap' }}>
              We accept
            </div>
            <img
              src={PAY_METHODS_IMG}
              alt="Accepted payment methods"
              style={{
                flex: '1 1 0%',
                width: '100%',
                minWidth: 0,
                height: 'auto',
                objectFit: 'contain',
                objectPosition: 'left center',
                display: 'block',
                opacity: 0.95,
              }}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-5">
            <div style={{ fontFamily: 'CKCL', fontSize: 13, color: TONE.label }}>
              {site.copyright}
              {site.trade_license && <>
                <span className="hidden lg:inline"> &nbsp;·&nbsp; </span>
                <br className="lg:hidden"/>
                Trade License {site.trade_license}
              </>}
            </div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 self-start lg:self-auto"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: TONE.body, transition: 'color 160ms' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = TONE.hover }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = TONE.body }}
            >
              Back to top
              <span style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="6 11 12 5 18 11"/></svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
