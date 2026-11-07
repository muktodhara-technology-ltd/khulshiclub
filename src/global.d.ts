/** Written into /config.js at container start — see docker/40-app-config.sh. */
interface AppRuntimeConfig {
  /** Laravel host, e.g. https://api.erp17.com/ (the client appends api/). */
  API_URL?: string
  /** Club portal domain sent as X-Portal-Domain; empty = the page's own hostname. */
  PORTAL_DOMAIN?: string
}

interface Window {
  __APP_CONFIG__?: AppRuntimeConfig
}

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_BACKEND_URL?: string
    NEXT_PUBLIC_PORTAL_DOMAIN?: string
    LARAVEL_PUBLIC_BACKEND_URL?: string
  }
}
