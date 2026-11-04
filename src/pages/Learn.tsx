import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CubeVisual } from '../components/CubeVisual'
import { Paywall } from '../components/Paywall'
import { COURSE_STEPS } from '../data/course'
import {
  canStartRun,
  freeRunsRemaining,
  loadEntitlement,
  markRunCompleted,
  unlockLifetime,
  type EntitlementState,
} from '../lib/entitlement'

export function Learn() {
  const [params] = useSearchParams()
  const [ent, setEnt] = useState<EntitlementState>(() => loadEntitlement())
  const [stepIdx, setStepIdx] = useState(0)
  const [playCount, setPlayCount] = useState(0)
  const [inRun, setInRun] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const step = COURSE_STEPS[stepIdx]
  const remaining = freeRunsRemaining(ent)

  useEffect(() => {
    if (params.get('unlocked') === '1' && !ent.isLifetime) {
      setEnt(unlockLifetime(ent))
      setFlash('Lifetime unlocked — unlimited runs.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statusLine = useMemo(() => {
    if (ent.isLifetime) return 'Lifetime · unlimited runs'
    if (remaining === Infinity) return 'Lifetime'
    return `${remaining} free run${remaining === 1 ? '' : 's'} left`
  }, [ent.isLifetime, remaining])

  function startRun() {
    if (!canStartRun(ent)) {
      setPaywall(true)
      return
    }
    setInRun(true)
    setStepIdx(0)
    setPlayCount(0)
    setFlash(null)
  }

  function playFormula() {
    setPlayCount((n) => n + 1)
    setFlash(`Played: ${step.algorithm}`)
  }

  function markStepOk() {
    if (stepIdx < COURSE_STEPS.length - 1) {
      setStepIdx((i) => i + 1)
      setPlayCount(0)
      setFlash(null)
      return
    }
    // Finished a full course run
    const next = markRunCompleted(ent)
    setEnt(next)
    setInRun(false)
    setFlash('Course run complete. Nice work.')
    if (!next.isLifetime && !canStartRun(next)) {
      setPaywall(true)
    }
  }

  function onUnlock() {
    setEnt(unlockLifetime(ent))
    setPaywall(false)
    setFlash('Lifetime unlocked. Start another run anytime.')
  }

  return (
    <div className="page learn">
      <div className="learn-header">
        <div>
          <p className="eyebrow">Course player</p>
          <h1>Beginner 3×3</h1>
          <p className="muted">{statusLine}</p>
        </div>
        <div className="learn-actions">
          {!inRun ? (
            <button className="btn btn-primary" onClick={startRun}>
              {ent.completedRuns > 0 ? 'Start another run' : 'Start course run'}
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setInRun(false)}>
              Exit run
            </button>
          )}
          {!ent.isLifetime && (
            <button className="btn btn-ghost" onClick={() => setPaywall(true)}>
              Lifetime
            </button>
          )}
        </div>
      </div>

      {flash && <div className="toast">{flash}</div>}

      {!inRun ? (
        <div className="idle-panel">
          <CubeVisual />
          <div>
            <h2>Ready when you are</h2>
            <p className="lead">
              A run walks all 7 steps. Use <strong>Play</strong> for one formula cycle,
              then <strong>OK — next</strong> when that step looks right on your cube.
            </p>
            {!canStartRun(ent) && (
              <p className="warn">Free runs used up — Lifetime unlocks unlimited practice.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="player">
          <aside className="step-rail" aria-label="Steps">
            {COURSE_STEPS.map((s, i) => (
              <button
                key={s.id}
                className={`rail-item ${i === stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`}
                onClick={() => {
                  setStepIdx(i)
                  setPlayCount(0)
                }}
              >
                <span>{s.id}</span>
                {s.title}
              </button>
            ))}
          </aside>

          <section className="player-main">
            <div className="player-visual">
              <CubeVisual accent={step.color} pulse={playCount > 0} />
              <div className="progress">
                Step {step.id} / {COURSE_STEPS.length}
                {playCount > 0 ? ` · ${playCount} play${playCount === 1 ? '' : 's'}` : ''}
              </div>
            </div>
            <div className="player-copy">
              <h2>{step.title}</h2>
              <p className="lead">{step.goal}</p>
              <div className="alg-box">
                <span className="label">Formula</span>
                <code>{step.algorithm}</code>
              </div>
              <p>
                <strong>Tip:</strong> {step.tip}
              </p>
              <p className="muted">{step.playHint}</p>
              <div className="player-cta">
                <button className="btn btn-primary" onClick={playFormula}>
                  Play
                </button>
                <button className="btn btn-ghost" onClick={markStepOk}>
                  {stepIdx === COURSE_STEPS.length - 1 ? 'Finish run' : 'OK — next'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <Paywall open={paywall} onClose={() => setPaywall(false)} onUnlockDemo={onUnlock} />
    </div>
  )
}
