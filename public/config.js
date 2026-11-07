// Runtime config — REPLACED when the Docker container starts (see docker/40-app-config.sh),
// from the container's API_URL / PORTAL_DOMAIN environment variables.
// Empty here, so local `vite dev` falls back to .env (NEXT_PUBLIC_BACKEND_URL, …).
window.__APP_CONFIG__ = {}
