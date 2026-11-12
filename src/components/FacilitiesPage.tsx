import { useRef, useState } from 'react'
import Footer from './Footer'
import ReservationForm from './ReservationForm'
import {
  type AffiliatedClub,
  type FacilityCard,
  type FacilityDetail,
  type FacilityPhoto,
  useAffiliatedClubs,
  useFacilitiesList,
  useFacilityDetail,
} from '../lib/facilities'
import { SITE_W, SITE_HEADER_PAD_INLINE } from '../lib/layout'

export type FacilityId = string

const BENTO_AREAS = ['pool', 'rest', 'guest', 'conv', 'coffee', 'salon', 'bar', 'card'] as const

function PageHeader({ title, breadcrumb }: { title: string; breadcrumb: string[] }) {
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
        paddingTop: 108,
        paddingInline: SITE_HEADER_PAD_INLINE,
        paddingBottom: 40,
      }}
    >
      <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle,rgba(242,51,61,0.10) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '30%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(185,139,67,0.08) 0%,transparent 65%)', filter: 'blur(48px)', pointerEvents: 'none' }} />
      <div className="flex items-center gap-1.5 mb-4" style={{ position: 'relative', zIndex: 1 }}>
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="eyebrow" style={{ fontSize: 11, color: i < breadcrumb.length - 1 ? '#5C6673' : '#0E1116' }}>{crumb}</span>
            {i < breadcrumb.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
          </span>
        ))}
      </div>
      <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(28px,3.5vw,56px)', lineHeight: 1.1, letterSpacing: '-0.015em', color: '#0E1116', margin: 0, position: 'relative', zIndex: 1 }}>{title}</h1>
    </div>
  )
}

function BentoTile({ facility, onClick }: { facility: FacilityCard; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative overflow-hidden cursor-pointer"
      style={{
        gridArea: facility.gridArea,
        borderRadius: 20,
        background: '#EEF1F5',
        border: hovered ? '1px solid #E10B17' : '1px solid transparent',
        transition: 'border-color 200ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {facility.img ? (
        <img
          src={facility.img}
          alt={facility.name}
          className="w-full h-full object-cover"
          style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 400ms ease-out', display: 'block' }}
        />
      ) : (
        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#DDE2E9,#EEF1F5)' }} />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.80) 0%, rgba(14,17,22,0.15) 50%, transparent 100%)' }} />
      {facility.avail ? (
        <div className="absolute top-3 right-3 glass-subtle eyebrow" style={{ fontSize: 9, color: '#FFF', borderRadius: 999, padding: '5px 10px' }}>{facility.avail}</div>
      ) : null}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 16, color: '#FFF', marginBottom: 3 }}>{facility.name}</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 12, color: 'rgba(255,255,255,0.80)' }}>{facility.caption}</div>
        <a
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: '#FFF',
            textDecoration: 'none', marginTop: 10,
            opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 200ms, transform 200ms',
          }}
        >
          View details →
        </a>
      </div>
    </div>
  )
}

