/**
 * Paddle Overlay checkout helper.
 *
 * Env (Vite):
 *   VITE_PADDLE_CLIENT_TOKEN  — client-side token from Paddle
 *   VITE_PADDLE_PRICE_ID      — Lifetime price id (pri_…)
 *   VITE_PADDLE_ENV           — sandbox | production (default sandbox)
 *
 * Without tokens, openCheckout() returns { mode: 'placeholder' } so the UI
 * can show a sandbox-looking sheet instead of failing.
 */

export type CheckoutResult =
  | { mode: 'paddle'; opened: true }
  | { mode: 'placeholder'; reason: string }

let scriptPromise: Promise<void> | null = null

function config() {
  return {
    token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim() || '',
    priceId: import.meta.env.VITE_PADDLE_PRICE_ID?.trim() || '',
    env: (import.meta.env.VITE_PADDLE_ENV?.trim() || 'sandbox') as 'sandbox' | 'production',
  }
}

export function paddleConfigured(): boolean {
  const { token, priceId } = config()
  return Boolean(token && priceId)
}

function loadPaddleScript(): Promise<void> {
  if (window.Paddle) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Paddle.js'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

export async function openCheckout(opts?: {
  successUrl?: string
  onEvent?: (e: unknown) => void
}): Promise<CheckoutResult> {
  const { token, priceId, env } = config()
  if (!token || !priceId) {
    return {
      mode: 'placeholder',
      reason:
        'Set VITE_PADDLE_CLIENT_TOKEN and VITE_PADDLE_PRICE_ID, then rebuild. Sandbox tokens are fine for preview.',
    }
  }

  await loadPaddleScript()
  if (!window.Paddle) {
    return { mode: 'placeholder', reason: 'Paddle.js did not initialize.' }
  }

  window.Paddle.Environment.set(env)
  window.Paddle.Initialize({
    token,
    eventCallback: opts?.onEvent,
  })
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      successUrl: opts?.successUrl || `${window.location.origin}/learn?unlocked=1`,
    },
  })
  return { mode: 'paddle', opened: true }
}
