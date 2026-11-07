#!/bin/sh
# Writes public/config.js from the container's environment when the app starts, so one
# image can point at any API (local / staging / live) without a rebuild:
#
#   API_URL        Laravel host the site calls, e.g. https://api.erp17.com/   (required)
#   PORTAL_DOMAIN  Club domain sent as X-Portal-Domain; leave empty to use the
#                  page's own hostname (normal for a live club site)          (optional)
set -eu

target="${APP_CONFIG_PATH:-/app/public/config.js}"

# JSON string escaping for the two values (backslash, quote; newlines dropped).
json_escape() {
  printf '%s' "$1" | tr -d '\r\n' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

api_url="$(json_escape "${API_URL:-}")"
portal_domain="$(json_escape "${PORTAL_DOMAIN:-}")"

if [ -z "$api_url" ]; then
  echo "40-app-config: WARNING — API_URL is not set; the site will not reach the API." >&2
fi

mkdir -p "$(dirname "$target")"

cat > "$target" <<JS
// Generated at container start by docker/40-app-config.sh — do not edit.
window.__APP_CONFIG__ = { "API_URL": "${api_url}", "PORTAL_DOMAIN": "${portal_domain}" }
JS

echo "40-app-config: wrote $target (API_URL=${API_URL:-<unset>}, PORTAL_DOMAIN=${PORTAL_DOMAIN:-<page hostname>})"

exec "$@"
