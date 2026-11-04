import { useState } from 'react'
import { LIFETIME_PRICE_LABEL, PRODUCT_NAME, FREE_RUNS } from '../data/course'
import { openCheckout, paddleConfigured } from '../lib/paddle'

type Props = {
  open: boolean
  onClose: () => void
  onUnlockDemo: () => void
}

export function Paywall({ open, onClose, onUnlockDemo }: Props) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const configured = paddleConfigured()

  if (!open) return null

  async function checkout() {
    setBusy(true)
    setNote(null)
    try {
      const result = await openCheckout({
        onEvent: (e) => {
          const ev = e as { name?: string }
          if (ev?.name === 'checkout.completed') onUnlockDemo()
        },
      })
      if (result.mode === 'placeholder') {
        setNote(result.reason)
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="modal paywall">
        <button className="modal-x" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="paywall-badge">Lifetime</div>
        <h2 id="paywall-title">{PRODUCT_NAME}</h2>
        <p className="lead">
          You used your {FREE_RUNS} free course runs. Unlock unlimited practice forever —
          same 7-step method, no subscription.
        </p>
        <div className="price-row">
          <span className="price">{LIFETIME_PRICE_LABEL}</span>
          <span className="muted">one-time · via Paddle</span>
        </div>
        <ul className="checklist">
          <li>Unlimited course runs</li>
          <li>All 7 beginner steps + Play cycles</li>
          <li>Works on phone & desktop</li>
          <li>No monthly fee</li>
        </ul>
        <button className="btn btn-primary btn-block" disabled={busy} onClick={checkout}>
          {busy ? 'Opening checkout…' : configured ? `Checkout — ${LIFETIME_PRICE_LABEL}` : `Checkout — ${LIFETIME_PRICE_LABEL} (sandbox)`}
        </button>
        {!configured && (
          <div className="sandbox-box">
            <strong>Paddle sandbox placeholder</strong>
            <p>
              Live Overlay needs <code>VITE_PADDLE_CLIENT_TOKEN</code> +{' '}
              <code>VITE_PADDLE_PRICE_ID</code>. For this preview you can simulate unlock:
            </p>
            <button className="btn btn-ghost btn-block" onClick={onUnlockDemo}>
              Simulate successful purchase
            </button>
          </div>
        )}
        {note && <p className="note">{note}</p>}
        <button className="linkish" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  )
}
