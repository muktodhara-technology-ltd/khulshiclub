'use client'

import { useState, useRef, useEffect, useLayoutEffect, lazy, Suspense, createContext, useContext } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import type { PageId } from './components/InnerPage'
import type { CommitteePageType } from './components/CommitteePage'
import type { FacilityId } from './components/FacilitiesPage'
import HomeExtraSections from './components/HomeExtraSections'
import { mediaUrl } from './lib/api/client'
import { useApi } from './lib/useApi'
import { useAbout } from './lib/about'
import { useDirectoryShowcase } from './lib/directory'
import { useSiteInfo, type SiteInfo } from './lib/siteInfo'
import { useHome, parseLink } from './lib/home'
import { useFacilitiesList } from './lib/facilities'
import { useAlbums, useNotices, useNewsList, useVideos } from './lib/media'
import { useMemberSession } from './lib/memberSession'
import { portalLogout } from './lib/portal'
import { readRoute, readSearchQuery, syncUrl, type MediaTab as RouteMediaTab, type PortalTab, type RoutedPage } from './lib/routing'
import { SITE_W } from './lib/layout'
import SearchOverlay from './components/SearchOverlay'
import PersonPortrait from './components/PersonPortrait'

// Inner pages are loaded on demand so the home page doesn't ship every page's code
const InnerPage = lazy(() => import('./components/InnerPage'))
const CommitteePage = lazy(() => import('./components/CommitteePage'))
const FacilitiesPage = lazy(() => import('./components/FacilitiesPage'))
const MembershipProcessPage = lazy(() => import('./components/MembershipProcessPage'))
const MemberListPage = lazy(() => import('./components/MemberListPage'))
const BecomeaMemberPage = lazy(() => import('./components/BecomeaMemberPage'))
const MediaCentrePage = lazy(() => import('./components/MediaCentrePage'))
type MediaTab = RouteMediaTab
const ResourcesPage = lazy(() => import('./components/ResourcesPage'))
const ContactPage = lazy(() => import('./components/ContactPage'))
const SearchPage = lazy(() => import('./components/SearchPage'))
const NotFoundPage = lazy(() => import('./components/NotFoundPage'))
const MemberLoginPage = lazy(() => import('./components/MemberLoginPage'))
const MemberPortalPage = lazy(() => import('./components/MemberPortalPage'))

// Admin text: Enter makes a line break, *word* makes it bold
function Lines({ text }: { text: string }) {
  return <>{text.split('\n').map((line, i) => <span key={i}>{i > 0 && <br/>}{line}</span>)}</>
}
function Bold({ text, color }: { text: string; color: string }) {
  return <>{text.split(/\*(.+?)\*/g).map((part, i) => i % 2 ? <strong key={i} style={{ color, fontWeight: 600 }}>{part}</strong> : part)}</>
}

// Buttons whose destination is set in Admin → Home. AppRoutes supplies how to follow a link.
const FollowLink = createContext<(link: string) => void>(() => {})

// Props for an <a>: web addresses are real links, site pages are handled in-app
function useLinkProps() {
  const follow = useContext(FollowLink)
  return (link: string) => {
    const t = parseLink(link)
    if (t?.kind === 'url') return t.external ? { href: t.href, target: '_blank', rel: 'noopener noreferrer' } : { href: t.href }
    return { href: '#', onClick: (e: React.MouseEvent) => { e.preventDefault(); follow(link) } }
  }
}

// ─── SECTION 1 — Hero ─────────────────────────────────────────────────────────
const HERO_SIDE_SCALE = 0.86
/** Slide frame = upload size 1600×1000 → width/height = 1.6 (16:10). */
const HERO_RATIO = 1.6
const HERO_AUTOPLAY_MS = 5000

