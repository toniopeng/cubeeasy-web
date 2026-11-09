import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from './Legal'
import { pageDescription, pageTitle } from '../seo/content'
import { usePageMeta } from '../seo/usePageMeta'

export function Support() {
  usePageMeta('/support', pageTitle('/support'), pageDescription('/support'))
  return (
    <div className="page narrow legal">
      <p className="muted">Support</p>
      <h1>We’re here to help</h1>
      <p>
        CubeEasy on the web is a beginner tutor for a classic 3×3 cube. One full course is
        free in this browser, and it counts when you finish it. Lifetime is a one-time unlock
        of US $9.99, with no subscription and no ads.
      </p>

      <h2>Email</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <p className="muted">PENG TAO (Tony Peng). This is the contact for the website.</p>

      <h2>Purchases and restore</h2>
      <p>
        Web Lifetime is sold by <strong>Paddle as Merchant of Record</strong>. The receipt,
        tax, and payment support come from Paddle. If you paid and this browser still shows
        the free-run limit, email us with that Paddle receipt and we will help restore
        Lifetime on this device.
      </p>
      <p>
        Refunds follow Paddle’s buyer terms:{' '}
        <a href="https://www.paddle.com/legal/checkout-buyer-terms">
          paddle.com/legal/checkout-buyer-terms
        </a>
        . Write to us if you need help finding that request.
      </p>

      <h2>Free course</h2>
      <p>
        One finished course is stored only in this browser, in <code>localStorage</code> under{' '}
        <code>cubeeasy.web.v2</code>. Starting or Reset does not use it up. No account is
        required. A private window or cleared site data is a new copy of that record, because
        the site has no sign-in. Clearing site data also removes a Lifetime flag saved only on
        this device, so keep your Paddle receipt.
      </p>

      <h2>iOS app</h2>
      <p>
        The CubeEasy iOS app is a separate product. Its purchase is Apple in-app purchase.
        Lifetime on this website does not unlock the app, and an App Store purchase does not
        unlock the website.
      </p>

      <h2>Policies</h2>
      <p>
        <Link to="/privacy">Privacy</Link>
        {' · '}
        <Link to="/terms">Terms</Link>
        {' · '}
        <Link to="/copyright">Copyright</Link>
        {' · '}
        <Link to="/pricing">Pricing</Link>
      </p>
    </div>
  )
}
