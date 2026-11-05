#!/bin/sh
# Build the cubeeasy.app static site. Paddle client token and price id are
# public frontend values; pass them in the environment. Never pass a pdl_ API key.
set -eu
: "${VITE_PADDLE_CLIENT_TOKEN:?Set VITE_PADDLE_CLIENT_TOKEN}"
: "${VITE_PADDLE_PRICE_ID:?Set VITE_PADDLE_PRICE_ID}"
: "${VITE_PADDLE_ENV:?Set VITE_PADDLE_ENV to production or sandbox}"
case "$VITE_PADDLE_CLIENT_TOKEN" in
  pdl_*) echo "Refusing to bake a Paddle API key into the site." >&2; exit 1 ;;
esac
export VITE_BASE="${VITE_BASE:-/}"
export VITE_SITE_ORIGIN="${VITE_SITE_ORIGIN:-https://cubeeasy.app}"
npm run build
js=$(ls dist/assets/index-*.js)
grep -q "$VITE_PADDLE_PRICE_ID" "$js"
grep -q "$VITE_PADDLE_CLIENT_TOKEN" "$js"
echo "Paddle client config is present in $js"
