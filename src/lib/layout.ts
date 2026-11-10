/** Site content column width — home and every public page share this. */
export const SITE_W = 1560

/** Horizontal page padding used with SITE_W containers. */
export const SITE_PAD = 'clamp(24px,5vw,80px)'

/**
 * Full-bleed header / band padding that lines up with a centred SITE_W column
 * (same formula previously hard-coded against 1280px).
 */
export const SITE_HEADER_PAD_INLINE =
  `max(${SITE_PAD}, calc((100% - ${SITE_W}px) / 2 + ${SITE_PAD}))`
