import { Link } from 'react-router-dom'
import { CubeVisual } from '../components/CubeVisual'
import { COURSE_STEPS, FREE_RUNS, LIFETIME_PRICE_LABEL } from '../data/course'

export function Home() {
  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Beginner 3×3 tutor</p>
          <h1>Learn to solve a cube in 7 clear steps</h1>
          <p className="lead">
            CubeEasy walks you through a full beginner course with Play cycles for each
            formula — the same pedagogy as the iOS app. Try {FREE_RUNS} free runs, then
            unlock Lifetime for {LIFETIME_PRICE_LABEL}.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-primary" to="/learn">
              Start free
            </Link>
            <Link className="btn btn-ghost" to="/pricing">
              See Lifetime
            </Link>
          </div>
          <p className="fine">No account required for free runs · Brand-safe beginner method</p>
        </div>
        <div className="hero-visual">
          <CubeVisual pulse />
        </div>
      </section>

      <section className="section">
        <h2>Seven steps to your first solve</h2>
        <div className="step-grid">
          {COURSE_STEPS.map((s) => (
            <article key={s.id} className="step-card">
              <div className="step-num" style={{ borderColor: s.color }}>
                {s.id}
              </div>
              <h3>{s.title}</h3>
              <p>{s.goal}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section cta-band">
        <div>
          <h2>Built for TikTok → first solve</h2>
          <p className="lead">
            Land from a short, start the course in one tap, finish two free runs, then
            Lifetime if you want unlimited practice.
          </p>
        </div>
        <Link className="btn btn-primary" to="/learn">
          Open the course
        </Link>
      </section>
    </div>
  )
}