// Centre slide + side peeks. 1 slide = static; 2+ = scroll; 3+ = infinite loop.
function Hero() {
  const { home, ready, fromApi } = useHome()
  const linkProps = useLinkProps()
  const hero = home.hero
  // API only — no dummy slides when the request fails or returns empty.
  const slides =
    ready && fromApi
      ? hero.slides.map((s) => ({ src: s.image, alt: s.alt || hero.heading || 'Club' })).filter((s) => s.src)
      : []
  const len = slides.length
  const canScroll = len >= 2
  const loop = len >= 3 // seamless infinite; 2 slides still scroll but wrap with a short clone strip
  const hasCopy = Boolean(hero.heading || hero.text || hero.primary_label || hero.secondary_label)
  // 1 slide: render once. 2 slides: double so both sides can peek. 3+: triple for infinite.
  const items = !len
    ? []
    : len === 1
      ? slides
      : len === 2
        ? [...slides, ...slides, ...slides, ...slides]
        : [...slides, ...slides, ...slides]
  const midStart = len === 1 ? 0 : len === 2 ? len * 1 : len
  const viewportRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)
  const [vw, setVw] = useState(1200)
  const [active, setActive] = useState(midStart)
  const [animate, setAnimate] = useState(true)
  const [paused, setPaused] = useState(false)

  // Start on the middle copy whenever the set of photos changes
  useLayoutEffect(() => {
    if (!len) return
    setAnimate(false)
    setActive(midStart)
  }, [len, midStart])

  // Warm-decode every hero image so the next/peek slide never flashes empty
  const slideSrcKey = slides.map((s) => s.src).join('|')
  useEffect(() => {
    if (!slideSrcKey) return
    slideSrcKey.split('|').forEach((src) => {
      if (!src) return
      const img = new window.Image()
      img.decoding = 'async'
      img.src = src
    })
  }, [slideSrcKey])

  // Measure after the carousel DOM exists. (Early loading return skips the viewport,
  // so this must re-run when ready/len change — otherwise vw stays at the 1200 default
  // and the active slide is not centred.)
  useLayoutEffect(() => {
    if (!ready || !len) return
    const el = viewportRef.current
    if (!el) return
    setVw(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setVw(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ready, len])

  useEffect(() => {
    if (!canScroll || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => { if (!document.hidden) setActive((a) => a + 1) }, HERO_AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [paused, active, canScroll])

  // Re-enable transitions two frames after a silent jump
  useEffect(() => {
    if (animate) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setAnimate(true)) })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [animate])

  const onTrackTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target !== e.currentTarget || !canScroll) return
    if (len === 2) {
      // Keep index inside the middle two copies (len .. 3*len-1)
      if (active >= 3 * len || active < len) {
        setAnimate(false)
        setActive((a) => (a >= 3 * len ? a - 2 * len : a + 2 * len))
      }
      return
    }
    if (loop && (active >= 2 * len || active < len)) {
      setAnimate(false)
      setActive((a) => (a >= 2 * len ? a - len : a + len))
    }
  }

  const go = (dir: -1 | 1) => {
    if (!canScroll) return
    setActive((a) => a + dir)
  }

  // Mobile: main slide takes most of the width; tablet: ~76%; desktop: ~64% so both neighbours show clearly
  const mobile = vw < 768
  const tablet = !mobile && vw < 1024
  const slideRatio = mobile ? 0.88 : tablet ? 0.76 : 0.64
  const slideW = Math.round(vw * slideRatio)
  // Exact 1600×1000 frame (do not flex-shrink — that was making height look short)
  const slideH = Math.round(slideW / HERO_RATIO)
  // Arrows sit on the main slide's edges
  const arrowInset = `calc(${((1 - slideRatio) / 2) * 100}% - 24px)`
  const gap = mobile ? 10 : 20
  const step = slideW * (1 + HERO_SIDE_SCALE) / 2 + gap
  const offset = vw / 2 - slideW / 2 - active * step
  const ease = 'cubic-bezier(.22,1,.36,1)'
  const trackTransition = animate ? `transform 700ms ${ease}` : 'none'
  const slideTransition = animate ? `transform 700ms ${ease}, opacity 700ms` : 'none'

  if (!ready) {
    return <section id="home" className="hero-stage" style={{ background: '#0E1116', minHeight: 320 }} aria-busy="true" />
  }
  if (!fromApi || (!len && !hasCopy)) return null

  return (
    <section id="home" className="hero-stage">
      <style>{`
        /* Stage grows with carousel + copy so buttons never spill into the next section */
        .hero-stage { background:#0E1116; height:auto; min-height:100vh; min-height:100svh; display:flex; flex-direction:column; padding:104px 0 56px; overflow:visible; }
        /* Sit directly under the floating navbar — do not vertically centre (that left a gap) */
        .hero-frame { width:100%; max-width:1680px; margin:0 auto; display:flex; flex-direction:column; justify-content:flex-start; }
        .hero-viewport { position:relative; overflow:hidden; flex:0 0 auto; min-height:0; touch-action:pan-y; }
        @media (max-width:767px) {
          .hero-stage { min-height:0; padding-bottom:48px; }
        }
        .hero-dots { margin-top:14px; flex:none; }
        .hero-copy { flex:none; display:grid; width:100%; max-width:${SITE_W}px; margin:0 auto; padding:18px 20px 0; }
        .hero-copy .eyebrow { margin-bottom:12px !important; }
        .hero-copy h1 { font-size:clamp(28px, 8vw, 36px) !important; margin-bottom:12px !important; }
        .hero-copy p { font-size:14px !important; margin-bottom:18px !important; }
        .hero-copy .hero-btn-primary, .hero-copy .hero-btn-ghost { font-size:14px; padding:12px 18px; }
        .hero-copy .fade-up.flex { flex-wrap:nowrap; gap:10px; }
        @media (min-width:640px) { .hero-stage { padding-bottom:48px; } }
        @media (max-width:639px) and (max-height:720px) {
          .hero-copy .eyebrow { display:none; }
          .hero-copy h1 { font-size:28px !important; }
          .hero-copy p { font-size:13.5px !important; line-height:1.5 !important; }
        }
        @media (min-width:768px) {
          /* Navbar top 20 + bar 72 + small gap — keep hero tight under the header */
          .hero-stage { padding-top:100px; padding-bottom:56px; }
          .hero-viewport { flex:0 0 auto; }
          /* Full-bleed track; side slides fade out at the edges like the committee marquee */
          .hero-frame { max-width:none; justify-content:flex-start; }
          .hero-viewport {
            -webkit-mask-image: linear-gradient(to right, transparent 0, #000 12%, #000 88%, transparent 100%);
                    mask-image: linear-gradient(to right, transparent 0, #000 12%, #000 88%, transparent 100%);
          }
          .hero-copy { grid-template-columns:1.1fr 1fr; align-items:start; gap:48px; padding:28px clamp(24px,5vw,80px) 0; }
          .hero-copy h1 { font-size:clamp(32px, min(4.2vw, 6.4vh), 64px) !important; margin-bottom:0 !important; }
          .hero-copy p { font-size:clamp(14px, 1.15vw, 17px) !important; margin-bottom:22px !important; }
          .hero-copy .hero-btn-primary { font-size:15px; padding:14px 28px; }
          .hero-copy .hero-btn-ghost { font-size:15px; padding:13.5px 26px; }
        }
        .hero-copy .hero-btn-primary, .hero-copy .hero-btn-ghost { white-space:nowrap; }
        /* Tablet: two columns leave the buttons too little room, so stack the copy */
        @media (min-width:768px) and (max-width:1023px) {
          .hero-copy { grid-template-columns:1fr; align-items:start; gap:16px; }
          .hero-copy p { max-width:560px !important; }
        }
        @media (min-width:768px) and (orientation:portrait) {
          .hero-stage { min-height:0; padding-bottom:56px; }
        }
        .hero-arrow { position:absolute; top:50%; z-index:4; width:48px; height:48px; margin-top:-24px; border-radius:999px; border:1.5px solid rgba(255,255,255,0.45); background:rgba(14,17,22,0.35); backdrop-filter:blur(12px); color:#fff; cursor:pointer; align-items:center; justify-content:center; transition:background 200ms, border-color 200ms, transform 180ms ${ease}; }
        .hero-arrow:hover { background:rgba(225,11,23,0.9); border-color:#E10B17; transform:scale(1.06); }
      `}</style>

      <div className="hero-frame">
        <div
          ref={viewportRef}
          className="hero-viewport"
          style={{
            width: '100%',
            height: slideH,
            flex: '0 0 auto',
          }}
          onMouseEnter={() => canScroll && setPaused(true)}
          onMouseLeave={() => canScroll && setPaused(false)}
          onTouchStart={(e) => {
            if (!canScroll) return
            touchX.current = e.touches[0].clientX
            setPaused(true)
          }}
          onTouchEnd={(e) => {
            if (!canScroll) return
            if (touchX.current !== null) {
              const dx = e.changedTouches[0].clientX - touchX.current
              if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
            }
            touchX.current = null
            setPaused(false)
          }}
        >
          {/* Track */}
          <div
            onTransitionEnd={onTrackTransitionEnd}
            style={{ position: 'absolute', inset: 0, transform: `translateX(${offset}px)`, transition: trackTransition, willChange: 'transform' }}
          >
            {items.map((s, i) => {
              const isActive = i === active
              const near = Math.abs(i - active) <= 2
              return (
                <div
                  key={i}
                  className="absolute top-0 overflow-hidden bg-[#1a1a1a]"
                  onClick={() => { if (canScroll && !isActive) setActive(i) }}
                  aria-hidden={!isActive || undefined}
                  style={{
                    left: i * step,
                    width: slideW,
                    height: slideH,
                    aspectRatio: `${HERO_RATIO}`,
                    borderRadius: mobile ? 22 : 24,
                    transform: `scale(${isActive ? 1 : HERO_SIDE_SCALE})`,
                    opacity: isActive ? 1 : canScroll ? 0.5 : 1,
                    cursor: canScroll && !isActive ? 'pointer' : 'default',
                    zIndex: isActive ? 2 : 1,
                    transition: slideTransition,
                  }}
                >
                  <img
                    src={s.src}
                    alt={s.alt}
                    loading="eager"
                    decoding="async"
                    fetchPriority={near ? 'high' : 'low'}
                    draggable={false}
                    className="w-full h-full object-cover"
                  />
                  {/* Light bottom scrim to seat the image on the dark stage */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.35) 0%, transparent 40%)' }}/>
                </div>
              )
            })}
          </div>

          {/* Arrows — only when there is more than one slide */}
          {canScroll && (
            <>
              <button className="hero-arrow hidden md:flex" aria-label="Previous slide" onClick={() => go(-1)} style={{ left: arrowInset }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>
              </button>
              <button className="hero-arrow hidden md:flex" aria-label="Next slide" onClick={() => go(1)} style={{ right: arrowInset }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
              </button>
            </>
          )}
        </div>

        {/* Position dots — hide for a single image */}
        {canScroll && (
          <div className="hero-dots flex justify-center gap-1.5">
            {slides.map((s, i) => {
              const on = ((active % len) + len) % len === i
              return (
                <button
                  key={i}
                  aria-label={`Show slide ${i + 1}: ${s.alt}`}
                  onClick={() => { setAnimate(true); setActive(midStart + i) }}
                  style={{ width: on ? 22 : 6, height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: on ? '#E10B17' : 'rgba(255,255,255,0.28)', transition: 'width 300ms, background 300ms' }}
                />
              )
            })}
          </div>
        )}

        {/* Copy — below the carousel */}
        <div className="hero-copy">
          <div>
            <div
              className="eyebrow fade-up mb-5"
              style={{ color: 'rgba(185,139,67,0.95)', fontSize: 11 }}
            >
              {hero.eyebrow}
            </div>
            <h1
              className="fade-up fade-up-delay-1"
              style={{
                fontFamily: 'CKCL',
                fontWeight: 600,
                fontSize: 'clamp(34px, 4.6vw, 68px)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
                margin: '0 0 20px',
              }}
            >
              <Lines text={hero.heading}/>
            </h1>
          </div>
          <div>
            <p
              className="fade-up fade-up-delay-2"
              style={{
                fontFamily: 'CKCL',
                fontSize: 'clamp(14px, 1.2vw, 17px)',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.85)',
                maxWidth: 480,
                margin: '0 0 28px',
              }}
            >
              {hero.text}
            </p>
            <div className="fade-up fade-up-delay-3 flex flex-wrap gap-3">
              <style>{`
                .hero-btn-primary { display:inline-flex;align-items:center;gap:10px;font-family:'CKCL';font-size:15px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(175deg,#FF2D3A 0%,#E10B17 38%,#A0000A 100%);border-radius:999px;padding:14px 28px;box-shadow:0 1px 0 rgba(255,255,255,0.22) inset,0 -2px 0 rgba(0,0,0,0.18) inset,0 6px 24px rgba(225,11,23,0.40),0 2px 6px rgba(0,0,0,0.20);transition:transform 180ms cubic-bezier(.22,1,.36,1),box-shadow 240ms,background 240ms;will-change:transform;letter-spacing:-0.01em; }
                .hero-btn-primary:hover { transform:translateY(-2px) scale(1.02);background:linear-gradient(175deg,#FF4550 0%,#F01020 38%,#B0000C 100%);box-shadow:0 1px 0 rgba(255,255,255,0.22) inset,0 -2px 0 rgba(0,0,0,0.18) inset,0 16px 48px rgba(225,11,23,0.55),0 4px 16px rgba(0,0,0,0.24); }
                .hero-btn-primary:active { transform:translateY(0) scale(0.99);background:linear-gradient(175deg,#D00010 0%,#B8000C 38%,#8A0008 100%); }
                .hero-btn-primary .btn-arrow { transition:transform 200ms cubic-bezier(.22,1,.36,1); }
                .hero-btn-primary:hover .btn-arrow { transform:translateX(4px); }
                .hero-btn-ghost { display:inline-flex;align-items:center;gap:10px;font-family:'CKCL';font-size:15px;font-weight:600;color:#fff;text-decoration:none;border:1.5px solid rgba(255,255,255,0.50);border-radius:999px;padding:13.5px 26px;backdrop-filter:blur(12px);background:rgba(255,255,255,0.06);transition:transform 180ms cubic-bezier(.22,1,.36,1),background 200ms,border-color 200ms;will-change:transform;letter-spacing:-0.01em; }
                .hero-btn-ghost:hover { transform:translateY(-2px);background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.75); }
                .hero-btn-ghost:active { transform:translateY(0); }
                .hero-btn-ghost .btn-arrow { transition:transform 200ms cubic-bezier(.22,1,.36,1); }
                .hero-btn-ghost:hover .btn-arrow { transform:translateX(4px); }
              `}</style>
              <a {...linkProps(hero.primary_link)} className="hero-btn-primary">
                {hero.primary_label || 'Become a Member'}
                <svg className="btn-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
              </a>
              <a {...linkProps(hero.secondary_link)} className="hero-btn-ghost">
                {hero.secondary_label || 'Take a Tour'}
                <svg className="btn-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Homepage content sections: wider column, and white / pale-grey backgrounds alternating
// Governance · News (alt) · Membership · Facilities (alt) · Gallery · About (alt)
const HOME_W = SITE_W
const HOME_BG_ALT = '#F3F5F8'

// ─── SECTION 2 — About ────────────────────────────────────────────────────────
function About() {
  const a = useHome().home.about
  const linkProps = useLinkProps()
  if (!a.heading && !a.para1 && !a.para2 && !a.photo_main && !a.photo_small) return null
  return (
    <section id="about" className="section-pad" style={{ background: HOME_BG_ALT }}>
      <div style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)' }}>
        {/* 7/5 grid */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left — 7 cols */}
          <div className="lg:col-span-7">
            {a.eyebrow && <div className="eyebrow mb-4" style={{ color: '#B98B43' }}>{a.eyebrow}</div>}
            <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(26px, 2.8vw, 40px)', lineHeight: 1.15, color: '#0E1116', letterSpacing: '-0.015em', marginBottom: 28 }}>
              <Lines text={a.heading}/>
            </h2>
            {a.para1 && (
              <p style={{ fontFamily: 'CKCL', fontSize: 17, lineHeight: 1.65, color: '#2A3039', marginBottom: 20, maxWidth: 560 }}>
                {a.para1}
              </p>
            )}
            {a.para2 && (
              <p style={{ fontFamily: 'CKCL', fontSize: 17, lineHeight: 1.65, color: '#5C6673', marginBottom: 32, maxWidth: 560 }}>
                {a.para2}
              </p>
            )}
            {a.link_label && <a
              {...linkProps(a.link_url)}
              className="inline-flex items-center gap-1.5"
              style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: '#E10B17', textDecoration: 'none' }}
            >
              {a.link_label}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>}
          </div>

          {/* Right — 5 cols, stacked photos */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0" style={{ minHeight: 400 }}>
            {/* Back photo */}
            <div style={{ borderRadius: 20, overflow: 'hidden', width: '85%', aspectRatio: '4/3', marginLeft: 'auto', background: '#EEF1F5' }}>
              {a.photo_main ? (
                <img src={a.photo_main} alt={a.heading || 'About the club'} className="w-full h-full object-cover"/>
              ) : null}
            </div>
            {/* Front photo — offset and overlapping */}
            <div
              style={{
                position: 'absolute', top: '38%', left: 0,
                borderRadius: 20, overflow: 'hidden',
                width: '65%', aspectRatio: '3/2',
                background: '#EEF1F5',
                boxShadow: '0 16px 48px -8px rgba(14,17,22,0.16)',
              }}
            >
              {a.photo_small ? (
                <img src={a.photo_small} alt={a.heading || 'About the club'} className="w-full h-full object-cover"/>
              ) : null}
              {/* EST. 2013 glass badge */}
              {a.badge && <div
                className="glass-strong absolute"
                style={{
                  bottom: 12, right: 12,
                  borderRadius: 10, padding: '8px 14px',
                  borderLeft: `2px solid #B98B43`,
                }}
              >
                <div className="eyebrow" style={{ fontSize: 10, color: '#0E1116' }}>{a.badge}</div>
              </div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 3 — Facilities bento ─────────────────────────────────────────────
type FacilityTile = {
  id: string; name: string; caption: string; img: string; alt: string;
  avail: string; gridArea: string;
}

/** Desktop bento slot names (layout only — tile content comes from the facilities API). */
const BENTO_AREAS = ['pool', 'rest', 'guest', 'coffee', 'conv', 'salon', 'bar', 'card'] as const

// Mobile gallery tile sizes (columns × 72px rows); the sequence packs into two columns with no gaps
const GALLERY_SPANS: Record<string, { col: number; row: number }> = {
  pool:   { col: 2, row: 3 },
  rest:   { col: 1, row: 4 },
  guest:  { col: 1, row: 2 },
  coffee: { col: 1, row: 2 },
  conv:   { col: 2, row: 3 },
  salon:  { col: 1, row: 2 },
  bar:    { col: 1, row: 4 },
  card:   { col: 1, row: 2 },
}

function FacilityCard({ tile, onSelect }: { tile: FacilityTile; onSelect?: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative overflow-hidden"
      style={{
        gridArea: tile.gridArea,
        borderRadius: 20,
        background: '#EEF1F5',
        cursor: 'pointer',
        border: hovered ? '1px solid #E10B17' : '1px solid transparent',
        transition: 'border-color 200ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect?.(tile.id)}
    >
      {tile.img ? (
        <img
          src={tile.img}
          alt={tile.alt}
          className="w-full h-full object-cover"
          style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 400ms ease-out', display: 'block' }}
        />
      ) : null}
      {/* Dark gradient */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.80) 0%, rgba(14,17,22,0.20) 50%, transparent 100%)' }}/>
      {/* Availability chip top-right */}
      {tile.avail ? (
        <div
          className="absolute top-3 right-3 glass-subtle eyebrow"
          style={{ fontSize: 9, color: '#FFFFFF', borderRadius: 999, padding: '5px 10px' }}
        >
          {tile.avail}
        </div>
      ) : null}
      {/* Facility name + caption */}
      <div
        className="absolute bottom-0 left-0 right-0 p-5"
        style={{ transform: hovered ? 'translateY(0)' : 'translateY(0)' }}
      >
        <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 16, color: '#FFFFFF', marginBottom: 3 }}>{tile.name}</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 12, color: 'rgba(255,255,255,0.80)' }}>{tile.caption}</div>
        {/* Slide-up "View details" panel */}
        <a
          href="#"
          className="inline-flex items-center gap-1 mt-3"
          style={{
            fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: '#FFFFFF',
            textDecoration: 'none', opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 200ms, transform 200ms',
          }}
        >
          View details →
        </a>
      </div>
    </div>
  )
}

