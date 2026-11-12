import { useState, useEffect, useRef } from 'react'
import type { PageId } from './InnerPage'
import type { CommitteePageType } from './CommitteePage'
import { useSiteInfo } from '../lib/siteInfo'
import ClubLogo from './ClubLogo'
import { pathForPage, type RoutedPage } from '../lib/routing'
import { SITE_W } from '../lib/layout'

function hrefForPage(page: string) {
  try {
    return pathForPage(page as RoutedPage)
  } catch {
    return '#'
  }
}

type NavLink = { label: string; href: string; dropdown: string[] | null; innerPage?: PageId }

const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/', dropdown: null },
  {
    label: 'About', href: '/about/about-club', dropdown: null,
    // dropdown items with their inner page targets are handled via the dropdown panel
  },
  { label: 'Facilities', href: '/facilities', dropdown: null, innerPage: undefined },
  { label: 'Membership', href: '/membership/benefits', dropdown: null },
  { label: 'Media', href: '/media', dropdown: null },
  { label: 'Resources', href: '/resources', dropdown: null },
  { label: 'Contact', href: '/contact', dropdown: null },
]

type AboutItem = { label: string; page: PageId | `committee:${CommitteePageType}` }

const ABOUT_ITEMS: AboutItem[] = [
  { label: 'About Club', page: 'about-club' },
  { label: 'Mission & Vision', page: 'mission-vision' },
  { label: 'Founding Executive Committee', page: 'committee:founding' },
  { label: 'Executive Committee', page: 'committee:executive' },
  { label: 'Terms & Conditions', page: 'terms' },
  { label: 'Refund & Return Policy', page: 'refund-policy' },
]
const MEMBERSHIP_ITEMS: AboutItem[] = [
  { label: 'Benefits of Members', page: 'benefits' },
  { label: 'Affiliated Clubs', page: 'affiliated-clubs' },
]
const MEMBERSHIP_EXTRA_ITEMS: { label: string; page: string }[] = [
  { label: 'Membership Process', page: 'membership-process' },
  { label: 'Member List', page: 'member-list' },
  { label: 'Become a Member', page: 'become-member' },
  { label: 'Member Login', page: 'member-login' },
]

// Inner-page targets for top-level links without a dropdown (mobile drawer)
const MOBILE_TARGETS: Record<string, string> = {
  Home: 'home',
  Facilities: 'facilities',
  Media: 'media',
  Resources: 'resources',
  Contact: 'contact',
}

// ─── Mobile bottom nav ───────────────────────────────────────────────────────
const MOBILE_NAV_ITEMS = [
  {
    label: 'Home',
    page: 'home' as const,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    label: 'Facilities',
    page: 'facilities' as const,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: 'Notice & Media',
    page: 'media' as const,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><rect x="10" y="6" width="8" height="4" rx="1"/></svg>,
  },
  {
    label: 'Member List',
    page: 'member-list' as const,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    label: 'Member Login',
    page: 'member-login' as const,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.17 18.84A7 7 0 0112 16a7 7 0 015.83 2.84"/></svg>,
  },
] as const

const MOBILE_NAV_BTN = 52
const MOBILE_NAV_GAP = 2

function mobileNavIndex(currentPage?: string) {
  if (!currentPage) return -1
  if (currentPage.startsWith('facility:')) return MOBILE_NAV_ITEMS.findIndex((i) => i.page === 'facilities')
  if (currentPage === 'member-portal') return MOBILE_NAV_ITEMS.findIndex((i) => i.page === 'member-login')
  return MOBILE_NAV_ITEMS.findIndex((i) => i.page === currentPage)
}

// Survives Navbar remounts between pages, so the pill slides from the previous tab
let lastPillPos = 0
let lastPillVisible = false

