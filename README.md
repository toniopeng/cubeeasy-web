# CubeEasy Web

Beginner 3×3 tutor (web SaaS preview): 7-step course, 2 free runs, Lifetime **$9.99** via Paddle Overlay.

## Local

```bash
npm install
npm run dev
```

## Paddle env

Copy `.env.example` → `.env`:

```
VITE_PADDLE_CLIENT_TOKEN=test_…   # Paddle client token
VITE_PADDLE_PRICE_ID=pri_…        # Lifetime price id
VITE_PADDLE_ENV=sandbox           # or production
```

Rebuild after changing env. Without tokens, Checkout shows a sandbox placeholder + “Simulate successful purchase”.

## Build

```bash
npm run build
npm run preview
```

Static assets land in `dist/`.

## Brand

Avoid Rubik/rubiks/rubix in titles, H1s, and keywords. Prefer “3×3”, “cube”, “beginner method”.
