import { useState, useMemo, useEffect, useRef } from 'react'
import Footer from './Footer'
import { useDirectoryList, type DirectoryMember } from '../lib/directory'
import { useSiteInfo } from '../lib/siteInfo'
import { SITE_W, SITE_HEADER_PAD_INLINE } from '../lib/layout'

export type MemberTier = string
export type Member = {
  id: string
  name: string
  designation: string
  company: string
  tier: MemberTier
  avatar: string | null
}

function toMember(m: DirectoryMember): Member {
  return {
    id: m.id,
    name: m.full_name,
    designation: m.designation || m.profession || '',
    company: m.company || '',
    tier: m.membership_type || 'Member',
    avatar: m.photo_url ?? null,
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12

function tierStyle(tier: string): { bg: string; color: string } {
  const t = tier.toLowerCase()
  if (t.includes('found')) return { bg: '#FFF7E6', color: '#B98B43' }
  if (t.includes('life')) return { bg: '#FFF1F2', color: '#E10B17' }
  return { bg: '#EEF1F5', color: '#5C6673' }
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 72 }: { src: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid rgba(185,139,67,0.55)',
        boxShadow: '0 0 0 3px rgba(185,139,67,0.15)',
        overflow: 'hidden',
        background: '#EEF1F5',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <span
          style={{
            fontFamily: 'CKCL',
            fontWeight: 600,
            fontSize: size * 0.3,
            color: '#B98B43',
            letterSpacing: '-0.01em',
          }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}

// ─── Grid card ────────────────────────────────────────────────────────────────
function MemberGridCard({ member }: { member: Member }) {
  const site = useSiteInfo()
  const [hovered, setHovered] = useState(false)
  const style = tierStyle(member.tier)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-3 py-5 sm:px-5 sm:py-6"
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: `1px solid ${hovered ? '#E10B17' : 'rgba(185,139,67,0.28)'}`,
        boxShadow: hovered
          ? '0 16px 40px -8px rgba(14,17,22,0.14), 0 0 0 0 rgba(225,11,23,0.0)'
          : '0 2px 8px rgba(14,17,22,0.05)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 220ms ease-out',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Club short-name watermark (Site Info) */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52, fontFamily: 'CKCL', fontWeight: 600,
          color: 'rgba(14,17,22,0.03)', letterSpacing: '-0.02em',
          pointerEvents: 'none', userSelect: 'none',
        }}
      >
        {site.short_name || ''}
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Avatar src={member.avatar} name={member.name} size={72} />

        {/* Tier chip */}
        <div
          style={{
            fontFamily: 'CKCL',
            fontWeight: 500,
            fontSize: 9,
            letterSpacing: '0.08em',
            color: style.color,
            background: style.bg,
            border: `1px solid ${style.color}40`,
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          {member.tier.toUpperCase()}
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: 'CKCL',
            fontWeight: 600,
            fontSize: 16,
            color: '#0E1116',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            textAlign: 'center',
            overflowWrap: 'anywhere',
          }}
        >
          {member.name}
        </div>

        {/* Company · Designation */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'CKCL',
              fontSize: 12,
              color: '#5C6673',
              lineHeight: 1.4,
            }}
          >
            {member.company}
          </div>
          <div
            style={{
              fontFamily: 'CKCL',
              fontSize: 11,
              color: '#A8B0BB',
              marginTop: 2,
            }}
          >
            {member.designation}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── List row ─────────────────────────────────────────────────────────────────
type SortKey = 'name' | 'tier' | 'company' | 'designation'

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? '#E10B17' : '#A8B0BB'} strokeWidth="2.5">
      {dir === 'asc' || !active
        ? <polyline points="18 15 12 9 6 15"/>
        : <polyline points="6 9 12 15 18 9"/>}
    </svg>
  )
}