function Facilities({ onSelectFacility }: { onSelectFacility?: (id: string) => void }) {
  const f = useHome().home.facilities
  const linkProps = useLinkProps()
  // Same Facilities page API as /facilities — heading copy from Home CMS.
  const { facilities: live } = useFacilitiesList()
  const tiles: FacilityTile[] = live.slice(0, BENTO_AREAS.length).map((x, i) => ({
    id: String(x.slug || x.id),
    name: x.name,
    caption: x.caption ?? '',
    avail: x.avail ?? '',
    img: x.img || '',
    alt: x.name,
    gridArea: (x.gridArea && BENTO_AREAS.includes(x.gridArea as typeof BENTO_AREAS[number]) ? x.gridArea : null) || BENTO_AREAS[i] || `f${i}`,
  }))
  // The bento needs all eight tiles; with fewer, fall back to an even grid
  const bento = tiles.length === BENTO_AREAS.length
  if (!f.enabled) return null
  if (!tiles.length && !f.heading && !f.text) return null
  return (
    <section id="facilities" className="section-pad" style={{ background: HOME_BG_ALT }}>
      <div style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)' }}>
        <div className="mb-12">
          {f.eyebrow && <div className="eyebrow mb-3" style={{ color: '#B98B43' }}>{f.eyebrow}</div>}
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            {f.heading ? (
              <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(26px,2.8vw,40px)', color: '#0E1116', lineHeight: 1.15, letterSpacing: '-0.015em', margin: 0 }}>
                <Lines text={f.heading}/>
              </h2>
            ) : null}
            <div className="flex flex-col items-start gap-4" style={{ maxWidth: 340 }}>
              {f.text && (
                <p style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.6, color: '#5C6673', margin: 0 }}>
                  {f.text}
                </p>
              )}
              {(f.button_label || f.button_link) && (
                <a
                  {...linkProps(f.button_link || 'page:facilities')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: '#E10B17', textDecoration: 'none' }}
                >
                  {f.button_label || 'View all facilities'} →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bento grid — desktop: pool is 2×2 */}
        <div
          className="hidden lg:grid gap-4"
          style={bento ? {
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(3, 240px)',
            gridTemplateAreas: `
              "pool pool rest  guest"
              "pool pool conv  conv "
              "coffee salon bar  card "
            `,
          } : { gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 240 }}
        >
          {tiles.map((tile) => <FacilityCard key={tile.gridArea} tile={bento ? tile : { ...tile, gridArea: 'auto' }} onSelect={onSelectFacility}/>)}
        </div>

        {/* Tablet / mobile: photo-gallery mosaic — mixed wide, tall and square tiles in two columns */}
        <style>{`
          .fac-gallery { display:grid; grid-template-columns:1fr 1fr; grid-auto-rows:72px; grid-auto-flow:dense; gap:8px; }
          @media (min-width:640px) { .fac-gallery { grid-auto-rows:112px; gap:12px; } }
          .fac-photo { position:relative; overflow:hidden; border-radius:16px; background:#DDE2E9; cursor:pointer; -webkit-tap-highlight-color:transparent; }
          .fac-photo img { display:block; width:100%; height:100%; object-fit:cover; transition:transform 500ms cubic-bezier(.22,1,.36,1); }
          .fac-photo:active img { transform:scale(1.04); }
          .fac-photo:focus-visible { outline:2px solid #E10B17; outline-offset:2px; }
        `}</style>
        {/* lg:hidden lives on a wrapper: the unlayered .fac-gallery display rule would override it */}
        <div className="lg:hidden">
        <div className="fac-gallery">
          {tiles.map((tile, i) => {
            const span = (bento && GALLERY_SPANS[tile.gridArea]) || { col: 1, row: 2 }
            const featured = span.col === 2 || span.row >= 4
            return (
              <div
                key={tile.gridArea}
                role="button"
                tabIndex={0}
                className="fac-photo"
                style={{ gridColumn: `span ${span.col}`, gridRow: `span ${span.row}` }}
                onClick={() => onSelectFacility?.(tile.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectFacility?.(tile.id) } }}
              >
                {tile.img ? <img src={tile.img} alt={tile.alt} loading="lazy"/> : null}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.72) 0%, rgba(14,17,22,0.15) 45%, transparent 70%)' }}/>
                <div className="absolute top-2.5 left-3" style={{ fontFamily: 'CKCL', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 6px rgba(0,0,0,0.55)' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="absolute bottom-0 left-0 right-0" style={{ padding: featured ? '14px 16px' : '10px 12px' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: featured ? 16 : 13.5, lineHeight: 1.2, color: '#FFFFFF' }}>{tile.name}</div>
                    {featured && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" style={{ flex: 'none' }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
                    )}
                  </div>
                  {featured && (
                    <div style={{ fontFamily: 'CKCL', fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 3 }}>{tile.caption}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </div>
      </div>
    </section>
  )
}

// ─── Highlights strip (Home CMS → highlights.items) ───────────────────────────
function Highlights() {
  const h = useHome().home.highlights
  if (!h.enabled || !h.items.length) return null
  return (
    <section id="highlights" className="section-pad" style={{ background: '#FFFFFF' }}>
      <div style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)' }}>
        {(h.eyebrow || h.heading || h.text) && (
          <div className="mb-10 lg:mb-12" style={{ maxWidth: 640 }}>
            {h.eyebrow && <div className="eyebrow mb-3" style={{ color: '#B98B43' }}>{h.eyebrow}</div>}
            {h.heading && (
              <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(26px,2.8vw,40px)', color: '#0E1116', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 12px' }}>
                <Lines text={h.heading} />
              </h2>
            )}
            {h.text && <p style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.65, color: '#5C6673', margin: 0 }}>{h.text}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {h.items.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              style={{
                padding: 'clamp(18px,2vw,28px)',
                borderRadius: 20,
                background: HOME_BG_ALT,
                border: '1px solid #E2E6EC',
              }}
            >
              <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(28px,3vw,40px)', color: '#E10B17', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {item.value}
              </div>
              <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 14, color: '#0E1116', marginTop: 10 }}>{item.label}</div>
              {item.note && <div style={{ fontFamily: 'CKCL', fontSize: 12, color: '#5C6673', marginTop: 4, lineHeight: 1.45 }}>{item.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 4 — Notices & News (same Media Centre APIs as /media) ────────────
type NewsTab = 'notices' | 'news'

function NoticesNews({ onOpenMedia }: { onOpenMedia: (tab: MediaTab) => void }) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [tab, setTab] = useState<NewsTab>('notices')

  const { data: noticesData } = useNotices()
  const { data: newsData } = useNewsList()
  const { data: videosData } = useVideos()

  const NOTICES = (noticesData?.notices ?? []).slice(0, 6).map((n) => ({
    ...n,
    day: n.date.split(' ')[0] || '',
    month: (n.date.split(' ')[1] ?? '').toUpperCase(),
  }))
  const featured = newsData?.featured ?? null
  const allNews = featured
    ? [featured, ...(newsData?.articles ?? []).filter((a) => a.slug !== featured.slug)]
    : (newsData?.articles ?? [])
  // Newest news that has a cover image (by upload/update time).
  const latestNewsCover = [...allNews]
    .filter((a) => a.image)
    .sort((a, b) => b.uploadedAt - a.uploadedAt)[0] ?? null
  const latestVideo = [...(videosData?.videos ?? [])]
    .sort((a, b) => b.uploadedAt - a.uploadedAt)[0] ?? null
  // Lead slot: whichever was uploaded last — news cover photo, or video from Video tab.
  const leadKind: 'news' | 'video' | null =
    latestNewsCover && latestVideo
      ? (latestVideo.uploadedAt > latestNewsCover.uploadedAt ? 'video' : 'news')
      : latestNewsCover
        ? 'news'
        : latestVideo
          ? 'video'
          : null
  const leadNews = leadKind === 'news' ? latestNewsCover : null
  const leadVideo = leadKind === 'video' ? latestVideo : null
  // Text rows: up to 2 news items (skip the lead news so it is not duplicated).
  const NEWS_ITEMS = allNews
    .filter((a) => !(leadNews && a.slug === leadNews.slug))
    .slice(0, 2)

  const viewAll = (t: MediaTab) => (e: React.MouseEvent) => { e.preventDefault(); onOpenMedia(t) }

  // On mobile only the active tab's panel shows; from lg both sit side by side
  const panelVisibility = (t: NewsTab) => (tab === t ? 'flex' : 'hidden') + ' lg:flex'

  if (!NOTICES.length && !leadNews && !leadVideo && !NEWS_ITEMS.length) return null

  return (
    <section id="media" className="section-pad" style={{ position: 'relative', background: HOME_BG_ALT, overflow: 'hidden' }}>
      {/* Blurred backdrop */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(225,11,23,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }}/>
        <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,139,67,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }}/>
      </div>

      <div style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(16px,5vw,80px)', position: 'relative', zIndex: 1 }}>
        <div className="eyebrow mb-3 lg:mb-10" style={{ color: '#B98B43' }}>NEWS & NOTICES</div>

        {/* Mobile: title + segmented tabs */}
        <div className="lg:hidden mb-5">
          <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 26, color: '#0E1116', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 16px' }}>
            What's happening<br/>at the club.
          </h2>
          <div role="tablist" className="flex" style={{ padding: 4, borderRadius: 999, background: '#EEF1F5' }}>
            {([['notices', 'Notices'], ['news', 'News & Events']] as const).map(([id, label]) => {
              const on = tab === id
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(id)}
                  style={{
                    flex: 1, height: 40, borderRadius: 999, border: 'none', cursor: 'pointer',
                    fontFamily: 'CKCL', fontSize: 14, fontWeight: 600,
                    background: on ? '#FFFFFF' : 'transparent',
                    color: on ? '#0E1116' : '#5C6673',
                    boxShadow: on ? '0 2px 8px rgba(14,17,22,0.10)' : 'none',
                    transition: 'background 200ms, color 200ms, box-shadow 200ms',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 7/5 glass panels */}
        <div className="grid lg:grid-cols-12 gap-6" style={{ minWidth: 0 }}>
          {/* Notices — 7 cols */}
          <div
            role="tabpanel"
            className={`${panelVisibility('notices')} flex-col lg:col-span-7 glass-strong p-3 sm:p-5 lg:p-7`}
            style={{ borderRadius: 24, minWidth: 0, overflow: 'hidden' }}
          >
            <div className="flex items-center justify-between px-2 pt-1 lg:px-0 lg:pt-0 mb-2 lg:mb-6">
              <h2 className="hidden lg:block" style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 28, color: '#0E1116', margin: 0 }}>Notices</h2>
              <span className="lg:hidden eyebrow" style={{ fontSize: 10, color: '#A8B0BB' }}>Latest {NOTICES.length}</span>
              <a href="#" onClick={viewAll('notices')} style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: '#E10B17', textDecoration: 'none' }}>View all →</a>
            </div>
            <div className="flex flex-col">
              {NOTICES.length === 0 && (
                <div style={{ padding: '28px 12px', fontFamily: 'CKCL', fontSize: 14, color: '#A8B0BB', textAlign: 'center' }}>No notices yet.</div>
              )}
              {NOTICES.map((n, i) => (
                <div key={n.id} style={{ borderTop: i > 0 ? '1px solid rgba(226,230,236,0.7)' : 'none' }}>
                  <a
                    href={n.file_url ?? '#'}
                    target={n.file_url ? '_blank' : undefined}
                    rel={n.file_url ? 'noopener' : undefined}
                    onClick={n.file_url ? undefined : viewAll('notices')}
                    className="flex items-center gap-3 sm:gap-4 px-2 sm:px-3 py-3 rounded-xl transition-all"
                    style={{ textDecoration: 'none', background: hoveredRow === i ? 'rgba(255,255,255,0.70)' : 'transparent' }}
                    onMouseEnter={() => setHoveredRow(i)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Date block */}
                    <div
                      className="flex flex-col items-center justify-center shrink-0"
                      style={{ width: 48, height: 52, background: '#FFF1F2', borderRadius: 12 }}
                    >
                      <span style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 18, color: '#E10B17', lineHeight: 1 }}>{n.day}</span>
                      <span className="eyebrow" style={{ fontSize: 9, color: '#5C6673', marginTop: 3 }}>{n.month}</span>
                    </div>
                    {/* Title — wraps to two lines instead of truncating */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="line-clamp-2"
                        style={{
                          fontFamily: 'CKCL',
                          fontSize: n.bangla ? 15 : 14,
                          lineHeight: n.bangla ? 1.5 : 1.4,
                          color: '#0E1116',
                          fontWeight: 500,
                        }}
                      >
                        {n.title}
                      </div>
                      <div className="flex items-center gap-1.5" style={{ marginTop: 4 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span className="eyebrow" style={{ fontSize: 9, color: '#A8B0BB' }}>{n.fileType ? `${n.fileType} · ` : ''}{n.year}</span>
                      </div>
                    </div>
                    {/* Chevron */}
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2"
                      style={{ transform: hoveredRow === i ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 160ms', flexShrink: 0 }}
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* News & Events — 5 cols */}
          <div
            role="tabpanel"
            className={`${panelVisibility('news')} lg:col-span-5 glass-strong p-3 sm:p-5 lg:p-7 flex-col gap-3 lg:gap-5`}
            style={{ borderRadius: 24, minWidth: 0, overflow: 'hidden' }}
          >
            <div className="flex items-center justify-between px-2 pt-1 lg:px-0 lg:pt-0">
              <h2 className="hidden lg:block" style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 28, color: '#0E1116', margin: 0 }}>News & Events</h2>
              <span className="lg:hidden eyebrow" style={{ fontSize: 10, color: '#A8B0BB' }}>Latest stories</span>
              <a href="#" onClick={viewAll('news')} style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: '#E10B17', textDecoration: 'none' }}>View all →</a>
            </div>

            {/* Lead: last-uploaded news cover, or last-uploaded video */}
            {leadNews && (
              <div
                className="relative overflow-hidden cursor-pointer aspect-video lg:aspect-auto"
                onClick={() => onOpenMedia('news')}
                style={{ borderRadius: 16, flex: '1 1 auto', minHeight: 180, background: '#EEF1F5' }}
              >
                <img src={leadNews.image!} alt={leadNews.title} className="absolute inset-0 w-full h-full object-cover" style={{ display: 'block' }}/>
                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.80), transparent)' }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <span
                      className="eyebrow"
                      style={{ fontSize: 9, borderRadius: 6, padding: '3px 7px', background: leadNews.category === 'Event' ? '#DCFCE7' : '#FFF1F2', color: leadNews.category === 'Event' ? '#15803D' : '#E10B17' }}
                    >
                      {leadNews.category}
                    </span>
                    {leadNews.date && <span className="eyebrow" style={{ fontSize: 9, color: 'rgba(255,255,255,0.70)' }}>{leadNews.date.toUpperCase()}</span>}
                  </div>
                  <div style={{ fontFamily: 'CKCL', fontSize: 15, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.3 }}>{leadNews.title}</div>
                  {leadNews.excerpt && <div className="line-clamp-1" style={{ fontFamily: 'CKCL', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{leadNews.excerpt}</div>}
                </div>
              </div>
            )}

            {leadVideo && (
              <div className="relative overflow-hidden cursor-pointer aspect-video lg:aspect-auto" onClick={() => onOpenMedia('video')} style={{ borderRadius: 16, flex: '1 1 auto', minHeight: 180, background: '#111' }}>
                {leadVideo.thumb && <img src={leadVideo.thumb} alt={leadVideo.title} className="absolute inset-0 w-full h-full object-cover" style={{ display: 'block', opacity: 0.85 }}/>}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="glass-strong flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: '50%' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#E10B17"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.80), transparent)' }}>
                  <div style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{leadVideo.title}</div>
                  {leadVideo.description && <div className="line-clamp-1" style={{ fontFamily: 'CKCL', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{leadVideo.description}</div>}
                </div>
              </div>
            )}

            {/* Compact text rows for the next stories */}
            <div className="flex flex-col">
              {NEWS_ITEMS.map((item, i) => (
                <div key={item.id} style={{ borderTop: i > 0 ? '1px solid rgba(226,230,236,0.7)' : 'none' }}>
                  <a
                    href="#"
                    onClick={viewAll('news')}
                    className="flex items-center gap-3 px-2 sm:px-3 py-3 rounded-xl transition-all"
                    style={{ textDecoration: 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(238,241,245,0.60)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2" style={{ marginBottom: 5 }}>
                        <span
                          className="eyebrow"
                          style={{ fontSize: 9, borderRadius: 6, padding: '3px 7px', background: item.category === 'Event' ? '#DCFCE7' : '#FFF1F2', color: item.category === 'Event' ? '#15803D' : '#E10B17' }}
                        >
                          {item.category}
                        </span>
                        <span className="eyebrow" style={{ fontSize: 9, color: '#A8B0BB' }}>{item.date.toUpperCase()}</span>
                      </div>
                      <div style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 500, color: '#0E1116', lineHeight: 1.4 }}>{item.title}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Card data shared by the committee and member-directory showcases
type ShowcasePerson = { name: string; role: string; company: string; img: string | null }

/** Committee carousel chrome: ◀  ▶ only. */
function CarouselScrollBar({
  count,
  onPrev,
  onNext,
}: {
  index: number
  count: number
  onPrev: () => void
  onNext: () => void
}) {
  if (count <= 1) return null
  const btn: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 999,
    border: '1.5px solid #C8CED6',
    background: 'transparent',
    color: '#0E1116',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'border-color 180ms, background 180ms, color 180ms',
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 28,
        padding: '0 16px',
      }}
    >
      <button
        type="button"
        aria-label="Previous"
        onClick={onPrev}
        style={btn}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#E10B17'
          e.currentTarget.style.color = '#E10B17'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#C8CED6'
          e.currentTarget.style.color = '#0E1116'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={onNext}
        style={btn}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#E10B17'
          e.currentTarget.style.color = '#E10B17'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#C8CED6'
          e.currentTarget.style.color = '#0E1116'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  )
}

function CommitteeCardContent({ m, compact }: { m: ShowcasePerson; compact?: boolean }) {
  return (
    <>
      <PersonPortrait src={m.img} name={m.name} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,13,16,0.88) 0%, rgba(10,13,16,0.40) 14%, transparent 26%)' }}/>
      <div className="absolute bottom-0 left-0 right-0" style={{ padding: compact ? 14 : 18 }}>
        {m.role ? (
          <div className="eyebrow" style={{ display: 'block', fontSize: compact ? 9 : 10, fontWeight: 600, color: '#E8C584', marginBottom: compact ? 6 : 8 }}>{m.role}</div>
        ) : null}
        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: compact ? 14 : 16, color: '#FFFFFF', lineHeight: 1.25, marginBottom: 4 }}>{m.name}</div>
        {m.company ? (
          <div style={{ fontFamily: 'CKCL', fontSize: compact ? 11 : 12, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.company}</div>
        ) : null}
      </div>
    </>
  )
}

// Cover-flow carousel (ILLIYEEN-style): one large centre card, stacked smaller neighbours.
const CF_AUTOPLAY_MS = 3200
const CF_EASE = 'cubic-bezier(.22,1,.36,1)'

function coverflowScale(dist: number) {
  if (dist === 0) return 1
  return Math.max(0.78, 1 - Math.abs(dist) * 0.1)
}
function coverflowOpacity(_dist: number) {
  return 1
}

function CommitteeCarouselMobile({ people }: { people: ShowcasePerson[] }) {
  const len = people.length
  const items = [...people, ...people, ...people]
  const viewportRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)
  const prevActive = useRef(len)
  const [vw, setVw] = useState(390)
  const [active, setActive] = useState(len)
  const [animate, setAnimate] = useState(true)
  const [paused, setPaused] = useState(false)
  const [exitI, setExitI] = useState<number | null>(null)
  const [exitDist, setExitDist] = useState<-2 | 2>(-2)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setVw(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (paused || len < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => { if (!document.hidden) setActive((a) => a + 1) }, CF_AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [paused, active, len])

  useEffect(() => {
    if (animate) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setAnimate(true)) })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [animate])

  useLayoutEffect(() => {
    const prev = prevActive.current
    const d = active - prev
    if (d !== 0) {
      const dist = (d > 0 ? -2 : 2) as -2 | 2
      setExitI(prev + dist)
      setExitDist(dist)
    }
    prevActive.current = active
  }, [active])

  useEffect(() => {
    if (exitI === null) return
    const t = window.setTimeout(() => setExitI(null), 670)
    return () => window.clearTimeout(t)
  }, [exitI, active])

  const onTrackTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target !== e.currentTarget) return
    if (active >= 2 * len || active < len) {
      setAnimate(false)
      setActive((a) => (a >= 2 * len ? a - len : a + len))
    }
  }

  const cardW = Math.min(250, Math.round(vw * 0.58))
  const cardH = Math.round(cardW * 1.35)
  // Light gap from the centre — side cards must not tuck under it
  const step = Math.round(cardW * 0.98)
  const offset = vw / 2 - cardW / 2 - active * step
  const transition = animate ? `transform 650ms ${CF_EASE}, opacity 650ms, box-shadow 650ms` : 'none'

  return (
    <div
      ref={viewportRef}
      style={{ width: '100%', overflow: 'hidden', padding: '20px 0 8px', touchAction: 'pan-y' }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true) }}
      onTouchEnd={(e) => {
        if (touchX.current !== null) {
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) setActive((a) => a + (dx < 0 ? 1 : -1))
        }
        touchX.current = null
        setPaused(false)
      }}
    >
      <div
        onTransitionEnd={onTrackTransitionEnd}
        style={{
          position: 'relative',
          height: Math.round(cardH * 1.08),
          transform: `translateX(${offset}px)`,
          transition: animate ? `transform 650ms ${CF_EASE}` : 'none',
        }}
      >
        {items.map((m, i) => {
          const dist = i - active
          const isExit = exitI === i
          // Keep 5 in layout; hold the covered outer card until neighbour lands
          if (!isExit && Math.abs(dist) > 2) return null
          const useDist = isExit ? exitDist : dist
          const isActive = useDist === 0
          const scale = coverflowScale(useDist)
          return (
            <div
              key={i}
              className="absolute top-0 overflow-hidden"
              onClick={() => { if (!isExit) setActive(i) }}
              aria-hidden={!isActive || undefined}
              style={{
                left: isExit ? (active + exitDist) * step : i * step,
                width: cardW,
                height: cardH,
                top: Math.round((cardH * 1.08 - cardH) / 2),
                borderRadius: 0,
                background: '#EEF1F5',
                border: isActive ? '1px solid rgba(14,17,22,0.12)' : '1px solid rgba(14,17,22,0.06)',
                transform: `scale(${scale})`,
                opacity: coverflowOpacity(useDist),
                boxShadow: isActive
                  ? '0 10px 24px -12px rgba(14,17,22,0.18)'
                  : '0 6px 16px -12px rgba(14,17,22,0.12)',
                zIndex: isExit ? 10 : 20 - Math.abs(useDist),
                transition: isExit ? 'none' : transition,
                cursor: isActive || isExit ? 'default' : 'pointer',
                pointerEvents: isExit ? 'none' : 'auto',
              }}
            >
              <CommitteeCardContent m={m} compact/>
              {!isActive && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    borderRadius: 0,
                    background: 'rgba(14,17,22,0.34)',
                    backdropFilter: 'blur(2.5px)',
                    WebkitBackdropFilter: 'blur(2.5px)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      <CarouselScrollBar
        index={active}
        count={len}
        onPrev={() => setActive((a) => a - 1)}
        onNext={() => setActive((a) => a + 1)}
      />
    </div>
  )
}

function CommitteeCarouselDesktop({ people, reverse = false }: { people: ShowcasePerson[]; reverse?: boolean }) {
  const len = people.length
  const copies = Math.max(1, Math.ceil(14 / Math.max(len, 1)))
  const items = Array.from({ length: copies }, () => people).flat()
  const n = items.length
  const viewportRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const prevActive = useRef(0)
  const [vw, setVw] = useState(1120)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  // Frozen under the neighbour until cover finishes — set in the same tick as active
  const [exitCard, setExitCard] = useState<null | { i: number; slot: -2 | 2 }>(null)

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    setVw(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setVw(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const slotOf = (i: number, a: number) => {
    if (!n) return 0
    const r = (((i - a) % n) + n) % n
    return r > n / 2 ? r - n : r
  }

  const stepBy = (dir: number) => {
    if (!dir || !n) return
    const a = activeRef.current
    const exitSlot = (dir > 0 ? -2 : 2) as -2 | 2
    let exitI = -1
    for (let i = 0; i < n; i++) {
      if (slotOf(i, a) === exitSlot) { exitI = i; break }
    }
    prevActive.current = a
    const next = a + dir
    activeRef.current = next
    setExitCard(exitI >= 0 ? { i: exitI, slot: exitSlot } : null)
    setActive(next)
  }

  useEffect(() => {
    if (!exitCard) return
    const t = window.setTimeout(() => setExitCard(null), 720)
    return () => window.clearTimeout(t)
  }, [exitCard, active])

  useEffect(() => {
    if (paused || len < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      if (!document.hidden) stepBy(reverse ? -1 : 1)
    }, CF_AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [paused, active, reverse, len, n])

  const cardW = Math.min(320, Math.max(250, Math.round(vw * 0.26)))
  const cardH = Math.round(cardW * 1.32)
  const peek = Math.round(cardW * 0.78)
  const delta = active - prevActive.current
  const centerX = vw / 2 - cardW / 2

  const renderCard = (
    i: number,
    m: ShowcasePerson,
    slot: number,
    opts: { frozen?: boolean; wrapped?: boolean },
  ) => {
    const isActive = slot === 0
    const inFocus = Math.abs(slot) <= 2
    const scaleSlot = slot === 0 ? 0 : Math.sign(slot) * Math.min(Math.abs(slot), 2)
    const scale = coverflowScale(scaleSlot)
    const x = centerX + slot * peek
    const z = opts.frozen ? 30 : 40 - Math.abs(slot)
    return (
      <div
        key={opts.frozen ? `exit-${i}` : i}
        onClick={() => {
          if (opts.frozen || isActive || !inFocus) return
          stepBy(slot)
        }}
        aria-hidden={!isActive || undefined}
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          width: cardW,
          height: cardH,
          marginTop: -cardH / 2,
          transform: `translateX(${x}px) scale(${scale})`,
          opacity: 1,
          zIndex: z,
          cursor: isActive || opts.frozen ? 'default' : 'pointer',
          pointerEvents: opts.frozen ? 'none' : 'auto',
          transition: opts.frozen || opts.wrapped ? 'none' : `transform 700ms ${CF_EASE}, opacity 700ms`,
        }}
      >
        <div
          className="committee-card relative overflow-hidden w-full h-full"
          style={{
            borderRadius: 0,
            background: '#EEF1F5',
            border: isActive ? '1px solid rgba(14,17,22,0.14)' : '1px solid rgba(14,17,22,0.06)',
            boxShadow: isActive
              ? '0 10px 24px -12px rgba(14,17,22,0.18)'
              : '0 6px 16px -12px rgba(14,17,22,0.12)',
          }}
        >
          <CommitteeCardContent m={m}/>
          {!isActive && inFocus && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                borderRadius: 0,
                background: slot < 0
                  ? 'linear-gradient(to left, rgba(14,17,22,0.42) 0%, rgba(14,17,22,0.14) 40%, rgba(14,17,22,0.02) 75%, transparent 100%)'
                  : 'linear-gradient(to right, rgba(14,17,22,0.42) 0%, rgba(14,17,22,0.14) 40%, rgba(14,17,22,0.02) 75%, transparent 100%)',
              }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        ref={viewportRef}
        className="marquee-viewport"
        style={{
          position: 'relative',
          width: '100%',
          height: Math.round(cardH * 1.12),
          overflow: 'hidden',
          perspective: 1200,
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {items.map((m, i) => {
          if (exitCard && exitCard.i === i) return null
          const slot = slotOf(i, active)
          if (Math.abs(slot) > 2) return null
          const wrapped = slotOf(i, prevActive.current) - delta !== slot
          return renderCard(i, m, slot, { wrapped })
        })}
        {exitCard && items[exitCard.i] && renderCard(exitCard.i, items[exitCard.i], exitCard.slot, { frozen: true })}
      </div>
      <CarouselScrollBar
        index={active}
        count={len}
        onPrev={() => stepBy(-1)}
        onNext={() => stepBy(1)}
      />
    </div>
  )
}

function PeopleShowcase({
  id, background, eyebrow, title, description, linkLabel, onLink, people, reverse = false,
}: {
  id: string
  background: string
  eyebrow: string
  title: React.ReactNode
  description: string
  linkLabel: string
  onLink?: () => void
  people: ShowcasePerson[]
  reverse?: boolean
}) {
  if (!people.length) return null
  return (
    <section id={id} className="section-pad" style={{ background, overflow: 'hidden' }}>
      <style>{`
        .marquee-viewport {
          /* No edge fade — side photos must stay sharp at the corners */
        }
        .committee-card { transition: transform 300ms cubic-bezier(.22,1,.36,1); }
        .committee-card img { transition: transform 600ms cubic-bezier(.22,1,.36,1); }
        .committee-card:hover { transform: translateY(-6px); }
        .committee-card:hover img { transform: scale(1.05); }
        .committee-link svg { transition: transform 200ms cubic-bezier(.22,1,.36,1); }
        .committee-link:hover { background: #E10B17; border-color: #E10B17; color: #FFFFFF !important; }
        .committee-link:hover svg { transform: translateX(3px); }
      `}</style>

      {/* Header — constrained */}
      <div style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)', marginBottom: 48 }}>
        {eyebrow && <div className="eyebrow mb-3" style={{ color: '#B98B43' }}>{eyebrow}</div>}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(26px,2.8vw,40px)', color: '#0E1116', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 12px' }}>
              {title}
            </h2>
            {description && <p style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.6, color: '#5C6673', maxWidth: 440, margin: 0 }}>
              {description}
            </p>}
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onLink?.() }}
            className="committee-link"
            style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: '#0E1116', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: '11px 20px', borderRadius: 999, border: '1.5px solid #E2E6EC', transition: 'background 200ms, border-color 200ms, color 200ms' }}
          >
            {linkLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
          </a>
        </div>
      </div>

      {/* Mobile: centred step carousel */}
      <div className="md:hidden">
        <CommitteeCarouselMobile people={people} />
      </div>

      {/* Desktop: centre-trio step carousel cropped to the header's content width, edges faded */}
      <div className="hidden md:block" style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)' }}>
        <CommitteeCarouselDesktop people={people} reverse={reverse}/>
      </div>
    </section>
  )
}

