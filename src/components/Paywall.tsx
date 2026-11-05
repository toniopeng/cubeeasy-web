import { useState } from 'react'
import { LIFETIME_PRICE_LABEL } from '../data/course'
import { openCheckout } from '../lib/paddle'

type Props = {
  open: boolean
  onClose: () => void
  onUnlockDemo: () => void
  /** Only for ?sandbox=1. Production visitors must not get a free Lifetime button. */
  allowSimulate?: boolean
}

/** Matches iOS PaywallView: Unlock CubeEasy, yellow Unlock, Restore, Not now. */
export function Paywall({ open, onClose, onUnlockDemo, allowSimulate = false }: Props) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

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
    <div className="paywall-overlay" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="paywall-card">
        <div className="paywall-head">
          <h2 id="paywall-title">Unlock CubeEasy</h2>
          <button className="paywall-x" onClick={onClose} aria-label="Not now">
            ×
          </button>
        </div>
        <p className="paywall-body">
          Two free runs are done. Unlock the course of life. One purchase, no subscription, no ads.
        </p>
        <button className="paywall-unlock" disabled={busy} onClick={checkout}>
          {busy ? '…' : `Unlock · ${LIFETIME_PRICE_LABEL}`}
        </button>
        {allowSimulate && (
          <button className="paywall-restore" onClick={onUnlockDemo}>
            Simulate purchase (sandbox)
          </button>
        )}
        <button
          className="paywall-restore"
          onClick={() =>
            setNote('To restore Lifetime on this browser, email taopeng46@gmail.com with your Paddle receipt.')
          }
        >
          Restore Purchases
        </button>
        <button className="paywall-notnow" onClick={onClose}>
          Not now
        </button>
        {note && <p className="paywall-note">{note}</p>}
      </div>
    </div>
  )
}
