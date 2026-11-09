import type { CSSProperties } from 'react'
import { useSiteInfo } from '../lib/siteInfo'

/**
 * Club mark from Website Maintenance → Site Info.
 * With a logo: image + club name (short name preferred).
 * Without a logo: name text only — never a bundled placeholder image.
 */
export default function ClubLogo({
  height,
  color = '#0E1116',
  style,
  showName = true,
}: {
  /** Logo height — px number or any CSS length (e.g. a clamp()). */
  height: number | string
  /** Text colour for the name. */
  color?: string
  style?: CSSProperties
  /** When a logo image exists, still show the club name beside it (default true). */
  showName?: boolean
}) {
  const site = useSiteInfo()
  const h = typeof height === 'number' ? `${height}px` : height
  const label = (site.short_name || site.club_name || '').trim()

  const nameStyle: CSSProperties = {
    fontFamily: 'CKCL',
    fontWeight: 700,
    fontSize: `calc(${h} * 0.55)`,
    letterSpacing: '0.04em',
    lineHeight: 1,
    color,
    whiteSpace: 'nowrap',
  }

  if (site.logo) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: `calc(${h} * 0.28)`,
          height: h,
          ...style,
        }}
      >
        <img
          src={site.logo}
          alt={label || 'Club logo'}
          style={{ height: h, width: 'auto', objectFit: 'contain', display: 'block', flexShrink: 0 }}
        />
        {showName && label ? <span style={nameStyle}>{label}</span> : null}
      </span>
    )
  }

  if (!label) return null

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: h,
        ...nameStyle,
        fontSize: `calc(${h} * 0.62)`,
        ...style,
      }}
    >
      {label}
    </span>
  )
}