function AffiliatedPanel({ clubs }: { clubs: AffiliatedClub[] }) {
  if (!clubs.length) return null
  return (
    <div className="space-y-6 mt-10">
      {clubs.map(club => (
        <div key={club.id} className="glass-strong p-8" style={{ borderRadius: 24 }}>
          <div className="eyebrow mb-5" style={{ color: '#B98B43', fontSize: 10 }}>Affiliated Clubs</div>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div
              style={{
                width: 120, height: 80, borderRadius: 12, overflow: 'hidden',
                flexShrink: 0, background: '#EEF1F5',
              }}
            >
              {club.logo ? (
                <img src={club.logo} alt={club.name} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div>
              <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: '#0E1116', marginBottom: 6 }}>{club.name}</div>
              {club.description ? (
                <p style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.65, color: '#5C6673', maxWidth: 560, margin: '0 0 12px' }}>
                  {club.description}
                </p>
              ) : null}
              {club.link_label ? (
                <a
                  href={club.link_url || undefined}
                  style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: '#E10B17', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  {club.link_label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FacilitiesOverview({ onSelectFacility }: { onSelectFacility: (id: FacilityId) => void }) {
  const { intro, facilities, loading, error } = useFacilitiesList()
  const { clubs } = useAffiliatedClubs()

  const withAreas = facilities.map((f, i) => ({
    ...f,
    gridArea: f.gridArea && BENTO_AREAS.includes(f.gridArea as typeof BENTO_AREAS[number])
      ? f.gridArea
      : BENTO_AREAS[i] || f.gridArea || `f${i}`,
  }))
  const bento = withAreas.length === BENTO_AREAS.length && withAreas.every(f => BENTO_AREAS.includes(f.gridArea as typeof BENTO_AREAS[number]))

  return (
    <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
      <PageHeader title={intro.title || 'Facilities'} breadcrumb={['Home', 'Facilities']} />

      <div style={{ maxWidth: SITE_W, margin: '0 auto', padding: 'clamp(48px,6vw,80px) clamp(24px,5vw,80px)' }}>
        {(intro.para1 || intro.para2) ? (
          <div className="grid lg:grid-cols-2 gap-8 mb-14">
            {intro.para1 ? (
              <p style={{ fontFamily: 'CKCL', fontSize: 17, lineHeight: 1.75, color: '#2A3039', margin: 0 }}>{intro.para1}</p>
            ) : null}
            {intro.para2 ? (
              <p style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.70, color: '#5C6673', margin: 0 }}>{intro.para2}</p>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <p style={{ fontFamily: 'CKCL', color: '#5C6673' }}>Loading facilities…</p>
        ) : error ? (
          <p style={{ fontFamily: 'CKCL', color: '#E10B17' }}>Could not load facilities.</p>
        ) : !withAreas.length ? (
          <p style={{ fontFamily: 'CKCL', color: '#5C6673' }}>No facilities published yet.</p>
        ) : (
          <>
            <div
              className="hidden lg:grid gap-4"
              style={bento ? {
                gridTemplateColumns: 'repeat(4,1fr)',
                gridTemplateRows: 'repeat(3,240px)',
                gridTemplateAreas: `
                  "pool pool rest  guest"
                  "pool pool conv  conv "
                  "coffee salon bar  card "
                `,
              } : {
                gridTemplateColumns: 'repeat(4,1fr)',
                gridAutoRows: 240,
              }}
            >
              {withAreas.map((f) => (
                <BentoTile
                  key={f.slug}
                  facility={bento ? f : { ...f, gridArea: 'auto' }}
                  onClick={() => onSelectFacility(f.slug)}
                />
              ))}
            </div>

            <div className="lg:hidden grid grid-cols-2 gap-3 sm:gap-4">
              {withAreas.map((f) => (
                <div
                  key={f.slug}
                  className={`relative overflow-hidden cursor-pointer aspect-[16/10] sm:aspect-auto ${f.gridArea === 'pool' ? 'sm:h-[320px]' : 'sm:h-[220px]'}`}
                  style={{ borderRadius: 16, background: '#EEF1F5' }}
                  onClick={() => onSelectFacility(f.slug)}
                >
                  {f.img ? <img src={f.img} alt={f.name} className="w-full h-full object-cover" style={{ display: 'block' }} /> : null}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.80) 0%, rgba(14,17,22,0.10) 55%, transparent 100%)' }} />
                  {f.avail ? (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 glass-subtle eyebrow" style={{ fontSize: 8, color: '#fff', borderRadius: 999, padding: '4px 8px' }}>{f.avail}</div>
                  ) : null}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <div className="text-[14px] sm:text-[15px]" style={{ fontFamily: 'CKCL', fontWeight: 700, color: '#FFF', lineHeight: 1.25 }}>{f.name}</div>
                    <div className="text-[11px] sm:text-[12px] line-clamp-2" style={{ fontFamily: 'CKCL', color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 1.4 }}>{f.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <AffiliatedPanel clubs={clubs} />
      </div>

      <Footer />
    </div>
  )
}

function Lightbox({ photos, startIndex, onClose }: { photos: FacilityPhoto[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx((i) => (i + 1) % photos.length)

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(14,17,22,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={photos[idx].img}
          alt={photos[idx].alt}
          style={{ width: '100%', borderRadius: 16, display: 'block', maxHeight: '80vh', objectFit: 'contain' }}
        />
        <div className="eyebrow absolute top-4 left-4 glass-strong" style={{ fontSize: 10, color: '#FFFFFF', borderRadius: 999, padding: '5px 12px' }}>
          {idx + 1} / {photos.length}
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 glass-strong flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        {photos.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 glass-strong flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 glass-strong flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function BookingSheet({ facilityId, onClose, onSignIn }: { facilityId: FacilityId; onClose: () => void; onSignIn?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end"
      style={{ background: 'rgba(14,17,22,0.50)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-strong w-full p-6"
        style={{ borderRadius: '24px 24px 0 0', animation: 'fadeUp 240ms ease-out both', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, color: '#0E1116', margin: 0 }}>Reserve a Slot</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C6673" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <ReservationForm facilityId={facilityId} onSignIn={onSignIn} />
      </div>
    </div>
  )
}

function BookingCard({ facilityId, onSignIn }: { facilityId: FacilityId; onSignIn?: () => void }) {
  return (
    <div className="glass-strong sticky" style={{ borderRadius: 24, padding: '28px', top: 120 }}>
      <h3 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, color: '#0E1116', margin: '0 0 20px' }}>Reserve</h3>
      <ReservationForm facilityId={facilityId} onSignIn={onSignIn} />
    </div>
  )
}

function OtherFacilitiesRail({
  currentId,
  facilities,
  onSelect,
}: {
  currentId: FacilityId
  facilities: FacilityCard[]
  onSelect: (id: FacilityId) => void
}) {
  const others = facilities.filter((f) => f.slug !== currentId && f.id !== currentId)
  const railRef = useRef<HTMLDivElement>(null)
  if (!others.length) return null

  return (
    <div style={{ maxWidth: SITE_W, margin: '0 auto', padding: 'clamp(48px,5vw,72px) clamp(24px,5vw,80px)' }}>
      <div className="flex items-center justify-between mb-8">
        <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 26, color: '#0E1116', margin: 0, letterSpacing: '-0.01em' }}>Other Facilities</h2>
        <div className="hidden sm:flex gap-2">
          {(['left', 'right'] as const).map((dir) => (
            <button key={dir} onClick={() => railRef.current?.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' })}
              className="glass-strong flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E1116" strokeWidth="2.5">
                {dir === 'left' ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
              </svg>
            </button>
          ))}
        </div>
      </div>
      <div ref={railRef} className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {others.map((f) => (
          <button
            key={f.slug}
            onClick={() => onSelect(f.slug)}
            className="shrink-0 relative overflow-hidden text-left"
            style={{ width: 240, height: 180, borderRadius: 16, background: '#EEF1F5', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {f.img ? <img src={f.img} alt={f.name} className="w-full h-full object-cover" style={{ display: 'block' }} /> : null}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.75) 0%, transparent 55%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 14, color: '#FFF' }}>{f.name}</div>
              <div style={{ fontFamily: 'CKCL', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 2 }}>{f.avail}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function FacilityDetailPage({
  facilityId,
  onBack,
  onSelectFacility,
  onSignIn,
}: {
  facilityId: FacilityId
  onBack: () => void
  onSelectFacility: (id: FacilityId) => void
  onSignIn?: () => void
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { detail, loading, error } = useFacilityDetail(facilityId)
  const { facilities } = useFacilitiesList()

  if (loading) {
    return (
      <div style={{ background: '#F7F8FA', minHeight: '100vh', padding: 80 }}>
        <p style={{ fontFamily: 'CKCL', color: '#5C6673' }}>Loading facility…</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div style={{ background: '#F7F8FA', minHeight: '100vh', padding: 80 }}>
        <p style={{ fontFamily: 'CKCL', color: '#E10B17', marginBottom: 16 }}>Facility not found.</p>
        <button type="button" onClick={onBack} style={{ fontFamily: 'CKCL', color: '#E10B17', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back to facilities
        </button>
      </div>
    )
  }

  const data: FacilityDetail = detail

  return (
    <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
      {/* Mobile: rectangular hero; desktop keeps the taller stage */}
      <div
        className="relative overflow-hidden aspect-[16/10] md:aspect-auto md:h-[60vh] md:min-h-[380px]"
        style={{ background: '#1a1a1a' }}
      >
        {data.img ? (
          <img
            src={data.img}
            alt={data.name}
            className="absolute inset-0 w-full h-full object-cover md:static"
            style={{ display: 'block', opacity: 0.92 }}
          />
        ) : null}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,22,0.55) 0%, transparent 50%)' }} />

        <div
          className="absolute glass-strong flex items-center gap-1.5"
          style={{ top: 24, left: 24, borderRadius: 999, padding: '8px 16px', zIndex: 10 }}
        >
          <button
            onClick={onBack}
            style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 500, color: '#5C6673', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Facilities
          </button>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: '#0E1116' }}>{data.name}</span>
        </div>

        {data.quickFacts.length ? (
          <div
            className="absolute left-0 right-0 glass-strong"
            style={{
              bottom: -64,
              marginInline: 'clamp(24px,5vw,80px)',
              borderRadius: 20,
              padding: '24px 32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2,1fr)',
              gap: '16px 32px',
              zIndex: 10,
            }}
          >
            <div
              className="hidden lg:grid"
              style={{
                position: 'absolute',
                inset: 0,
                padding: '24px 32px',
                gridTemplateColumns: `repeat(${Math.min(4, data.quickFacts.length)},1fr)`,
                gap: 32,
                borderRadius: 20,
              }}
            >
              {data.quickFacts.map((fact) => (
                <div key={fact.label}>
                  <div className="eyebrow mb-1.5" style={{ fontSize: 10, color: '#5C6673' }}>{fact.label}</div>
                  <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: '#0E1116', lineHeight: 1.2 }}>{fact.value}</div>
                </div>
              ))}
            </div>
            <div className="lg:invisible contents">
              {data.quickFacts.map((fact) => (
                <div key={fact.label + '-m'}>
                  <div className="eyebrow mb-1" style={{ fontSize: 10, color: '#5C6673' }}>{fact.label}</div>
                  <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 17, color: '#0E1116', lineHeight: 1.2 }}>{fact.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ maxWidth: SITE_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)', paddingTop: data.quickFacts.length ? 'clamp(80px,10vw,120px)' : 'clamp(40px,6vw,64px)' }}>
        <div className="flex gap-12 items-start">
          <div style={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
            <div className="eyebrow mb-3" style={{ color: '#B98B43', fontSize: 10 }}>Facilities</div>
            <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(28px,3vw,44px)', color: '#0E1116', lineHeight: 1.1, letterSpacing: '-0.015em', marginBottom: 28 }}>{data.name}</h1>

            {data.paragraphs.map((para, i) => (
              <p key={i} style={{ fontFamily: 'CKCL', fontSize: 16, lineHeight: 1.75, color: '#2A3039', marginBottom: 16 }}>{para}</p>
            ))}

            {data.amenities.length ? (
              <>
                <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, color: '#0E1116', margin: '36px 0 16px', letterSpacing: '-0.01em' }}>Amenities</h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.amenities.map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E10B17" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 3 }}><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontFamily: 'CKCL', fontSize: 15, lineHeight: 1.6, color: '#2A3039' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {data.rules.length ? (
              <div style={{ background: '#FFF1F2', borderRadius: 16, padding: '20px 24px', borderLeft: '3px solid #E10B17', marginBottom: 48 }}>
                <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 14, color: '#0E1116', marginBottom: 12 }}>Rules & Guidelines</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {data.rules.map((rule, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontFamily: 'CKCL', fontSize: 10, fontWeight: 500, color: '#E10B17', flexShrink: 0, marginTop: 3 }}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.6, color: '#2A3039' }}>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data.photos.length > 1 ? (
              <>
                <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, color: '#0E1116', margin: '0 0 16px', letterSpacing: '-0.01em' }}>Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
                  {data.photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIdx(i)}
                      style={{ aspectRatio: '16 / 10', borderRadius: 12, overflow: 'hidden', background: '#EEF1F5', border: 'none', cursor: 'zoom-in', padding: 0, position: 'relative' }}
                    >
                      <img src={photo.img} alt={photo.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: 'rgba(14,17,22,0.35)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {data.bookable ? (
            <div className="hidden lg:block" style={{ width: 320, flexShrink: 0 }}>
              <BookingCard facilityId={data.slug} onSignIn={onSignIn} />
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderTop: '1px solid #E2E6EC' }}>
        <OtherFacilitiesRail currentId={facilityId} facilities={facilities} onSelect={onSelectFacility} />
      </div>

      {data.bookable ? (
        <>
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
            style={{ padding: '12px 16px 24px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderTop: '1px solid #E2E6EC' }}
          >
            <button
              onClick={() => setSheetOpen(true)}
              style={{ width: '100%', padding: '14px', fontFamily: 'CKCL', fontSize: 15, fontWeight: 600, color: '#FFF', background: '#E10B17', border: 'none', borderRadius: 999, cursor: 'pointer' }}
            >
              Request Booking
            </button>
          </div>
          {sheetOpen && <BookingSheet facilityId={data.slug} onClose={() => setSheetOpen(false)} onSignIn={onSignIn} />}
        </>
      ) : null}

      {lightboxIdx !== null && (
        <Lightbox photos={data.photos} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <Footer />
    </div>
  )
}

export default function FacilitiesPage({
  initialFacility,
  onBack,
  onSelectFacility,
  onSignIn,
}: {
  initialFacility?: FacilityId
  onBack: () => void
  /** When set, facility selection updates the parent URL/route instead of local-only state. */
  onSelectFacility?: (id: FacilityId) => void
  /** Send guests to member login before booking. */
  onSignIn?: () => void
}) {
  const selected = initialFacility ?? null

  const pick = (id: FacilityId) => {
    if (onSelectFacility) onSelectFacility(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (selected) {
    return (
      <FacilityDetailPage
        facilityId={selected}
        onBack={onBack}
        onSelectFacility={pick}
        onSignIn={onSignIn}
      />
    )
  }

  return <FacilitiesOverview onSelectFacility={pick} />
}

/** @deprecated kept for older imports — list now comes from API */
export const FACILITIES: FacilityCard[] = []
