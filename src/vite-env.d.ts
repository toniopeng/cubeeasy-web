/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PADDLE_CLIENT_TOKEN?: string
  readonly VITE_PADDLE_PRICE_ID?: string
  readonly VITE_PADDLE_ENV?: 'sandbox' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  Paddle?: {
    Environment: { set: (env: 'sandbox' | 'production') => void }
    Initialize: (opts: { token: string; eventCallback?: (e: unknown) => void }) => void
    Checkout: {
      open: (opts: {
        items: Array<{ priceId: string; quantity: number }>
        settings?: { displayMode?: string; theme?: string; successUrl?: string }
      }) => void
    }
  }
}