function MemberListView({
  members,
  sortKey,
  sortDir,
  onSort,
}: {
  members: Member[]
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  const cols: { key: SortKey; label: string }[] = [
    { key: 'name',        label: 'Member' },
    { key: 'tier',        label: 'Type' },
    { key: 'company',     label: 'Company' },
    { key: 'designation', label: 'Designation' },
  ]

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(185,139,67,0.22)', background: '#FFFFFF' }}>
      {/* Header — mobile: sort buttons wrap in a row; from md: table columns */}
      <div
        className="flex flex-wrap gap-x-5 md:grid md:grid-cols-[2fr_1.4fr_2fr_1.8fr] md:gap-x-0 px-4 md:px-6"
        style={{
          background: '#F7F8FA',
          borderBottom: '1px solid #E2E6EC',
        }}
      >
        {cols.map((col) => (
          <button
            key={col.key}
            onClick={() => onSort(col.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '14px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'CKCL',
              fontWeight: 500,
              fontSize: 10,
              letterSpacing: '0.08em',
              color: sortKey === col.key ? '#E10B17' : '#5C6673',
            }}
          >
            {col.label.toUpperCase()}
            <SortIcon active={sortKey === col.key} dir={sortDir} />
          </button>
        ))}
      </div>

      {/* Rows */}
      {members.map((m, i) => {
        const ts = tierStyle(m.tier)
        return (
          <div
            key={m.id}
            style={{
              borderBottom: i < members.length - 1 ? '1px solid #F2F4F7' : 'none',
              transition: 'background 140ms',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F7F8FA' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
          >
          {/* Mobile list (1 per row): name → company → Founding/Director tier under company */}
          <div className="flex md:hidden items-center gap-3" style={{ padding: '14px 16px' }}>
            <Avatar src={m.avatar} name={m.name} size={44} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 14, color: '#0E1116', lineHeight: 1.3, marginBottom: 4 }}>
                {m.name}
              </div>
              {(m.designation || m.company) && (
                <div style={{ fontFamily: 'CKCL', fontSize: 12.5, color: '#5C6673', lineHeight: 1.45 }}>
                  {m.designation}{m.designation && m.company ? ', ' : ''}
                  {m.company ? <span style={{ color: '#2A3039' }}>{m.company}</span> : null}
                </div>
              )}
              {m.tier ? (
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: 'CKCL',
                    fontWeight: 500,
                    fontSize: 8.5,
                    letterSpacing: '0.07em',
                    color: ts.color,
                    background: ts.bg,
                    border: `1px solid ${ts.color}40`,
                    borderRadius: 999,
                    padding: '3px 8px',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                  }}
                >
                  {m.tier.toUpperCase()}
                </div>
              ) : null}
            </div>
          </div>

          {/* Desktop: table row */}
          <div className="hidden md:grid md:grid-cols-[2fr_1.4fr_2fr_1.8fr] items-center" style={{ padding: '16px 24px' }}>
            {/* Member col */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar src={m.avatar} name={m.name} size={40} />
              <span
                style={{
                  fontFamily: 'CKCL',
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#0E1116',
                }}
              >
                {m.name}
              </span>
            </div>
            {/* Tier */}
            <div>
              <span
                style={{
                  fontFamily: 'CKCL',
                  fontWeight: 500,
                  fontSize: 9,
                  letterSpacing: '0.07em',
                  color: ts.color,
                  background: ts.bg,
                  border: `1px solid ${ts.color}40`,
                  borderRadius: 999,
                  padding: '4px 9px',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.tier.toUpperCase()}
              </span>
            </div>
            {/* Company */}
            <div
              style={{
                fontFamily: 'CKCL',
                fontSize: 13,
                color: '#2A3039',
              }}
            >
              {m.company}
            </div>
            {/* Designation */}
            <div
              style={{
                fontFamily: 'CKCL',
                fontSize: 13,
                color: '#5C6673',
              }}
            >
              {m.designation}
            </div>
          </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '24px 20px',
        border: '1px solid rgba(185,139,67,0.20)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#EEF1F5', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ width: 60, height: 18, borderRadius: 999, background: '#EEF1F5', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ width: 120, height: 16, borderRadius: 8, background: '#EEF1F5', animation: 'pulse 1.5s ease-in-out 0.1s infinite' }} />
      <div style={{ width: 90, height: 13, borderRadius: 8, background: '#EEF1F5', animation: 'pulse 1.5s ease-in-out 0.2s infinite' }} />
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null

  const pages: (number | '…')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('…')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('…')
    pages.push(total)
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.70)',
        borderRadius: 999,
        padding: '6px 8px',
        boxShadow: '0 4px 16px rgba(14,17,22,0.08)',
      }}
    >
      {/* Prev */}
      <button
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'none', border: 'none', cursor: current === 1 ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: current === 1 ? 0.35 : 1,
          transition: 'background 140ms',
        }}
        onMouseEnter={(e) => { if (current !== 1) (e.currentTarget as HTMLElement).style.background = '#EEF1F5' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E1116" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`dot-${i}`} style={{ width: 36, textAlign: 'center', fontFamily: 'CKCL', fontSize: 14, color: '#A8B0BB' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: p === current ? '#E10B17' : 'none',
              border: 'none', cursor: 'pointer',
              fontFamily: 'CKCL',
              fontWeight: p === current ? 700 : 500,
              fontSize: 14,
              color: p === current ? '#FFFFFF' : '#2A3039',
              transition: 'all 140ms',
            }}
            onMouseEnter={(e) => { if (p !== current) (e.currentTarget as HTMLElement).style.background = '#EEF1F5' }}
            onMouseLeave={(e) => { if (p !== current) (e.currentTarget as HTMLElement).style.background = 'none' }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'none', border: 'none', cursor: current === total ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: current === total ? 0.35 : 1,
          transition: 'background 140ms',
        }}
        onMouseEnter={(e) => { if (current !== total) (e.currentTarget as HTMLElement).style.background = '#EEF1F5' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E1116" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader() {
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
        // Align with the site content column, like the Media & Resources headers
        paddingInline: SITE_HEADER_PAD_INLINE,
        paddingBottom: 40,
      }}
    >
      <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(242,51,61,0.10) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(185,139,67,0.08) 0%,transparent 65%)', filter: 'blur(48px)', pointerEvents: 'none' }} />
      <div className="flex items-center gap-1.5 mb-4" style={{ position: 'relative', zIndex: 1 }}>
        {['Home', 'Membership', 'Member List'].map((crumb, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="eyebrow" style={{ fontSize: 11, color: i < arr.length - 1 ? '#5C6673' : '#0E1116' }}>{crumb}</span>
            {i < arr.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
          </span>
        ))}
      </div>
      <div className="eyebrow mb-3" style={{ fontSize: 11, color: '#B98B43', position: 'relative', zIndex: 1 }}>MEMBERSHIP</div>
      <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0E1116', margin: 0, position: 'relative', zIndex: 1 }}>
        Member Directory.
      </h1>
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
function Select({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          paddingLeft: 14,
          paddingRight: 32,
          paddingTop: 10,
          paddingBottom: 10,
          fontFamily: 'CKCL',
          fontSize: 13,
          color: value ? '#0E1116' : '#A8B0BB',
          background: '#FFFFFF',
          border: '1px solid #E2E6EC',
          borderRadius: 10,
          cursor: 'pointer',
          outline: 'none',
          minWidth: 160,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
function FilterBar({
  search, onSearch,
  tierFilter, onTierFilter,
  companyFilter, onCompanyFilter,
  resultCount, totalCount,
  viewMode, onViewMode,
  tierOptions, companyOptions,
}: {
  search: string; onSearch: (v: string) => void
  tierFilter: string; onTierFilter: (v: string) => void
  companyFilter: string; onCompanyFilter: (v: string) => void
  resultCount: number; totalCount: number
  viewMode: 'grid' | 'list'; onViewMode: (v: 'grid' | 'list') => void
  tierOptions: string[]; companyOptions: string[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      style={{
        position: 'sticky',
        top: 80,
        zIndex: 40,
        padding: '12px clamp(24px,5vw,80px)',
        background: 'rgba(247,248,250,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(226,230,236,0.60)',
      }}
    >
      <div style={{ maxWidth: SITE_W, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {/* Search */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#FFFFFF',
            border: '1px solid #E2E6EC',
            borderRadius: 10,
            padding: '10px 14px',
            flex: '1 1 200px',
            minWidth: 0,
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name or company"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'CKCL',
              fontSize: 13,
              color: '#0E1116',
              flex: 1,
              minWidth: 0,
            }}
          />
          {search && (
            <button onClick={() => onSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <Select value={tierFilter} onChange={onTierFilter} options={tierOptions} placeholder="Membership Type" />
        <Select value={companyFilter} onChange={onCompanyFilter} options={companyOptions} placeholder="Company" />

        {/* Result count */}
        <div
          className="eyebrow"
          style={{ fontSize: 10, color: '#5C6673', whiteSpace: 'nowrap', marginLeft: 'auto' }}
        >
          Showing {resultCount.toLocaleString()} of {totalCount.toLocaleString()} members
        </div>

        {/* View toggle */}
        <div
          style={{
            display: 'flex',
            background: '#EEF1F5',
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}
        >
          {(['grid', 'list'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewMode(mode)}
              style={{
                width: 36, height: 32,
                borderRadius: 8,
                background: viewMode === mode ? '#FFFFFF' : 'none',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: viewMode === mode ? '0 1px 4px rgba(14,17,22,0.10)' : 'none',
                transition: 'all 160ms',
              }}
            >
              {mode === 'grid' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'grid' ? '#0E1116' : '#A8B0BB'} strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'list' ? '#0E1116' : '#A8B0BB'} strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div
        style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#EEF1F5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <div
        style={{
          fontFamily: 'CKCL',
          fontWeight: 600,
          fontSize: 20,
          color: '#0E1116',
          marginBottom: 8,
        }}
      >
        No members match that search.
      </div>
      <div
        style={{
          fontFamily: 'CKCL',
          fontSize: 14,
          color: '#5C6673',
          marginBottom: 24,
        }}
      >
        Try a different name or clear the filters.
      </div>
      <button
        onClick={onClear}
        style={{
          fontFamily: 'CKCL',
          fontSize: 14,
          fontWeight: 600,
          color: '#FFFFFF',
          background: '#E10B17',
          border: 'none',
          borderRadius: 999,
          padding: '12px 24px',
          cursor: 'pointer',
          transition: 'background 160ms',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#E10B17' }}
      >
        Clear filters
      </button>
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────
export default function MemberListPage() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => { setPage(1) }, [search, tierFilter, companyFilter, viewMode])

  const { members: apiMembers, total, lastPage, loading, error } = useDirectoryList({
    q: search,
    page,
    per_page: PAGE_SIZE,
  })

  const allForFilters = useMemo(() => apiMembers.map(toMember), [apiMembers])

  const { members: allMembersPage } = useDirectoryList({ q: '', page: 1, per_page: 100 })
  const catalog = useMemo(() => allMembersPage.map(toMember), [allMembersPage])
  const TIER_OPTIONS = useMemo(
    () => [...new Set(catalog.map((m) => m.tier).filter(Boolean))].sort(),
    [catalog],
  )
  const COMPANY_OPTIONS = useMemo(
    () => [...new Set(catalog.map((m) => m.company).filter(Boolean))].sort(),
    [catalog],
  )

  const filtered = useMemo(() => {
    let rows = allForFilters
    if (tierFilter) rows = rows.filter((m) => m.tier === tierFilter)
    if (companyFilter) rows = rows.filter((m) => m.company === companyFilter)
    return rows.slice().sort((a, b) => {
      const av = String(a[sortKey] || '').toLowerCase()
      const bv = String(b[sortKey] || '').toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [allForFilters, tierFilter, companyFilter, sortKey, sortDir])

  // Server already paginates by search; client filters may shrink page — show filtered page slice
  const totalPages = Math.max(lastPage, Math.ceil((tierFilter || companyFilter ? filtered.length : total) / PAGE_SIZE) || 1)
  const paginated = (tierFilter || companyFilter) ? filtered.slice(0, PAGE_SIZE) : filtered

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setTierFilter('')
    setCompanyFilter('')
  }

  return (
    <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
      <PageHeader />

      <FilterBar
        search={search} onSearch={setSearch}
        tierFilter={tierFilter} onTierFilter={setTierFilter}
        companyFilter={companyFilter} onCompanyFilter={setCompanyFilter}
        resultCount={filtered.length}
        totalCount={total || catalog.length}
        viewMode={viewMode} onViewMode={setViewMode}
        tierOptions={TIER_OPTIONS}
        companyOptions={COMPANY_OPTIONS}
      />

      <div style={{ maxWidth: SITE_W, margin: '0 auto', padding: 'clamp(40px,5vw,64px) clamp(24px,5vw,80px)' }}>
        {error && (
          <div style={{ marginBottom: 16, fontFamily: 'CKCL', fontSize: 13, color: '#E10B17' }}>{error}</div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-10">
              {paginated.map((m) => <MemberGridCard key={m.id} member={m} />)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination current={page} total={totalPages} onChange={setPage} />
            </div>
          </>
        ) : (
          <>
            <div className="mb-10 overflow-x-auto">
              <MemberListView
                members={paginated}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination current={page} total={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Pulse animation for skeleton */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      <Footer />
    </div>
  )
}