export default function Navbar({ onInnerNavigate, currentPage, onOpenSearch }: {
  currentPage?: string
  onInnerNavigate?: (id: PageId | 'home' | `committee:${CommitteePageType}` | 'facilities' | 'membership-process' | 'member-list' | 'become-member' | 'media' | 'resources' | 'contact' | 'search' | '404' | 'member-login') => void
  onOpenSearch?: () => void
}) {
  const site = useSiteInfo()
  const phone = site.contact.phone
  const email = site.contact.email
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mobile + scrolled: centre favicon when set; otherwise keep the logo (just smaller)
  const showNavIcon = isMobile && scrolled && Boolean(site.favicon)

  // Pill starts where the previous page left it, then slides to the active tab
  const activeNavIdx = mobileNavIndex(currentPage)
  const [pill, setPill] = useState({ pos: lastPillPos, visible: lastPillVisible })
  useEffect(() => {
    const next = { pos: activeNavIdx >= 0 ? activeNavIdx : lastPillPos, visible: activeNavIdx >= 0 }
    lastPillPos = next.pos
    lastPillVisible = next.visible
    const raf = requestAnimationFrame(() => setPill(next))
    return () => cancelAnimationFrame(raf)
  }, [activeNavIdx])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const handleMouseEnter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveDropdown(label)
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setActiveDropdown(null), 120)
  }

  return (
    <>
      {/* Utility strip — visible only when not scrolled on desktop */}
      <div
        className="hidden lg:flex items-center justify-end gap-6 px-8 pt-3 pb-0 absolute top-0 left-0 right-0 z-40 pointer-events-none"
        style={{ opacity: scrolled ? 0 : 1, transition: 'opacity 240ms ease-out' }}
      >
        {phone && <a href={site.contact.phone_href ?? undefined} className="pointer-events-auto flex items-center gap-1.5 text-white/80 hover:text-white transition-colors" style={{ fontSize: 13, fontFamily: 'CKCL' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.77 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
          {phone}
        </a>}
        {email && <a href={`mailto:${email}`} className="pointer-events-auto flex items-center gap-1.5 text-white/80 hover:text-white transition-colors" style={{ fontSize: 13, fontFamily: 'CKCL' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          {email}
        </a>}
      </div>

      {/* Main Navbar */}
      <header
        className="fixed z-50 left-1/2 -translate-x-1/2"
        style={{
          top: scrolled ? 12 : 20,
          width: scrolled ? 'min(1080px, calc(100vw - 40px))' : `min(${SITE_W}px, calc(100vw - 40px))`,
          height: scrolled ? 58 : 72,
          transition: 'all 240ms ease-out',
        }}
      >
        <nav
          className="glass-inner-highlight relative w-full h-full flex items-center px-5 lg:px-8"
          style={{
            borderRadius: 999,
            background: scrolled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.55)',
            backdropFilter: `blur(${scrolled ? 32 : 24}px)`,
            WebkitBackdropFilter: `blur(${scrolled ? 32 : 24}px)`,
            border: '1px solid rgba(255,255,255,0.70)',
            boxShadow: '0 16px 48px -8px rgba(14,17,22,0.10), 0 2px 6px rgba(14,17,22,0.06)',
          }}
        >
          {/* Logo left at rest; on mobile scroll hide it and show favicon/icon centred */}
          <a
            href="#home"
            onClick={() => onInnerNavigate?.('home')}
            className="flex items-center shrink-0 mr-6"
            style={{
              opacity: showNavIcon ? 0 : 1,
              pointerEvents: showNavIcon ? 'none' : 'auto',
              transition: 'opacity 200ms ease-out',
            }}
            aria-hidden={showNavIcon || undefined}
            tabIndex={showNavIcon ? -1 : undefined}
          >
            <ClubLogo
              height={scrolled ? 32 : 38}
              showName={false}
              style={{ transition: 'height 240ms ease-out', flexShrink: 0 }}
            />
          </a>
          {showNavIcon && (
            <a
              href="#home"
              onClick={() => onInnerNavigate?.('home')}
              aria-label="Home"
              className="lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ zIndex: 2 }}
            >
              <ClubLogo height={34} showName={false} iconOnly />
            </a>
          )}

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_LINKS.map((link) => {
              const hasDropdown = link.label === 'About' || link.label === 'Membership'
              const dropItems = link.label === 'About' ? ABOUT_ITEMS : link.label === 'Membership' ? MEMBERSHIP_ITEMS : []
              return (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => hasDropdown && handleMouseEnter(link.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <a href={link.href} onClick={
                link.label === 'Facilities' ? (e) => { e.preventDefault(); onInnerNavigate?.('facilities' as any) }
                : link.label === 'Media' ? (e) => { e.preventDefault(); onInnerNavigate?.('media') }
                : link.label === 'Resources' ? (e) => { e.preventDefault(); onInnerNavigate?.('resources') }
                : link.label === 'Contact' ? (e) => { e.preventDefault(); onInnerNavigate?.('contact') }
                : undefined
              } className="nav-link flex items-center gap-1" style={{ fontSize: scrolled ? 13 : 14 }}>
                    {link.label}
                    {hasDropdown && (
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ transform: activeDropdown === link.label ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms' }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    )}
                  </a>

                  {/* Inner-page dropdown */}
                  {hasDropdown && activeDropdown === link.label && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 min-w-[220px] p-2 z-50"
                      style={{
                        borderRadius: 20,
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                        border: '1px solid rgba(255,255,255,0.70)',
                        boxShadow: '0 16px 48px -8px rgba(14,17,22,0.14), 0 2px 6px rgba(14,17,22,0.06)',
                        animation: 'fadeUp 180ms ease-out both',
                      }}
                      onMouseEnter={() => handleMouseEnter(link.label)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {dropItems.map((item) => (
                        <a
                          key={item.page}
                          href={hrefForPage(item.page)}
                          onClick={(e) => { e.preventDefault(); onInnerNavigate?.(item.page); setActiveDropdown(null) }}
                          className="w-full text-left block px-4 py-2.5 transition-colors"
                          style={{ fontSize: 14, fontFamily: 'CKCL', color: '#2A3039', borderRadius: 12, textDecoration: 'none' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,241,242,0.8)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                        >
                          {item.label}
                        </a>
                      ))}
                      {link.label === 'Membership' && (
                        <>
                          <div style={{ height: 1, background: '#E2E6EC', margin: '4px 16px' }}/>
                          {MEMBERSHIP_EXTRA_ITEMS.map((item) => (
                            <a
                              key={item.page}
                              href={hrefForPage(item.page)}
                              onClick={(e) => { e.preventDefault(); onInnerNavigate?.(item.page as any); setActiveDropdown(null) }}
                              className="w-full text-left block px-4 py-2.5 transition-colors"
                              style={{ fontSize: 14, fontFamily: 'CKCL', color: '#2A3039', borderRadius: 12, textDecoration: 'none' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,241,242,0.8)' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                            >
                              {item.label}
                            </a>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center shrink-0 ml-4 gap-2">
            <button
              type="button"
              onClick={() => onOpenSearch?.()}
              aria-label="Search"
              title="Search"
              style={{
                width: scrolled ? 38 : 42,
                height: scrolled ? 38 : 42,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1C2330',
                background: 'rgba(14,17,22,0.06)',
                border: '1.5px solid rgba(14,17,22,0.14)',
                cursor: 'pointer',
                transition: 'background 180ms, border-color 180ms',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(14,17,22,0.12)'
                el.style.borderColor = 'rgba(14,17,22,0.28)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(14,17,22,0.06)'
                el.style.borderColor = 'rgba(14,17,22,0.14)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button
              onClick={() => onInnerNavigate?.('member-login' as any)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: scrolled ? 13 : 14,
                fontFamily: 'CKCL',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                borderRadius: 999,
                color: '#1C2330',
                background: 'rgba(14,17,22,0.08)',
                border: '1.5px solid rgba(14,17,22,0.22)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset',
                padding: scrolled ? '8px 18px' : '10px 22px',
                cursor: 'pointer',
                transition: 'background 180ms, border-color 180ms, transform 180ms cubic-bezier(.22,1,.36,1)',
                willChange: 'transform',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(14,17,22,0.14)'
                el.style.borderColor = 'rgba(14,17,22,0.40)'
                el.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(14,17,22,0.08)'
                el.style.borderColor = 'rgba(14,17,22,0.22)'
                el.style.transform = ''
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Member Login
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenSearch?.()}
              aria-label="Search"
              className="p-2"
              style={{ color: '#0E1116' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex flex-col gap-1.5 p-2"
              aria-label="Open menu"
            >
              <span className="block w-5 h-0.5 bg-ink-900" style={{ background: '#0E1116' }}/>
              <span className="block w-5 h-0.5 bg-ink-900" style={{ background: '#0E1116' }}/>
              <span className="block w-3.5 h-0.5 bg-ink-900" style={{ background: '#0E1116' }}/>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" style={{ animation: 'fadeIn 200ms ease-out both' }}>
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(14,17,22,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute top-0 right-0 h-full w-[320px] flex flex-col glass-strong"
            style={{ borderRadius: '28px 0 0 28px', animation: 'fadeUp 240ms ease-out both' }}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E2E6EC' }}>
              <span className="font-display font-semibold" style={{ fontSize: 18, color: '#0E1116' }}>Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-2" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E1116" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              {NAV_LINKS.map((link) => {
                const subItems = link.label === 'About' ? ABOUT_ITEMS
                  : link.label === 'Membership' ? [...MEMBERSHIP_ITEMS, ...MEMBERSHIP_EXTRA_ITEMS]
                  : null
                const target = MOBILE_TARGETS[link.label]
                const expanded = mobileExpanded === link.label
                const rowStyle = { fontFamily: 'CKCL', fontSize: 15, color: '#2A3039', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }
                const hoverOn = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,241,242,0.8)' }
                const hoverOff = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '' }

                if (subItems) {
                  return (
                    <div key={link.label} className="mb-1">
                      <button
                        onClick={() => setMobileExpanded(expanded ? null : link.label)}
                        aria-expanded={expanded}
                        className="w-full flex items-center justify-between px-4 py-3 font-semibold rounded-xl transition-colors"
                        style={rowStyle}
                        onMouseEnter={hoverOn}
                        onMouseLeave={hoverOff}
                      >
                        {link.label}
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms' }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {expanded && (
                        <div className="ml-4 pl-2 border-l" style={{ borderColor: '#E2E6EC', animation: 'fadeUp 180ms ease-out both' }}>
                          {subItems.map((item) => (
                            <button
                              key={item.page}
                              onClick={() => { onInnerNavigate?.(item.page as any); setMobileOpen(false) }}
                              className="w-full text-left block px-4 py-2.5 rounded-xl transition-colors"
                              style={{ ...rowStyle, fontSize: 14 }}
                              onMouseEnter={hoverOn}
                              onMouseLeave={hoverOff}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block px-4 py-3 font-semibold rounded-xl transition-colors mb-1"
                    style={rowStyle}
                    onClick={(e) => {
                      if (target) { e.preventDefault(); onInnerNavigate?.(target as any) }
                      setMobileOpen(false)
                    }}
                    onMouseEnter={hoverOn}
                    onMouseLeave={hoverOff}
                  >
                    {link.label}
                  </a>
                )
              })}
            </nav>
            <div className="p-6 flex flex-col gap-3 border-t" style={{ borderColor: '#E2E6EC' }}>
              <button
                onClick={() => { onInnerNavigate?.('member-login' as any); setMobileOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '13px 24px', borderRadius: 999,
                  background: 'rgba(14,17,22,0.08)',
                  border: '1.5px solid rgba(14,17,22,0.22)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset',
                  fontFamily: 'CKCL', fontSize: 15, fontWeight: 600,
                  color: '#1C2330', cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Member Login
              </button>
              <div className="text-center mt-1" style={{ fontFamily: 'CKCL', fontSize: 13, color: '#5C6673' }}>
                {[phone, email].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom floating icon nav — hidden on the application form, which has its own fixed Back/Next bar */}
      {currentPage !== 'become-member' && <>
      <style>{`
        #mobile-icon-nav { display: flex; } @media (min-width: 640px) { #mobile-icon-nav { display: none !important; } }

        /* Tron light trails orbiting the pill's border: a masked conic ring, glow on the wrapper */
        @property --tron-a { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        .nav-tron-glow { position:absolute; inset:-1px; border-radius:25px; pointer-events:none; filter: drop-shadow(0 0 3px rgba(225,11,23,0.9)) drop-shadow(0 0 8px rgba(225,11,23,0.5)); }
        .nav-tron-ring {
          position:absolute; inset:0; border-radius:inherit; padding:2px;
          background: conic-gradient(from var(--tron-a),
            transparent 0deg, rgba(225,11,23,0.15) 60deg, #E10B17 140deg, #FFFFFF 158deg, transparent 162deg,
            transparent 180deg, rgba(185,139,67,0.15) 240deg, #E8C584 320deg, #FFFFFF 338deg, transparent 342deg);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          animation: nav-tron-spin 3.5s linear infinite;
        }
        @keyframes nav-tron-spin { to { --tron-a: 360deg; } }
        @media (prefers-reduced-motion: reduce) { .nav-tron-ring { animation: none; } }
      `}</style>
      <div
        id="mobile-icon-nav"
        className="fixed bottom-4 z-40"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: 24,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.72)',
          boxShadow: '0 8px 40px rgba(14,17,22,0.16)',
          padding: '10px 8px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: MOBILE_NAV_GAP,
        }}
      >
        <span aria-hidden className="nav-tron-glow"><span className="nav-tron-ring"/></span>

        {/* Sliding active pill */}
        <span
          aria-hidden
          style={{
            position: 'absolute', top: 10, left: 8,
            width: MOBILE_NAV_BTN, height: 36, borderRadius: 16,
            background: '#E10B17',
            boxShadow: '0 4px 14px rgba(225,11,23,0.30)',
            transform: `translateX(${pill.pos * (MOBILE_NAV_BTN + MOBILE_NAV_GAP)}px)`,
            opacity: pill.visible ? 1 : 0,
            transition: 'transform 380ms cubic-bezier(0.34, 1.3, 0.64, 1), opacity 200ms',
            pointerEvents: 'none',
          }}
        />
        {MOBILE_NAV_ITEMS.map(({ label, page, icon }, i) => {
          const highlight = i === activeNavIdx
          return (
          <button
            key={label}
            aria-label={label}
            aria-current={highlight ? 'page' : undefined}
            title={label}
            onClick={() => { onInnerNavigate?.(page); setMobileOpen(false) }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              position: 'relative',
              width: MOBILE_NAV_BTN,
              paddingBottom: 0,
              background: 'transparent',
              border: 'none',
              borderRadius: 16,
              cursor: 'pointer',
              color: highlight ? '#FFFFFF' : '#2A3039',
              transition: 'background 160ms, color 200ms',
            }}
            onMouseEnter={(e) => { if (!highlight) (e.currentTarget as HTMLElement).style.background = 'rgba(14,17,22,0.06)' }}
            onMouseLeave={(e) => { if (!highlight) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}>
              {icon}
            </span>
          </button>
          )
        })}
      </div>
      </>}
    </>
  )
}
