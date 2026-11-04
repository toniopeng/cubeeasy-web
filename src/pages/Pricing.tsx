import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Paywall } from '../components/Paywall'
import { FREE_RUNS, LIFETIME_PRICE_LABEL } from '../data/course'
import { loadEntitlement, unlockLifetime } from '../lib/entitlement'

export function Pricing() {
  const [open, setOpen] = useState(false)
  const ent = loadEntitlement()

  return (
    <div className="page narrow">
      <p className="eyebrow">Pricing</p>
      <h1>Simple Lifetime unlock</h1>
      <p className="lead">
        {FREE_RUNS} full course runs free. Then one payment — no subscription for the MVP.
      </p>

      <div className="price-card">
        <div className="paywall-badge">Best for beginners</div>
        <h2>Lifetime</h2>
        <div className="price-row">
          <span className="price">{LIFETIME_PRICE_LABEL}</span>
          <span className="muted">USD · one-time</span>
        </div>
        <ul className="checklist">
          <li>Unlimited beginner course runs</li>
          <li>All 7 steps with Play cycles</li>
          <li>Web access on phone & desktop</li>
          <li>Checkout via Paddle (Merchant of Record)</li>
        </ul>
        {ent.isLifetime ? (
          <Link className="btn btn-primary btn-block" to="/learn">
            You’re unlocked — open course
          </Link>
        ) : (
          <button className="btn btn-primary btn-block" onClick={() => setOpen(true)}>
            Unlock Lifetime
          </button>
        )}
        <p className="fine">iOS app Lifetime is $4.99 in the App Store (separate purchase).</p>
      </div>

      <Paywall
        open={open}
        onClose={() => setOpen(false)}
        onUnlockDemo={() => {
          unlockLifetime(loadEntitlement())
          setOpen(false)
          window.location.href = '/learn?unlocked=1'
        }}
      />
    </div>
  )
}
