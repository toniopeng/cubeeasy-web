import { Link } from 'react-router-dom'
import { pageDescription, pageTitle } from '../seo/content'
import { usePageMeta } from '../seo/usePageMeta'

export const CONTACT_EMAIL = 'taopeng46@gmail.com'
const UPDATED = '2026-11-05 (Asia/Shanghai)'

function PolicyLinks() {
  return (
    <p>
      <Link to="/privacy">Privacy</Link>
      {' · '}
      <Link to="/terms">Terms</Link>
      {' · '}
      <Link to="/copyright">Copyright</Link>
      {' · '}
      <Link to="/support">Support</Link>
    </p>
  )
}

export function Privacy() {
  usePageMeta('/privacy', pageTitle('/privacy'), pageDescription('/privacy'))
  return (
    <div className="page narrow legal">
      <h1>Privacy</h1>
      <p className="muted">Last updated: {UPDATED}</p>
      <p>
        CubeEasy is the web tutor at{' '}
        <a href="https://cubeeasy.app">cubeeasy.app</a> (and{' '}
        <a href="https://www.cubeeasy.app">www.cubeeasy.app</a>). It is made by PENG TAO
        (Tony Peng). This page describes what the website keeps, and who handles a purchase.
      </p>

      <h2>What stays on this device</h2>
      <p>You do not need an account.</p>
      <p>
        The free course, and a Lifetime unlock if you have one on this browser, are saved
        only in this browser’s <code>localStorage</code> under the key <code>cubeeasy.web.v2</code>.
        The free course counts when you finish it, not when you start or press Reset. If an older
        key, <code>cubeeasy.web.v1</code>, is still present, the site reads it once. That
        information stays on your device. CubeEasy does not run an account server, and a private
        window or another browser is a separate copy. We cannot tell that it is the same person.
      </p>

      <h2>How to clear it</h2>
      <p>
        In your browser settings, clear site data for cubeeasy.app. You can also delete the
        keys <code>cubeeasy.web.v2</code> and <code>cubeeasy.web.v1</code>. Clearing site data
        removes the free-course record and any Lifetime flag stored on that browser. It does not
        cancel a payment. Keep the Paddle receipt if you later need the unlock on this device.
      </p>

      <h2>Analytics</h2>
      <p>
        The site loads Cloudflare Web Analytics. The beacon does not set a cookie and does not
        write to <code>localStorage</code>. Cloudflare Web Analytics is not an advertising
        product, and we do not use it to follow you across other websites or to build an ad
        profile.
      </p>
      <p>
        The beacon sends a page view for pages you open on this site, plus general information
        such as the referring page, browser type, and country. We use those aggregate numbers
        to see that the tutor is loading. We do not sell them.
      </p>

      <h2>Purchases</h2>
      <p>
        Lifetime checkout is sold by <strong>Paddle as Merchant of Record</strong>. Paddle, not
        PENG TAO, is the seller on the payment: the charge, tax, invoice, and buyer support for
        the sale. Paddle collects the billing details it needs (such as email, payment method,
        and billing country). We do not receive or store your full card number. We may receive
        a confirmation that this browser can unlock Lifetime.
      </p>
      <p>
        Paddle’s privacy notice:{' '}
        <a href="https://www.paddle.com/legal/privacy">paddle.com/legal/privacy</a>.
      </p>

      <h2>We do not sell personal data</h2>
      <p>
        We do not sell, rent, or trade personal information. The tutor has no ads and no
        subscription.
      </p>

      <h2>Learners, including children</h2>
      <p>
        The tutor is for people learning a first solve, including children. A purchase should
        be made by an adult. We do not ask learners to create an account or to send us their
        name. Free-run progress stays in the browser on the device they are using.
      </p>

      <h2>The iOS app is separate</h2>
      <p>
        The CubeEasy iOS app is a different product. Its purchase is Apple in-app purchase.
        This notice covers the website only. Web Lifetime does not unlock the app, and an App
        Store purchase does not unlock the website.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <PolicyLinks />
    </div>
  )
}