function Leadership({ onViewCommittee }: { onViewCommittee?: () => void }) {
  // Heading copy: Website Maintenance → Home → Committee. People: About → Committee.
  const h = useHome().home.committee
  const { about, loading } = useAbout()
  // Home leadership = running Executive only (API hides roster outside term dates).
  const roster = about.executive_committee || []
  const people: ShowcasePerson[] = roster.map((m) => ({
    name: m.name,
    role: m.designation || m.tier || 'Committee',
    company: m.company || '',
    img: m.photo || null,
  }))
  if (!h.enabled) return null
  if (!loading && people.length === 0) return null
  if (loading && people.length === 0) return null
  return (
    <PeopleShowcase
      id="governance"
      background="#FFFFFF"
      eyebrow={h.eyebrow}
      title={<Lines text={h.heading || 'Committee'}/>}
      description={h.text}
      linkLabel={h.button_label || 'View full committee'}
      onLink={onViewCommittee}
      people={people}
    />
  )
}

// ─── SECTION 5b — Member Directory ────────────────────────────────────────────
function MemberDirectory({ onViewAll }: { onViewAll: () => void }) {
  // Heading copy: Website Maintenance → Home → Member Directory.
  const h = useHome().home.directory
  const { people: rows, loading } = useDirectoryShowcase(12)
  const people: ShowcasePerson[] = rows.map((m) => ({
    name: m.full_name,
    role: m.designation || m.membership_type || 'Member',
    company: m.company || '',
    img: m.photo_url || null,
  }))
  if (!h.enabled) return null
  if (loading && people.length === 0) return null
  if (!loading && people.length === 0) return null
  return (
    <PeopleShowcase
      id="members"
      background="#FFFFFF"
      eyebrow={h.eyebrow}
      title={<Lines text={h.heading || 'Member Directory'}/>}
      description={h.text}
      linkLabel={h.button_label || 'View all members'}
      onLink={onViewAll}
      people={people}
      reverse
    />
  )
}

