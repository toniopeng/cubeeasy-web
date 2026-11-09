import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Paywall } from '../components/Paywall'
import { FREE_RUNS, LIFETIME_PRICE_LABEL } from '../data/course'
import { loadEntitlement, unlockLifetime } from '../lib/entitlement'
import { paddleConfigured } from '../lib/paddle'
import { pageDescription, pageTitle } from '../seo/content'
import { usePageMeta } from '../seo/usePageMeta'

export function Pricing() {
  usePageMeta('/pricing', pageTitle('/pricing'), pageDescription('/pricing'))
  const [params] = useSearchParams()
  const [open, setOpen] = useState(false)
  const ent = loadEntitlement()
  const sandbox = params.get('sandbox') === '1'
  const allowSimulate = sandbox && !paddleConfigured()

  return (
    <div className="page">
      <p className="muted">Pricing</p>
      <h1>Lifetime unlock</h1>
      <p>
        {FREE_RUNS} finished course free. Then one payment — no subscription.
      </p>
      <p style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>{LIFETIME_PRICE_LABEL}</p>
      <p className="muted">USD · one-time via Paddle</p>
      <ul>
        <li>Unlimited beginner course runs</li>
        <li>All 7 steps with Play cycles</li>
        <li>Web on phone and desktop</li>
      </ul>
      <p>
        <Link to="/guide">Read the 7-step method</Link> before you start, or open the tutor and press Play.
      </p>
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
        allowSimulate={allowSimulate}
        onClose={() => setOpen(false)}
        onUnlocked={() => {
          unlockLifetime(loadEntitlement())
          setOpen(false)
        }}
      />
    </div>
  )
}