export function Terms() {
  usePageMeta('/terms', pageTitle('/terms'), pageDescription('/terms'))
  return (
    <div className="page narrow legal">
      <h1>Terms</h1>
      <p className="muted">Last updated: {UPDATED}</p>
      <p>
        These terms cover the CubeEasy website at{' '}
        <a href="https://cubeeasy.app">cubeeasy.app</a>, offered by PENG TAO (Tony Peng), an
        independent developer in China. They are plain-language terms for a digital tutor sold
        worldwide through Paddle. They are not a law-firm opinion. If a consumer rule where you
        live cannot be waived, that rule still applies.
      </p>

      <h2>The tutor</h2>
      <p>
        CubeEasy coaches a 7-step layer method for a classic 3×3 cube. It is a learning aid.
        It does not promise a finish time, a competition result, or that every scramble you
        invent will match a formula on the first try.
      </p>

      <h2>License</h2>
      <p>
        We give you a personal, non-exclusive license to use the website for your own learning.
        You may not copy the course, software, or teaching text to resell it, publish it as your
        own method, or run another product from our materials. Do not attack the site or try to
        unlock Lifetime without paying.
      </p>

      <h2>Free runs</h2>
      <p>
        One full course is free in a browser. No account is required. It counts when you finish
        that course, not when you start it or press Reset. The record is stored only in that
        browser under the <code>localStorage</code> key <code>cubeeasy.web.v2</code>. A private
        window does not share it. Free use is not a balance we keep on a server.
      </p>

      <h2>Lifetime</h2>
      <p>
        After that free course, Lifetime is a one-time purchase of <strong>US $9.99</strong> for
        this website. It is a digital good: not a physical cube, and not a subscription. There
        are no ads. Lifetime applies to the web tutor on the browser where the purchase is
        honored.
      </p>
      <p>
        The CubeEasy iOS app is a separate product and a separate Apple in-app purchase. Web
        Lifetime does not unlock the iOS app. An App Store purchase does not unlock this website.
      </p>

      <h2>Who you pay</h2>
      <p>
        Checkout is sold by <strong>Paddle as Merchant of Record</strong>. The charge, invoice,
        tax, and payment support run through Paddle. Paddle’s buyer terms cover the sale:{' '}
        <a href="https://www.paddle.com/legal/checkout-buyer-terms">
          paddle.com/legal/checkout-buyer-terms
        </a>
        .
      </p>

      <h2>Refunds</h2>
      <p>
        Refund requests for Lifetime follow Paddle’s buyer policies, because Paddle is the
        seller of record. Use the receipt Paddle emails you, or Paddle’s buyer support. You
        can also write to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will help you send the
        request to the right place. We do not promise a refund outside those policies.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Use the tutor to learn. Do not disrupt the site, copy the course to republish it, or
        use the CubeEasy name so that people think we made your product.
      </p>

      <h2>Our content</h2>
      <p>
        The CubeEasy software, lesson text, and site copy are owned by PENG TAO. © 2026 PENG
        TAO. Details are on the <Link to="/copyright">Copyright</Link> page.
      </p>

      <h2>Trademarks</h2>
      <p>
        CubeEasy is an independent educational tutor. It is not affiliated with, endorsed by,
        or sponsored by Rubik’s Brand Ltd. or any other owner of trademarks in the classic cube
        puzzle. Those names and marks belong to their owners. “CubeEasy” is our product name.
        We describe the puzzle as a classic 3×3 cube.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, PENG TAO is not liable for indirect loss, such as lost
        practice time or a contest you entered on your own. If we are liable for something
        directly related to this website, that amount is limited to what you paid for web
        Lifetime (US $9.99), or nothing if you only used the free course. This limit does not
        apply where the law where you live says it cannot.
      </p>

      <h2>Which law</h2>
      <p>
        PENG TAO is an individual in China offering this website to people in many countries,
        with payment handled by Paddle. Questions about these terms, between you and PENG TAO,
        are read under the laws of the People’s Republic of China. The payment contract is with
        Paddle, under Paddle’s terms. Nothing here says a bar association reviewed this page.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <PolicyLinks />
    </div>
  )
}

export function Copyright() {
  usePageMeta('/copyright', pageTitle('/copyright'), pageDescription('/copyright'))
  return (
    <div className="page narrow legal">
      <h1>Copyright</h1>
      <p className="muted">Last updated: {UPDATED}</p>
      <p>
        <strong>© 2026 PENG TAO · CubeEasy</strong>
      </p>
      <p>
        PENG TAO (Tony Peng) owns the copyright in the CubeEasy website: the software, the
        lesson sequence, the coaching text, the graphics we made, and the wording of these
        pages. The product is published as CubeEasy.
      </p>
      <p>
        You may use the tutor for your own learning, as the <Link to="/terms">Terms</Link>{' '}
        describe. You may not copy the course or the code to sell, or present our materials as
        your own.
      </p>

      <h2>Trademarks</h2>
      <p>
        CubeEasy is not affiliated with Rubik’s Brand Ltd. or with other owners of classic-cube
        trademarks. Those marks stay with their owners. This notice uses the owner’s name only
        so that separation is clear. Marketing pages describe the puzzle as a classic 3×3 cube.
      </p>

      <h2>Other work on the page</h2>
      <p>
        The site is built with web tools, including React and Three.js, under their own
        licenses. Paddle provides checkout as Merchant of Record. Cloudflare provides the
        cookieless analytics beacon. Those companies keep their own copyrights and marks.
      </p>

      <h2>Contact</h2>
      <p>
        Copyright questions:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <PolicyLinks />
    </div>
  )
}
