import { apiGet, mediaUrl } from './api/client'
import { useApi } from './useApi'

export type WebsiteOffer = {
  id: string
  kind: 'promo' | 'partner' | string
  title: string
  body?: string | null
  cta_label?: string | null
  cta_url?: string | null
  image?: string | null
  partner_name?: string | null
  offer_text?: string | null
  sort_order?: number
}

export function useWebsiteOffers() {
  const { data, error, loading, reload } = useApi<WebsiteOffer[]>('club/club-portal/website/offers')
  const offers = (data || []).map((o) => ({
    ...o,
    image: mediaUrl(o.image || '') || null,
  }))
  return { offers, error, loading, reload }
}

export async function fetchWebsiteOffers() {
  const rows = await apiGet<WebsiteOffer[]>('club/club-portal/website/offers')
  return (rows || []).map((o) => ({ ...o, image: mediaUrl(o.image || '') || null }))
}
