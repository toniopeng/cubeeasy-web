export function Support() {
  return (
    <div className="page narrow">
      <p className="eyebrow">Support</p>
      <h1>We’re here to help</h1>
      <p className="lead">
        CubeEasy web is a beginner tutor for the classic 3×3. Free runs are stored in this
        browser; Lifetime unlocks unlimited practice after Paddle checkout.
      </p>
      <div className="card-stack">
        <article className="card">
          <h3>Email</h3>
          <p>
            <a href="mailto:tonypengcom@126.com">tonypengcom@126.com</a>
          </p>
        </article>
        <article className="card">
          <h3>Free runs not resetting?</h3>
          <p>
            Entitlement lives in <code>localStorage</code> for this preview. Clearing site
            data resets free runs. After real Paddle webhooks, unlocks will follow your
            purchase email.
          </p>
        </article>
        <article className="card">
          <h3>iOS app</h3>
          <p>
            Looking for the App Store version? Search <strong>CubeEasy</strong> — Lifetime
            there is a separate IAP.
          </p>
        </article>
      </div>
    </div>
  )
}
