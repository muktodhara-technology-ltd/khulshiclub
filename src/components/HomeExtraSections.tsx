import { useEffect, useState } from 'react'
import { mediaUrl } from '../lib/api/client'
import {
  useHome,
  parseLink,
  type HomeBlock,
  type HomeCustomSection,
  type HomeSectionAlign,
} from '../lib/home'
import { SITE_W } from '../lib/layout'

const HOME_W = SITE_W
const HOME_BG_ALT = '#F3F5F8'
const GOLD = '#B98B43'
const INK = '#0E1116'
const MUTED = '#5C6673'
const LINE = '#E2E6EC'
const RED = '#E10B17'

function sectionId(s: HomeCustomSection, index: number) {
  const raw = (s.id || s.title || `extra-${index}`).toString()
  return (
    `extra-${raw}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `extra-${index}`
  )
}

/** Old map default leaked into other blocks — never show as a label. */
function cleanExtra(type: string | undefined, extra: string | undefined) {
  const v = (extra || '').trim()
  if (!v) return ''
  if (type !== 'map' && v.toLowerCase() === 'our location') return ''
  return v
}

function blockImage(b: HomeBlock) {
  return mediaUrl(b.preview || b.image || '') || ''
}

function youtubeEmbed(url: string) {
  const u = (url || '').trim()
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  )
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vim = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`
  return ''
}

function toRoman(n: number) {
  const map: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let num = Math.max(1, n)
  let out = ''
  for (const [v, s] of map) {
    while (num >= v) {
      out += s
      num -= v
    }
  }
  return out
}

/** Same markers as admin BlockEditor LIST_STYLES. */
function listMarker(style: string | undefined, index: number, blockType?: string) {
  const resolved =
    style ||
    (blockType === 'numbers' ? 'decimal' : 'disc')
  const i = index + 1
  switch (resolved) {
    case 'circle':
      return '○'
    case 'square':
      return '■'
    case 'dash':
      return '–'
    case 'decimal':
      return `${i}.`
    case 'decimal-zero':
      return `${String(i).padStart(2, '0')}.`
    case 'lower-alpha':
      return `${String.fromCharCode(97 + ((i - 1) % 26))}.`
    case 'upper-alpha':
      return `${String.fromCharCode(65 + ((i - 1) % 26))}.`
    case 'lower-roman':
      return `${toRoman(i).toLowerCase()}.`
    case 'upper-roman':
      return `${toRoman(i)}.`
    case 'disc':
    default:
      return '•'
  }
}

function isOrderedListStyle(style: string | undefined, blockType?: string) {
  const s = style || (blockType === 'numbers' ? 'decimal' : 'disc')
  return (
    blockType === 'numbers' ||
    s === 'decimal' ||
    s === 'decimal-zero' ||
    s === 'lower-alpha' ||
    s === 'upper-alpha' ||
    s === 'lower-roman' ||
    s === 'upper-roman'
  )
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'CKCL',
  fontSize: 14,
  fontWeight: 600,
  color: '#FFFFFF',
  textDecoration: 'none',
  background: RED,
  borderRadius: 999,
  padding: '12px 22px',
}

function GalleryLightbox({
  shots,
  index,
  onChange,
  onClose,
}: {
  shots: { src: string; caption: string }[]
  index: number
  onChange: (i: number) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onChange((index - 1 + shots.length) % shots.length)
      if (e.key === 'ArrowRight') onChange((index + 1) % shots.length)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [index, shots.length, onChange, onClose])

  const shot = shots[index]
  if (!shot) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={shot.caption || 'Gallery image'}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(14,17,22,0.92)',
        backdropFilter: 'blur(16px)',
        padding: '24px 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: 'min(1100px, 100%)', maxHeight: '90vh' }}
      >
        <img
          src={shot.src}
          alt={shot.caption || ''}
          style={{
            display: 'block',
            width: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: 16,
            background: '#0E1116',
          }}
        />
        {shot.caption ? (
          <p
            style={{
              fontFamily: 'CKCL',
              fontSize: 14,
              color: 'rgba(255,255,255,0.75)',
              textAlign: 'center',
              margin: '14px 0 0',
            }}
          >
            {shot.caption}
          </p>
        ) : null}
        <div
          className="eyebrow"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            fontSize: 10,
            color: '#FFFFFF',
            background: 'rgba(14,17,22,0.55)',
            borderRadius: 999,
            padding: '5px 12px',
          }}
        >
          {index + 1} / {shots.length}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: 'rgba(14,17,22,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {shots.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => onChange((index - 1 + shots.length) % shots.length)}
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(14,17,22,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => onChange((index + 1) % shots.length)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(14,17,22,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

function GalleryBlock({ block }: { block: HomeBlock }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const gallery = Array.isArray(block.gallery) ? block.gallery : []
  const shots = gallery
    .map((g) => ({ src: mediaUrl(g.preview || g.image || '') || '', caption: g.caption || '' }))
    .filter((g) => g.src)
  if (!shots.length) return null
  const cols = shots.length === 1 ? 1 : shots.length === 2 ? 2 : 3

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: 14,
          marginBottom: 32,
          width: '100%',
        }}
      >
        {shots.map((g, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={g.caption || `Open image ${i + 1}`}
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              borderRadius: 18,
              overflow: 'hidden',
              background: '#EEF1F5',
              aspectRatio: cols === 1 ? '16/9' : '4/3',
              boxShadow: '0 12px 32px -18px rgba(14,17,22,0.22)',
              cursor: 'zoom-in',
              display: 'block',
              width: '100%',
            }}
          >
            <img
              src={g.src}
              alt={g.caption || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </div>
      {openIndex !== null ? (
        <GalleryLightbox
          shots={shots}
          index={openIndex}
          onChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </>
  )
}

function BlockLink({
  href,
  children,
  onFollow,
}: {
  href: string
  children: React.ReactNode
  onFollow: (link: string) => void
}) {
  const t = parseLink(href)
  if (!t) {
    return <span style={{ fontFamily: 'CKCL', fontWeight: 600, color: RED }}>{children}</span>
  }
  if (t.kind === 'url') {
    return (
      <a href={t.href} {...(t.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={btnPrimary}>
        {children}
      </a>
    )
  }
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault()
        onFollow(href)
      }}
      style={btnPrimary}
    >
      {children}
    </a>
  )
}

function HomeBlockView({
  block,
  onFollow,
  contentAlign = 'start',
}: {
  block: HomeBlock
  onFollow: (link: string) => void
  contentAlign?: HomeSectionAlign
}) {
  const type = block.type || 'paragraph'
  const text = (block.text || '').trim()
  const extra = cleanExtra(type, block.extra)
  const items = Array.isArray(block.items) ? block.items : []
  const justify = flexJustify(contentAlign)

  if (type === 'divider') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0 28px' }}>
        <div style={{ flex: 1, height: 1, background: LINE }} />
        <div style={{ width: 6, height: 6, borderRadius: 99, background: GOLD }} />
        <div style={{ flex: 1, height: 1, background: LINE }} />
      </div>
    )
  }

  if (type === 'heading' && text) {
    return (
      <h3
        style={{
          fontFamily: 'CKCL',
          fontWeight: 600,
          fontSize: 'clamp(24px,2.4vw,36px)',
          lineHeight: 1.2,
          letterSpacing: '-0.015em',
          color: INK,
          margin: '0 0 20px',
        }}
      >
        {text.split('\n').map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </h3>
    )
  }

  if (type === 'subheading' && text) {
    return (
      <h4
        style={{
          fontFamily: 'CKCL',
          fontWeight: 600,
          fontSize: 'clamp(18px,1.6vw,22px)',
          lineHeight: 1.35,
          color: INK,
          margin: '4px 0 14px',
        }}
      >
        {text}
      </h4>
    )
  }

  if (type === 'clause' && text) {
    return (
      <div
        style={{
          fontFamily: 'CKCL',
          fontWeight: 600,
          fontSize: 'clamp(18px,1.5vw,22px)',
          color: INK,
          lineHeight: 1.3,
          margin: '8px 0 18px',
          width: '100%',
          textAlign: contentAlign === 'center' ? 'center' : contentAlign === 'end' ? 'right' : 'left',
        }}
      >
        {text}
      </div>
    )
  }

  if ((type === 'paragraph' || type === 'callout') && text) {
    if (type === 'callout') {
      return (
        <div
          style={{
            margin: '0 0 22px',
            padding: '18px 20px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #FFF8F8 0%, #FFF5F5 100%)',
            borderLeft: `3px solid ${RED}`,
            fontFamily: 'CKCL',
            fontSize: 15,
            lineHeight: 1.7,
            color: '#2A3039',
          }}
        >
          {text}
        </div>
      )
    }
    return (
      <p
        style={{
          fontFamily: 'CKCL',
          fontSize: 16,
          lineHeight: 1.75,
          color: MUTED,
          margin: '0 0 18px',
          maxWidth: 720,
          ...(contentAlign === 'center'
            ? { marginLeft: 'auto', marginRight: 'auto' }
            : contentAlign === 'end'
              ? { marginLeft: 'auto', marginRight: 0 }
              : null),
        }}
      >
        {text}
      </p>
    )
  }

  if (type === 'quote' && text) {
    return (
      <blockquote
        style={{
          margin: '12px 0 28px',
          padding: '24px 28px',
          borderRadius: 20,
          background: '#FAFBFC',
          border: `1px solid ${LINE}`,
          position: 'relative',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 12,
            left: 20,
            fontFamily: 'CKCL',
            fontSize: 48,
            lineHeight: 1,
            color: GOLD,
            opacity: 0.45,
          }}
        >
          “
        </span>
        <p
          style={{
            fontFamily: 'CKCL',
            fontSize: 'clamp(18px,1.6vw,22px)',
            lineHeight: 1.45,
            color: INK,
            margin: '8px 0 0',
            fontWeight: 500,
          }}
        >
          {text}
        </p>
        {extra ? (
          <footer style={{ fontFamily: 'CKCL', fontSize: 13, color: '#7A8491', marginTop: 14 }}>— {extra}</footer>
        ) : null}
      </blockquote>
    )
  }

  if ((type === 'bullets' || type === 'numbers') && items.length) {
    const style = block.listStyle || (type === 'numbers' ? 'decimal' : 'disc')
    const ordered = isOrderedListStyle(style, type)
    // Points always start (left) — even when the section / other blocks are centered.
    // Marker follows admin listStyle (• / ○ / 1 2 3 / a b c / i ii …), not always •.
    return (
      <ul
        style={{
          margin: '0 0 24px',
          padding: 0,
          listStyle: 'none',
          fontFamily: 'CKCL',
          fontSize: 15,
          lineHeight: 1.75,
          color: '#2A3039',
          width: '100%',
          alignSelf: 'stretch',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        {items.map((item, i) => {
          const line = typeof item === 'string' ? item : String((item as { text?: string })?.text || '')
          if (!line.trim()) return null
          const marker = listMarker(style, i, type)
          return (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                gap: 10,
                margin: 0,
                padding: 0,
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  color: RED,
                  fontWeight: 700,
                  fontSize: ordered ? 14 : 18,
                  lineHeight: ordered ? '1.75' : '1.35',
                  minWidth: ordered ? 28 : 14,
                  textAlign: 'left',
                }}
              >
                {marker}
              </span>
              <span style={{ textAlign: 'left', color: '#2A3039' }}>{line}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (type === 'image') {
    const src = blockImage(block)
    if (!src) return null
    return (
      <figure style={{ margin: '4px 0 32px' }}>
        <div
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            background: '#EEF1F5',
            boxShadow: '0 20px 50px -24px rgba(14,17,22,0.28)',
          }}
        >
          <img
            src={src}
            alt={extra || text || ''}
            style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 520, objectFit: 'cover' }}
          />
        </div>
        {extra || text ? (
          <figcaption
            style={{
              fontFamily: 'CKCL',
              fontSize: 13,
              color: '#7A8491',
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            {extra || text}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  if (type === 'gallery') {
    return <GalleryBlock block={block} />
  }

  if (type === 'video') {
    const embed = youtubeEmbed(text)
    if (embed) {
      return (
        <div
          style={{
            margin: '0 0 32px',
            borderRadius: 22,
            overflow: 'hidden',
            background: INK,
            aspectRatio: '16/9',
            boxShadow: '0 20px 50px -24px rgba(14,17,22,0.35)',
          }}
        >
          <iframe src={embed} title={extra || 'Video'} allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
        </div>
      )
    }
    const thumb = blockImage(block)
    if (!text && !thumb) return null
    return (
      <a href={text || undefined} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: 28, textDecoration: 'none' }}>
        {thumb ? (
          <img src={thumb} alt={extra || 'Video'} style={{ width: '100%', borderRadius: 22, display: 'block' }} />
        ) : (
          <div style={{ fontFamily: 'CKCL', fontSize: 14, color: RED, fontWeight: 600 }}>{extra || text || 'Watch video'}</div>
        )}
      </a>
    )
  }

  if (type === 'link' && (text || extra)) {
    return (
      <div style={{ margin: '10px 0 28px', display: 'flex', justifyContent: justify, width: '100%' }}>
        <BlockLink href={extra || text} onFollow={onFollow}>
          {text || 'Learn more'}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </BlockLink>
      </div>
    )
  }

  if (type === 'file' && (text || extra || block.preview || block.image)) {
    const href = mediaUrl(block.preview || block.image || text) || text
    if (!href) return null
    return (
      <div style={{ margin: '0 0 22px' }}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'CKCL',
            fontSize: 14,
            fontWeight: 600,
            color: INK,
            textDecoration: 'none',
            border: `1.5px solid ${LINE}`,
            borderRadius: 999,
            padding: '12px 20px',
            background: '#FFFFFF',
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#FFF5F5',
              color: RED,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            PDF
          </span>
          {block.fileName || extra || 'Download file'}
        </a>
      </div>
    )
  }

  if (type === 'faq' && items.length) {
    return (
      <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
        {items.map((raw, i) => {
          const row = raw && typeof raw === 'object' ? (raw as { q?: string; a?: string }) : {}
          if (!row.q && !row.a) return null
          return (
            <div
              key={i}
              style={{
                borderRadius: 16,
                border: `1px solid ${LINE}`,
                background: '#FFFFFF',
                padding: '18px 20px',
                boxShadow: '0 8px 24px -16px rgba(14,17,22,0.12)',
              }}
            >
              <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 15, color: INK, marginBottom: 6 }}>{row.q}</div>
              {row.a ? <div style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.65, color: MUTED }}>{row.a}</div> : null}
            </div>
          )
        })}
      </div>
    )
  }

  if (type === 'stats' && items.length) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 14,
          marginBottom: 32,
        }}
      >
        {items.map((raw, i) => {
          const row = raw && typeof raw === 'object' ? (raw as { label?: string; value?: string }) : {}
          if (!row.label && !row.value) return null
          return (
            <div
              key={i}
              style={{
                borderRadius: 18,
                background: '#FFFFFF',
                border: `1px solid ${LINE}`,
                padding: '22px 18px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 32, color: RED, letterSpacing: '-0.02em' }}>
                {row.value}
              </div>
              <div className="eyebrow" style={{ color: '#7A8491', marginTop: 10, fontSize: 11 }}>
                {row.label}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (type === 'timeline' && items.length) {
    return (
      <div style={{ margin: '0 0 32px', borderLeft: `2px solid ${LINE}`, paddingLeft: 24 }}>
        {items.map((raw, i) => {
          const row = raw && typeof raw === 'object' ? (raw as { year?: string; text?: string }) : {}
          if (!row.year && !row.text) return null
          return (
            <div key={i} style={{ position: 'relative', marginBottom: 22 }}>
              <span
                style={{
                  position: 'absolute',
                  left: -31,
                  top: 4,
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: GOLD,
                  border: '2px solid #FFFFFF',
                  boxShadow: `0 0 0 1px ${LINE}`,
                }}
              />
              <div style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: GOLD, marginBottom: 4 }}>{row.year}</div>
              <div style={{ fontFamily: 'CKCL', fontSize: 15, color: '#2A3039', lineHeight: 1.55 }}>{row.text}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (type === 'contact' && items.length) {
    return (
      <div
        style={{
          display: 'grid',
          gap: 0,
          marginBottom: 28,
          maxWidth: 520,
          borderRadius: 18,
          border: `1px solid ${LINE}`,
          overflow: 'hidden',
          background: '#FFFFFF',
        }}
      >
        {text ? (
          <div
            style={{
              fontFamily: 'CKCL',
              fontWeight: 600,
              fontSize: 16,
              color: INK,
              padding: '16px 18px',
              borderBottom: `1px solid ${LINE}`,
              background: '#FAFBFC',
            }}
          >
            {text}
          </div>
        ) : null}
        {items.map((raw, i) => {
          const row = raw && typeof raw === 'object' ? (raw as { label?: string; value?: string }) : {}
          if (!row.value) return null
          return (
            <div
              key={i}
              style={{
                fontFamily: 'CKCL',
                fontSize: 14,
                color: MUTED,
                padding: '14px 18px',
                borderBottom: i < items.length - 1 ? `1px solid ${LINE}` : 0,
                display: 'grid',
                gridTemplateColumns: '110px 1fr',
                gap: 12,
              }}
            >
              <span style={{ color: INK, fontWeight: 600 }}>{row.label}</span>
              <span>{row.value}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (type === 'table' && Array.isArray(block.rows) && block.rows.length) {
    return (
      <div style={{ overflowX: 'auto', marginBottom: 32, borderRadius: 16, border: `1px solid ${LINE}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'CKCL', fontSize: 14 }}>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri === 0 ? '#F7F8FA' : '#FFFFFF' }}>
                {(row || []).map((cell, ci) => {
                  const Cell = ri === 0 ? 'th' : 'td'
                  return (
                    <Cell
                      key={ci}
                      style={{
                        textAlign: 'left',
                        padding: '13px 16px',
                        borderBottom: '1px solid #E2E6EC',
                        fontWeight: ri === 0 ? 600 : 400,
                        color: INK,
                      }}
                    >
                      {cell}
                    </Cell>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (type === 'map' && text) {
    return (
      <div style={{ margin: '0 0 32px' }}>
        {extra ? (
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 16, color: INK, marginBottom: 12 }}>{extra}</div>
        ) : null}
        <div
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            border: `1px solid ${LINE}`,
            aspectRatio: '16/9',
            boxShadow: '0 16px 40px -20px rgba(14,17,22,0.2)',
          }}
        >
          <iframe title={extra || 'Map'} src={text} style={{ width: '100%', height: '100%', border: 0 }} loading="lazy" />
        </div>
      </div>
    )
  }

  return null
}

function normalizeAlign(v: string | null | undefined, fallback: HomeSectionAlign = 'start'): HomeSectionAlign {
  const a = String(v || '').toLowerCase()
  if (a === 'center' || a === 'end' || a === 'start') return a
  return fallback
}

/** Effective align for a block: its own override, else the section’s Content position. */
function effectiveBlockAlign(sectionAlign: HomeSectionAlign, blockAlign?: string | null): HomeSectionAlign {
  const raw = String(blockAlign || '').toLowerCase()
  if (raw === 'start' || raw === 'center' || raw === 'end') return raw
  return sectionAlign
}

function alignStyles(align: HomeSectionAlign = 'start') {
  if (align === 'center') {
    return {
      column: { maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' },
      accent: { marginLeft: 'auto', marginRight: 'auto' },
      header: { maxWidth: 720, marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' as const },
    }
  }
  if (align === 'end') {
    return {
      column: { maxWidth: 900, marginLeft: 'auto', marginRight: 0 },
      accent: { marginLeft: 'auto', marginRight: 0 },
      header: { maxWidth: 720, marginLeft: 'auto', marginRight: 0, textAlign: 'right' as const },
    }
  }
  return {
    column: { maxWidth: 900, marginLeft: 0, marginRight: 'auto' },
    accent: { marginLeft: 0, marginRight: 'auto' },
    header: { maxWidth: 720, marginLeft: 0, marginRight: 'auto', textAlign: 'left' as const },
  }
}

/** Per-block box inside the section column (can differ from section align). */
function blockBoxStyle(align: HomeSectionAlign): React.CSSProperties {
  return {
    width: '100%',
    // Explicit left — do not inherit section `text-align:center` into lists/paragraphs.
    textAlign: align === 'center' ? 'center' : align === 'end' ? 'right' : 'left',
    display: 'flex',
    flexDirection: 'column',
    alignItems: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'stretch',
  }
}

function flexJustify(align: HomeSectionAlign): React.CSSProperties['justifyContent'] {
  if (align === 'center') return 'center'
  if (align === 'end') return 'flex-end'
  return 'flex-start'
}

function ExtraSection({
  section,
  index,
  onFollow,
}: {
  section: HomeCustomSection
  index: number
  onFollow: (link: string) => void
}) {
  const blocks = section.blocks.filter(Boolean)
  if (!blocks.length && !section.title) return null
  const alt = index % 2 === 1
  const sectionAlign = normalizeAlign(section.align, 'start')
  const layout = alignStyles(sectionAlign)

  return (
    <section
      id={sectionId(section, index)}
      className="section-pad"
      style={{
        background: alt ? HOME_BG_ALT : '#FFFFFF',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: HOME_W, margin: '0 auto', padding: '0 clamp(24px,5vw,80px)' }}>
        {section.title ? (
          <header style={{ marginBottom: 36, ...layout.header }}>
            <div
              style={{
                width: 40,
                height: 3,
                borderRadius: 99,
                background: GOLD,
                marginBottom: 18,
                ...layout.accent,
              }}
            />
            <h2
              style={{
                fontFamily: 'CKCL',
                fontWeight: 600,
                fontSize: 'clamp(26px,2.8vw,40px)',
                color: INK,
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
                margin: 0,
              }}
            >
              {section.title}
            </h2>
          </header>
        ) : null}

        <div style={layout.column}>
          {blocks.map((b, i) => {
            // Bullet / number lists always sit at the start of the section column.
            const isList = b.type === 'bullets' || b.type === 'numbers'
            const blockAlign = isList ? 'start' : effectiveBlockAlign(sectionAlign, b.align)
            return (
              <div key={`${section.id}-${i}-${b.type}`} style={blockBoxStyle(blockAlign)}>
                <HomeBlockView block={b} onFollow={onFollow} contentAlign={blockAlign} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/**
 * Home → Extra sections (Website Maintenance → Extra sections).
 * API `payload.customSections[]` — each enabled section uses the same CKCL shell in a loop.
 */
export default function HomeExtraSections({ onFollowLink }: { onFollowLink: (link: string) => void }) {
  const { customSections, fromApi } = useHome()
  if (!fromApi || !customSections.length) return null
  return (
    <>
      {customSections.map((section, index) => (
        <ExtraSection key={section.id || `extra-${index}`} section={section} index={index} onFollow={onFollowLink} />
      ))}
    </>
  )
}
