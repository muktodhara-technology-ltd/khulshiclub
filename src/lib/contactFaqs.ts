/**
 * Contact page FAQs → GET /club/club-portal/website/contact-faqs
 */
import { useApi } from './useApi'

const PATH = 'club/club-portal/website/contact-faqs'

export type ContactFaq = { q: string; a: string }

export function useContactFaqs(): {
  faqs: ContactFaq[]
  loading: boolean
  error: string | null
  fromApi: boolean
} {
  const { data, error, loading } = useApi<ContactFaq[]>(PATH)
  const faqs = Array.isArray(data) ? data.filter((f) => f?.q && f?.a) : []
  return {
    faqs,
    loading,
    error,
    fromApi: Array.isArray(data),
  }
}