// ─── SECTION 6 — Membership CTA ───────────────────────────────────────────────
const BENEFIT_ICON_PROPS = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

// Icon keys match Admin → Home → Membership (HomeSection::BENEFIT_ICONS)
const BENEFIT_ICONS: Record<string, React.ReactNode> = {
  bed: <svg {...BENEFIT_ICON_PROPS}><path d="M3 18V8"/><path d="M3 14h18v4"/><path d="M21 18v-4a3 3 0 00-3-3h-7v3"/><circle cx="7" cy="11" r="1.5"/></svg>,
  glass: <svg {...BENEFIT_ICON_PROPS}><path d="M5 4h14l-7 8z"/><path d="M12 12v8"/><path d="M8 20h8"/></svg>,
  scissors: <svg {...BENEFIT_ICON_PROPS}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9"/><path d="M14.5 14.5L20 20"/><path d="M8.1 8.1L12 12"/></svg>,
  hall: <svg {...BENEFIT_ICON_PROPS}><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/></svg>,
  pool: <svg {...BENEFIT_ICON_PROPS}><path d="M2 16c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M2 20c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M8 12V5a2 2 0 014 0"/><path d="M16 12V5a2 2 0 00-4 0"/></svg>,
  cards: <svg {...BENEFIT_ICON_PROPS}><rect x="4" y="3" width="12" height="16" rx="2"/><path d="M8 21h10a2 2 0 002-2V7"/><path d="M10 8.5c-1 1-2 1.8-2 3a1.5 1.5 0 003 .5 1.5 1.5 0 003-.5c0-1.2-1-2-2-3l-1-1z"/></svg>,
  dining: <svg {...BENEFIT_ICON_PROPS}><path d="M7 2v20M4 2v6a3 3 0 006 0V2"/><path d="M17 2c-2 2-3 4-3 8h3v12"/></svg>,
  coffee: <svg {...BENEFIT_ICON_PROPS}><path d="M17 8h1a4 4 0 010 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/></svg>,
  gym: <svg {...BENEFIT_ICON_PROPS}><path d="M6 5v14M18 5v14M3 8v8M21 8v8M6 12h12"/></svg>,
  star: <svg {...BENEFIT_ICON_PROPS}><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/></svg>,
}

