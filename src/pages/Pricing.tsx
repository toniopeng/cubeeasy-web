import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Paywall } from '../components/Paywall'
import { FREE_RUNS, LIFETIME_PRICE_LABEL } from '../data/course'
import { loadEntitlement, unlockLifetime } from '../lib/entitlement'

export function Pricing() {
  const [open, setOpen] = useState(false)
  const ent = loadEntitlement()

  return (
    <div className="page">
      <p className="muted">Pricing</p>
      <h1>Lifetime unlock</h1>
      <p>
        {FREE_RUNS} full course runs free. Then one payment — no subscription.
      </p>
      <p style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>{LIFETIME_PRICE_LABEL}</p>
      <p className="muted">USD · one-time via Paddle</p>
      <ul>
        <li>Unlimited beginner course runs</li>
        <li>All 7 steps with Play cycles</li>
        <li>Web on phone & desktop</li>
      </ul>
      {ent.isLifetime ? (
        <Link className="btn btn-primary" to="/">Open course</Link>
      ) : (
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          Unlock Lifetime
        </button>
      )}
      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        iOS app Lifetime is $4.99 in the App Store (separate purchase).
      </p>
      <Paywall
        open={open}
        onClose={() => setOpen(false)}
        onUnlockDemo={() => {
          unlockLifetime(loadEntitlement())
          setOpen(false)
          window.location.assign(`${import.meta.env.BASE_URL}?unlocked=1`)
        }}
      />
    </div>
  )
}
