export {
  apiGet,
  apiPost,
  apiRequest,
  ApiError,
  baseURL,
  backendURL,
  portalDomain,
} from './client'
export type { ClubApiResponse } from './client'

export * from './website'

import { apiRequest } from './client'

/** @deprecated Prefer apiGet / apiPost with club/club-portal paths. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const clean = path.startsWith('/') ? path.slice(1) : path
  return apiRequest<T>(clean, init)
}