function BenefitsPanel() {
  const m = useHome().home.membership
  return (
    <div style={{ padding: 'clamp(28px,3vw,40px)', textAlign: 'left' }}>
      {m.benefits_eyebrow && <div className="eyebrow mb-2" style={{ color: '#D4A95E', fontSize: 11 }}>{m.benefits_eyebrow}</div>}
      <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: '#FFFFFF', lineHeight: 1.25, letterSpacing: '-0.01em', marginBottom: 24 }}>
        <Lines text={m.benefits_title}/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {m.benefits.map((b, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
            style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', transition: 'background 200ms, border-color 200ms' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.09)'; el.style.borderColor = 'rgba(212,169,94,0.35)' }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.05)'; el.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(225,11,23,0.14)', color: '#FF5A63', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {BENEFIT_ICONS[b.icon] ?? BENEFIT_ICONS.star}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.3 }}>{b.name}</div>
              {b.note && <div style={{ fontFamily: 'CKCL', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{b.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApplyCard() {
  const m = useHome().home.membership
  const follow = useContext(FollowLink)
  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{ margin: 8, padding: 'clamp(28px,3vw,36px)', borderRadius: 20, background: '#FFFFFF', textAlign: 'left', boxShadow: '0 24px 60px -12px rgba(0,0,0,0.45)' }}
    >
      <div className="membership-card-glow" />
      <div className="relative z-10 flex flex-col flex-1">
        {m.apply_eyebrow && <div className="eyebrow mb-2" style={{ color: '#B98B43', fontSize: 11 }}>{m.apply_eyebrow}</div>}
        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 26, color: '#0E1116', lineHeight: 1.15, letterSpacing: '-0.015em', marginBottom: 10 }}>
          <Lines text={m.apply_title}/>
        </div>
        {m.apply_text && (
          <p style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.6, color: '#5C6673', margin: '0 0 22px' }}>
            <Bold text={m.apply_text} color="#0E1116"/>
          </p>
        )}

        {/* How it works */}
        <ol style={{ listStyle: 'none', margin: '0 0 26px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {m.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3">
              <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid rgba(185,139,67,0.55)', color: '#B98B43', fontFamily: 'CKCL', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontFamily: 'CKCL', fontSize: 13, color: '#2A3039' }}>{step}</span>
            </li>
          ))}
        </ol>

        <button
          onClick={() => follow(m.button_link)}
          style={{
            marginTop: 'auto',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'CKCL', fontSize: 14, fontWeight: 600,
            color: '#FFFFFF', letterSpacing: '-0.01em', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(175deg, #FF2D3A 0%, #E10B17 38%, #A0000A 100%)',
            borderRadius: 999, padding: '14px 26px',
            boxShadow: '0 1px 0 rgba(255,255,255,0.22) inset, 0 -2px 0 rgba(0,0,0,0.18) inset, 0 6px 24px rgba(225,11,23,0.40), 0 2px 6px rgba(0,0,0,0.20)',
            transition: 'transform 180ms cubic-bezier(.22,1,.36,1), box-shadow 240ms, background 240ms',
            willChange: 'transform',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.transform = 'translateY(-2px) scale(1.02)'
            el.style.background = 'linear-gradient(175deg, #FF4550 0%, #F01020 38%, #B0000C 100%)'
            el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.22) inset, 0 -2px 0 rgba(0,0,0,0.18) inset, 0 16px 48px rgba(225,11,23,0.55), 0 4px 16px rgba(0,0,0,0.24)'
            const arrow = el.querySelector('.apply-arrow') as HTMLElement | null
            if (arrow) arrow.style.transform = 'translateX(4px)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.transform = ''
            el.style.background = 'linear-gradient(175deg, #FF2D3A 0%, #E10B17 38%, #A0000A 100%)'
            el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.22) inset, 0 -2px 0 rgba(0,0,0,0.18) inset, 0 6px 24px rgba(225,11,23,0.40), 0 2px 6px rgba(0,0,0,0.20)'
            const arrow = el.querySelector('.apply-arrow') as HTMLElement | null
            if (arrow) arrow.style.transform = ''
          }}
        >
          {m.button_label || 'Apply Now'}
          <svg className="apply-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ transition: 'transform 200ms cubic-bezier(.22,1,.36,1)', flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
        </button>
        {m.footnote && (
          <div style={{ fontFamily: 'CKCL', fontSize: 12, color: '#7A8491', textAlign: 'center', marginTop: 12 }}>
            {m.footnote}
          </div>
        )}
      </div>
    </div>
  )
}

function MembershipCTA() {
  const m = useHome().home.membership
  if (!m.heading && !m.text && !m.benefits.length) return null
  return (
    <section
      id="membership"
      className="section-pad relative overflow-hidden"
      style={{ background: '#0A0D10' }}
    >
      <div className="absolute inset-0">
        {m.background ? (
          <img
            src={m.background}
            alt=""
            className="w-full h-full object-cover opacity-40"
            style={{ display: 'block' }}
          />
        ) : null}
        <div className="absolute inset-0" style={{ background: 'rgba(14,17,22,0.65)' }}/>
      </div>

      <div className="relative z-10" style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)', textAlign: 'center' }}>
        {m.eyebrow && <div className="eyebrow mb-4" style={{ color: '#B98B43' }}>{m.eyebrow}</div>}
        <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(36px,4.5vw,64px)', color: '#FFFFFF', lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 16 }}>
          <Lines text={m.heading}/>
        </h2>
        <p style={{ fontFamily: 'CKCL', fontSize: 18, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', maxWidth: 520, margin: '0 auto 56px' }}>
          {m.text}
        </p>

        {/* Radial glows */}
        <div style={{ position: 'absolute', top: '50%', left: '35%', transform: 'translate(-50%,-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(225,11,23,0.12) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', top: '50%', right: '25%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(185,139,67,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        {/* Unified panel: benefits on dark glass, apply card as the focal point */}
        <div
          className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] items-stretch"
          style={{ maxWidth: 920, margin: '0 auto', borderRadius: 28, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 30px 80px -20px rgba(0,0,0,0.6)' }}
        >
          <BenefitsPanel />
          <ApplyCard />
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 7 — Gallery teaser ───────────────────────────────────────────────
type HomeAlbum = { id: number; name: string; count: number; cover: string | null }

// Bento spans per album slot. lg (4 cols): featured 2×2, tall and wide tiles interlock into a full 4×4.
// Mobile (2 cols): featured and last tile span both columns, the rest pair up.
const ALBUM_SPANS = [
  'col-span-2 row-span-2',
  'lg:row-span-2',
  '',
  '',
  'lg:row-span-2',
  'lg:col-span-2',
  'lg:row-span-2',
  'col-span-2',
]

function Gallery({ onOpenMedia }: { onOpenMedia: (tab: MediaTab) => void }) {
  const g = useHome().home.gallery
  const linkProps = useLinkProps()
  // Same Photo Gallery API as Media Centre → Gallery tab
  const { data: albumsData } = useAlbums()
  const ALBUMS: HomeAlbum[] = (albumsData?.albums ?? []).slice(0, 8).map((a) => ({
    id: a.id,
    name: a.name,
    count: a.count,
    cover: a.cover,
  }))
  const open = (e: React.MouseEvent) => { e.preventDefault(); onOpenMedia('gallery') }
  if (!g.enabled) return null
  if (!ALBUMS.length && !g.heading) return null
  if (!ALBUMS.length) return null

  return (
    <section id="gallery" className="section-pad" style={{ background: '#FFFFFF' }}>
      <style>{`
        .album-tile img { transition: transform 700ms cubic-bezier(.22,1,.36,1); }
        .album-tile:hover img { transform: scale(1.06); }
        .album-tile .album-cta { opacity: 0; transform: translateY(6px); transition: opacity 250ms, transform 250ms cubic-bezier(.22,1,.36,1); }
        .album-tile:hover .album-cta, .album-tile:focus-visible .album-cta { opacity: 1; transform: none; }
        .album-tile:focus-visible { outline: 3px solid #E10B17; outline-offset: 3px; }
        .gallery-all:hover { background: #0E1116 !important; color: #FFFFFF !important; border-color: #0E1116 !important; }
        .gallery-all:hover svg { transform: translateX(3px); }
      `}</style>
      <div style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)' }}>
        <div className="mb-10 lg:mb-12">
          {g.eyebrow && <div className="eyebrow mb-3" style={{ color: '#B98B43' }}>{g.eyebrow}</div>}
          <div className="flex flex-col lg:flex-row lg:items-end gap-5 justify-between">
            <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(26px,2.8vw,40px)', color: '#0E1116', lineHeight: 1.15, letterSpacing: '-0.015em', margin: 0 }}>
              <Lines text={g.heading}/>
            </h2>
            <div className="flex flex-col items-start gap-4" style={{ maxWidth: 360 }}>
              {g.text && (
                <p style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.6, color: '#5C6673', margin: 0 }}>
                  {g.text}
                </p>
              )}
              <a
                {...linkProps(g.button_link)}
                className="gallery-all"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: '#0E1116', textDecoration: 'none', padding: '10px 18px', borderRadius: 999, border: '1.5px solid #D5DAE1', background: '#FFFFFF', transition: 'background 200ms, color 200ms, border-color 200ms' }}
              >
                {g.button_label || 'View all albums'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ transition: 'transform 200ms' }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[150px] sm:auto-rows-[190px] lg:auto-rows-[200px] gap-3 lg:gap-4">
          {ALBUMS.map((album, i) => {
            const featured = i === 0
            return (
              <a
                key={album.id}
                href="#"
                onClick={open}
                className={`album-tile relative overflow-hidden ${ALBUM_SPANS[i] ?? ''}`}
                style={{ borderRadius: featured ? 24 : 18, background: '#D5DAE1', textDecoration: 'none' }}
              >
                {album.cover && <img src={album.cover} alt={album.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" style={{ display: 'block' }}/>}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,13,16,0.88) 0%, rgba(10,13,16,0.35) 40%, transparent 65%)' }}/>

                {/* Photo count chip */}
                <div
                  className="absolute flex items-center gap-1.5"
                  style={{ top: 12, right: 12, padding: '5px 10px', borderRadius: 999, background: 'rgba(14,17,22,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#FFFFFF', fontFamily: 'CKCL', fontSize: 11, fontWeight: 600 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  {album.count}
                </div>

                {featured && g.featured_tag && (
                  <div className="eyebrow absolute" style={{ top: 14, left: 14, padding: '5px 10px', borderRadius: 999, background: '#E10B17', color: '#FFFFFF', fontSize: 10, fontWeight: 600 }}>
                    {g.featured_tag}
                  </div>
                )}

                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0" style={{ padding: featured ? 'clamp(16px,2vw,28px)' : 14 }}>
                  <div
                    className={featured ? '' : 'line-clamp-2'}
                    style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: featured ? 'clamp(18px,2vw,26px)' : 14, color: '#FFFFFF', lineHeight: 1.25, letterSpacing: featured ? '-0.01em' : 0 }}
                  >
                    {album.name}
                  </div>
                  <div className="album-cta hidden sm:flex items-center gap-1.5" style={{ marginTop: 6, fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: '#FFB3B8' }}>
                    View album
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
                  </div>
                </div>
              </a>
            )
          })}
        </div>

      </div>
    </section>
  )
}

// ─── SECTION 8 — Contact strip ────────────────────────────────────────────────
const CONTACT_ICON_PROPS = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function ContactItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    // Mobile: icon above, everything centred; from sm: icon beside, left-aligned
    <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3 sm:gap-4" style={{ minWidth: 0 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(225,11,23,0.08)', color: '#E10B17', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ color: '#B98B43', fontSize: 11, marginBottom: 6 }}>{label}</div>
        {children}
      </div>
    </div>
  )
}

function ContactStrip() {
  const site = useSiteInfo()
  const email = site.contact.email
  const hasContact = Boolean(site.contact.phone || email || site.office.days || site.address.short)
  // "Foy's Lake Road, Khulshi, Chattogram" → bold first part, the rest underneath
  const [place, ...rest] = (site.address.short || '').split(',').map((p) => p.trim())
  const linkHover = (on: boolean) => (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.color = on ? '#E10B17' : '' }
  if (!site.fromApi || !hasContact) return null
  return (
    <div
      className="relative z-10"
      style={{
        maxWidth: HOME_W - 160, // HOME_W minus its 80px side gutters, so edges line up with section content
        marginTop: -30,
        marginLeft: 'auto',
        marginRight: 'auto',
        marginBottom: 30,
        borderRadius: 28,
        padding: 'clamp(28px,3.5vw,44px) clamp(24px,4vw,56px)',
        background: '#FFFFFF',
        border: '1px solid #E2E6EC',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.55), 0 2px 6px rgba(14,17,22,0.06)',
        textAlign: 'left',
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_auto] gap-8 lg:gap-12 items-center">
        {/* Phone + email */}
        <ContactItem
          label="Have questions?"
          icon={<svg {...CONTACT_ICON_PROPS}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>}
        >
          <a
            href={site.contact.phone_href ?? undefined}
            style={{ display: 'block', fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(22px,2.2vw,28px)', color: '#0E1116', textDecoration: 'none', letterSpacing: '-0.01em', lineHeight: 1.15, whiteSpace: 'nowrap', transition: 'color 200ms' }}
            onMouseEnter={linkHover(true)}
            onMouseLeave={linkHover(false)}
          >
            {site.contact.phone}
          </a>
          <a
            href={email ? `mailto:${email}` : undefined}
            style={{ display: 'inline-block', fontFamily: 'CKCL', fontSize: 14, color: '#5C6673', textDecoration: 'none', marginTop: 6, transition: 'color 200ms' }}
            onMouseEnter={linkHover(true)}
            onMouseLeave={linkHover(false)}
          >
            {email}
          </a>
        </ContactItem>

        {/* Hours */}
        <ContactItem
          label="Visiting hours"
          icon={<svg {...CONTACT_ICON_PROPS}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>}
        >
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: '#0E1116', lineHeight: 1.2 }}>{site.office.days}</div>
          <div style={{ fontFamily: 'CKCL', fontSize: 14, color: '#5C6673', marginTop: 6 }}>{site.office.hours}</div>
        </ContactItem>

        {/* Location + directions */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center lg:items-start xl:items-center text-center sm:text-left gap-4 md:col-span-2 lg:col-span-1">
          <div style={{ fontFamily: 'CKCL', fontSize: 14, color: '#5C6673', lineHeight: 1.5, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#0E1116', fontWeight: 600 }}>{place}</span>{rest.length > 0 && <><br/>{rest.join(', ')}</>}
          </div>
          <a
            href={site.address.map_url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'CKCL', fontSize: 14, fontWeight: 600,
              color: '#FFFFFF', background: '#0E1116', textDecoration: 'none', letterSpacing: '-0.01em',
              borderRadius: 999, whiteSpace: 'nowrap',
              padding: '12px 22px', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 6px 20px rgba(14,17,22,0.18)',
              transition: 'transform 180ms cubic-bezier(.22,1,.36,1), background 200ms, color 200ms, box-shadow 200ms',
              willChange: 'transform',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#E10B17'
              el.style.color = '#FFFFFF'
              el.style.transform = 'translateY(-2px)'
              el.style.boxShadow = '0 12px 32px rgba(225,11,23,0.40)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#0E1116'
              el.style.transform = ''
              el.style.boxShadow = '0 6px 20px rgba(14,17,22,0.18)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Get Directions
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
type AppPage = PageId | 'home' | `committee:${CommitteePageType}` | 'facilities' | `facility:${FacilityId}` | 'membership-process' | 'member-list' | 'become-member' | 'media' | 'resources' | 'contact' | 'search' | '404' | 'member-login' | 'member-portal'

export default function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F8FA' }} />}>
      <AppRoutes />
    </Suspense>
  )
}

// Browser tab title, description, share image and icon from Admin → Site Info
function useDocumentHead(site: SiteInfo) {
  useEffect(() => {
    if (!site.club_name && !site.seo.title) return
    document.title = site.seo.title || site.club_name
    const meta = (attr: 'name' | 'property', key: string, content: string | null) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      if (!content) { el?.remove(); return }
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.append(el) }
      el.content = content
    }
    meta('name', 'description', site.seo.description)
    meta('name', 'keywords', site.seo.keywords)
    meta('property', 'og:title', site.seo.title || site.club_name)
    meta('property', 'og:description', site.seo.description)
    meta('property', 'og:image', site.og_image)
    // Home-screen name on iOS (was a fixed "CKCL" in index.html)
    meta('name', 'apple-mobile-web-app-title', site.short_name || site.club_name || null)
    if (site.favicon) {
      document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((l) => { l.href = site.favicon as string })
    }
  }, [site])

  // Install / home-screen manifest — only rebuilt when the name or icon changes.
  const clubName = site.club_name
  const shortName = site.short_name
  const favicon = site.favicon
  useEffect(() => {
    const manifestLink = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!manifestLink || !clubName) return
    const manifest = {
      name: clubName,
      short_name: shortName || clubName,
      start_url: window.location.origin + '/',
      icons: favicon
        ? [{ src: favicon, sizes: 'any', purpose: 'any' }]
        : [
            { src: `${window.location.origin}/favicon/web-app-manifest-192x192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: `${window.location.origin}/favicon/web-app-manifest-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }))
    const previous = manifestLink.href
    manifestLink.href = url
    return () => {
      manifestLink.href = previous
      URL.revokeObjectURL(url)
    }
  }, [clubName, shortName, favicon])
}

function AppRoutes() {
  useDocumentHead(useSiteInfo())
  const initial = readRoute()
  const [page, setPage] = useState<AppPage>(initial.page as AppPage)
  const [mediaTab, setMediaTab] = useState<MediaTab>(initial.mediaTab)
  const [portalPage, setPortalPage] = useState<PortalTab>(initial.portalPage)
  const [searchQuery, setSearchQuery] = useState(() => readSearchQuery())
  const [searchOpen, setSearchOpen] = useState(false)
  const { memberNo: loggedInMemberNo, signOut: clearLoggedInMember } = useMemberSession()

  const go = (
    id: AppPage,
    tab: MediaTab = 'notices',
    mode: 'push' | 'replace' = 'push',
    portal: PortalTab = 'dashboard',
    q?: string,
  ) => {
    const nextTab = id === 'media' ? tab : mediaTab
    const nextPortal = id === 'member-portal' ? portal : 'dashboard'
    const nextQ = id === 'search' ? (q ?? searchQuery) : ''
    setPage(id)
    if (id === 'media') setMediaTab(tab)
    if (id === 'member-portal') setPortalPage(nextPortal)
    if (id === 'search') setSearchQuery(nextQ)
    syncUrl(id as RoutedPage, id === 'media' ? tab : nextTab, mode, nextPortal, nextQ)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigate = (id: PageId | 'home' | `committee:${CommitteePageType}` | 'facilities' | `facility:${FacilityId}` | 'membership-process' | 'member-list' | 'become-member' | 'media' | 'resources' | 'contact' | 'search' | '404' | 'member-login' | 'member-portal') => {
    if (id === 'search') {
      setSearchOpen(true)
      return
    }
    go(id as AppPage, id === 'media' ? 'notices' : mediaTab)
  }

  const openSearchOverlay = () => setSearchOpen(true)
  const runSearch = (q: string) => {
    setSearchOpen(false)
    go('search', 'notices', 'push', 'dashboard', q)
  }

  const nav = (extra?: { currentPage?: string }) => (
    <Navbar
      onInnerNavigate={navigate}
      currentPage={extra?.currentPage ?? page}
      onOpenSearch={openSearchOverlay}
    />
  )

  const openMedia = (tab: MediaTab) => {
    go('media', tab)
  }

  const navigateApp = (id: AppPage) => {
    go(id, id === 'media' ? mediaTab : 'notices')
  }

  // Browser back / forward + deep links
  useEffect(() => {
    const onPop = () => {
      const route = readRoute()
      setPage(route.page as AppPage)
      setMediaTab(route.mediaTab)
      setPortalPage(route.portalPage)
      setSearchQuery(readSearchQuery())
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.addEventListener('popstate', onPop)
    // Normalize URL on first paint (e.g. `/home` → `/`, `/portal/dashboard` → `/portal`)
    syncUrl(initial.page, initial.mediaTab, 'replace', initial.portalPage, readSearchQuery())
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Follow a button link set in Admin → Home
  const followLink = (link: string) => {
    const t = parseLink(link)
    if (!t) return
    if (t.kind === 'page') navigateApp(t.id as AppPage)
    else if (t.kind === 'media') openMedia(t.id as MediaTab)
    else if (t.kind === 'section') {
      if (page !== 'home') {
        go('home', 'notices', 'push')
        window.setTimeout(() => document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      } else {
        document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else if (t.kind === 'url') {
      if (t.external) window.open(t.href, '_blank', 'noopener,noreferrer')
      else window.location.href = t.href
    }
  }

  const searchChrome = (
    <SearchOverlay
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
      onSearch={runSearch}
      initialQuery={searchQuery}
    />
  )

  if (page === 'member-login') {
    return (
      <>
        {searchChrome}
        <MemberLoginPage
          onLogin={() => go('member-portal', 'notices', 'replace', portalPage || 'dashboard')}
          onNavigate={(p) => navigate(p as AppPage)}
        />
      </>
    )
  }

  if (page === 'member-portal') {
    if (!loggedInMemberNo) {
      // Deep link /portal without a session → login (return to same portal section after sign-in)
      return (
        <>
          {searchChrome}
          <MemberLoginPage
            onLogin={() => go('member-portal', 'notices', 'replace', portalPage)}
            onNavigate={(p) => navigate(p as AppPage)}
          />
        </>
      )
    }
    return (
      <>
        {searchChrome}
        <MemberPortalPage
          memberNo={loggedInMemberNo}
          activePage={portalPage}
          onPortalNavigate={(p) => go('member-portal', 'notices', 'push', p)}
          onLogout={async () => {
            await portalLogout()
            clearLoggedInMember()
            go('home')
          }}
          onNavigate={(p) => navigate(p as AppPage)}
        />
      </>
    )
  }

  if (page === 'contact') {
    return (
      <>
        {nav()}
        {searchChrome}
        <ContactPage />
      </>
    )
  }

  if (page === 'search') {
    return (
      <>
        {nav()}
        {searchChrome}
        <SearchPage
          initialQuery={searchQuery}
          onNavigate={(p) => navigate(p as AppPage)}
          onOpenSearch={openSearchOverlay}
        />
      </>
    )
  }

  if (page === '404') {
    return (
      <>
        {searchChrome}
        <NotFoundPage onNavigate={(p) => navigate(p as AppPage)} />
      </>
    )
  }

  if (page === 'resources') {
    return (
      <>
        {nav()}
        {searchChrome}
        <ResourcesPage />
      </>
    )
  }

  if (page === 'media') {
    return (
      <>
        {nav()}
        {searchChrome}
        <MediaCentrePage key={mediaTab} initialTab={mediaTab} />
      </>
    )
  }

  if (page === 'become-member') {
    return (
      <>
        {nav()}
        {searchChrome}
        <BecomeaMemberPage onHome={() => go('home')} />
      </>
    )
  }

  if (page === 'member-list') {
    return (
      <>
        {nav()}
        {searchChrome}
        <MemberListPage />
      </>
    )
  }

  if (page === 'membership-process') {
    return (
      <>
        {nav()}
        {searchChrome}
        <MembershipProcessPage onApply={() => go('become-member')} />
      </>
    )
  }

  if (page === 'facilities' || (typeof page === 'string' && page.startsWith('facility:'))) {
    const facilityId = page.startsWith('facility:') ? (page.replace('facility:', '') as FacilityId) : undefined
    return (
      <>
        {nav()}
        {searchChrome}
        <FacilitiesPage
          initialFacility={facilityId}
          onBack={() => go('facilities')}
          onSelectFacility={(id) => go(`facility:${id}` as AppPage)}
          onSignIn={() => go('member-login')}
        />
      </>
    )
  }

  if (page.startsWith('committee:')) {
    const type = page.split(':')[1] as CommitteePageType
    return (
      <>
        {nav()}
        {searchChrome}
        <CommitteePage type={type} onNavigate={(t) => go(`committee:${t}`)} />
      </>
    )
  }

  if (page !== 'home') {
    return (
      <>
        {nav()}
        {searchChrome}
        <InnerPage pageId={page as PageId} onNavigate={navigate} />
      </>
    )
  }

  return (
    <FollowLink.Provider value={followLink}>
    <div style={{ fontFamily: 'CKCL', background: 'rgb(10, 13, 16)' }}>
      {nav()}
        {searchChrome}
      <Hero />
      <Leadership onViewCommittee={() => go('committee:executive')} />
      <NoticesNews onOpenMedia={openMedia} />
      <MemberDirectory onViewAll={() => go('member-list')} />
      <Facilities onSelectFacility={(id) => go(`facility:${id}` as AppPage)} />
      <Highlights />
      <Gallery onOpenMedia={openMedia} />
      <About />
      <MembershipCTA />
      {/* Extra sections from admin — same design looped from API customSections */}
      <HomeExtraSections onFollowLink={followLink} />
      {/* Contact strip overlaps footer */}
      <section id="contact" style={{ background: '#0A0D10', paddingTop: 64, paddingBottom: 0 }}>
        <ContactStrip />
      </section>
      <Footer maxWidth={HOME_W} />
    </div>
    </FollowLink.Provider>
  )
}
