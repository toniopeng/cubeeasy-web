import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Paywall } from '../components/Paywall'
import { FormulasSheet } from '../components/FormulasSheet'
import { COLORS, type Face, type Move, moveNotation, parseMoves } from '../cube/model'
import { CubeViewport } from '../cube/viewport'
import { LessonCoach, type Cheer, type CoachSnapshot, type MiddleSlide } from '../lesson/coach'
import {
  FormulaIcon,
  LayerGlyph,
  MiddleSlideCard,
  PlaceCornersPattern,
  StepPreviewMini,
  YellowPatternRow,
} from '../lesson/patterns'
import {
  abandonRun,
  beginRun,
  finishRun,
  loadEntitlement,
  unlockLifetime,
  type EntitlementState,
} from '../lib/entitlement'
import { LIFETIME_PRICE_LABEL } from '../data/course'

const MOVE_TOKENS = ["U", "U'", "R", "R'", "L", "L'", "F", "F'", "D", "D'"] as const

function chipBg(face: Face) {
  return COLORS[face]
}
function chipInk(face: Face) {
  return face === 'L' || face === 'B' ? '#fff' : COLORS.ink
}

const CHEER_COLORS = [COLORS.U, COLORS.D, COLORS.F, COLORS.R, COLORS.L, COLORS.B]

function CheerBurst({ kind, id }: { kind: Exclude<Cheer, 'none'>; id: number }) {
  const count = kind === 'solved' ? 70 : kind === 'step' ? 46 : 30
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = (i * 47 + id * 13) % 100
    const delay = ((i * 17) % 28) / 100
    const dur = (kind === 'solved' ? 1.7 : kind === 'step' ? 1.45 : 1.2) + ((i * 13) % 12) / 25
    const rot = ((i * 53) % 360) - 180
    const drift = ((i * 17 + id) % 21) - 10
    const size = (kind === 'piece' ? 7 : 8) + (i % 5)
    return {
      left,
      delay,
      dur,
      rot,
      drift: drift * (kind === 'solved' ? 14 : 10),
      color: CHEER_COLORS[i % CHEER_COLORS.length],
      round: i % 3 === 0,
      size,
    }
  })
  return (
    <div className={`cheer cheer-${kind}`} aria-hidden>
      <span className="popper popper-l">🎉</span>
      <span className="popper popper-r">🎉</span>
      {kind !== 'piece' && <span className="popper popper-c">🎉</span>}
      {pieces.map((p, i) => (
        <span
          key={`${id}-${i}`}
          className="confetti"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.round ? p.size : Math.round(p.size * 1.7),
            borderRadius: p.round ? 999 : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ['--drift' as string]: `${p.drift}px`,
            ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}

const IDLE: CoachSnapshot = {
  step: 0,
  playFace: { kind: 'play' },
  advance: 'start',
  crossCase: null,
  crossUps: [],
  showCrossCards: false,
  middleSlide: null,
  showMiddleSlides: false,
  showSideGhost: false,
  matchedSideFaces: [],
  showCornerCycle: false,
  practiceOrbit: true,
  inputLocked: false,
  caption: '',
  algActing: false,
  celebrating: false,
  cheer: 'none',
  cheerID: 0,
  padUnlocked: true,
  speed: 'fast',
  speedTitle: 'Fast',
  playWillAct: true,
}

/**
 * One-page LessonScreen — wired to LessonCoach (iOS teaching-v51 port).
 */
export function Learn() {
  const [params] = useSearchParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vpRef = useRef<CubeViewport | null>(null)
  const coachRef = useRef<LessonCoach | null>(null)

  const [ent, setEnt] = useState<EntitlementState>(() => loadEntitlement())
  const [snap, setSnap] = useState<CoachSnapshot>(IDLE)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showFormulas, setShowFormulas] = useState(false)
  const [pendingStep, setPendingStep] = useState<number | null>(null)
  const [titleIn, setTitleIn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const vp = new CubeViewport(canvas)
    const coach = new LessonCoach(vp)
    vpRef.current = vp
    coachRef.current = coach
    setSnap(coach.snapshot())
    const unsub = coach.subscribe(() => setSnap(coach.snapshot()))
    const ro = new ResizeObserver(() => vp.resize())
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    requestAnimationFrame(() => setTitleIn(true))
    return () => {
      unsub()
      ro.disconnect()
      coach.stopGuidance()
      vp.dispose()
      vpRef.current = null
      coachRef.current = null
    }
  }, [])

  useEffect(() => {
    if (params.get('unlocked') === '1' && !ent.isLifetime) {
      setEnt(unlockLifetime(ent))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Course finish when celebrating solved after step 7
  useEffect(() => {
    if (snap.celebrating && snap.step === 0) {
      setEnt((e) => finishRun(e))
    }
  }, [snap.celebrating, snap.step])

  function begin(target: number) {
    const coach = coachRef.current
    if (!coach) return
    const restart = target === 1 && snap.step > 1
    const newRun = !ent.runInProgress || restart
    if (!ent.isLifetime && newRun && ent.startedRuns >= 2) {
      setPendingStep(target)
      setShowPaywall(true)
      return
    }
    let nextEnt = ent
    if (!ent.isLifetime && newRun) {
      if (restart) nextEnt = abandonRun(ent)
      nextEnt = beginRun(nextEnt)
      setEnt(nextEnt)
    }
    setPendingStep(null)
    coach.start(target)
  }

  function onAdvance() {
    const coach = coachRef.current
    if (!coach) return
    if (snap.step === 0) {
      begin(1)
      return
    }
    coach.tapPlay()
  }

  function onReset() {
    coachRef.current?.resetCube()
  }

  async function onPad(token: string) {
    if (!snap.padUnlocked) return
    const move = parseMoves(token)[0]
    if (!move) return
    await vpRef.current?.userTurn(move)
  }

  function cycleSpeed() {
    coachRef.current?.cycleSpeed()
  }

  const minimapStep = snap.step >= 1 && snap.step <= 7 ? snap.step : 0
  const formulaMoves =
    snap.playFace.kind === 'formula' && snap.step !== 1 ? snap.playFace.moves : ([] as Move[])
  const activeMove = snap.playFace.kind === 'formula' ? snap.playFace.active : null
  const showFormulaStrip = formulaMoves.length > 1
  const playDisabled = snap.inputLocked || (snap.step > 0 && !snap.playWillAct)

  function layerSelected(layers: number) {
    if (layers === 1) return snap.step === 2
    if (layers === 2) return snap.step === 3
    return snap.step >= 4 && snap.step <= 7
  }

  const middleActive: MiddleSlide | null = snap.middleSlide

  return (
    <div className="lesson">
      <div className="studio-bg" aria-hidden />
      <div className="lesson-col">
        <div className="viewport-wrap">
          <canvas ref={canvasRef} className="cube-canvas" />
          {snap.cheer !== 'none' && (
            <CheerBurst key={snap.cheerID} kind={snap.cheer} id={snap.cheerID} />
          )}
          {minimapStep > 0 && (
            <div className="overlay-tl">
              <StepPreviewMini step={minimapStep} side={92} />
            </div>
          )}
          {(snap.showCrossCards || snap.showMiddleSlides || snap.showCornerCycle) && (
            <div className="overlay-bl">
              {snap.showCrossCards && <YellowPatternRow active={(snap.crossCase === 'dot' || snap.crossCase === 'L' || snap.crossCase === 'line') ? snap.crossCase : undefined} />}
              {snap.showMiddleSlides && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MiddleSlideCard slide="right" active={middleActive === 'left'} />
                  <MiddleSlideCard slide="left" active={middleActive === 'right'} />
                </div>
              )}
              {snap.showCornerCycle && <PlaceCornersPattern side={68} />}
            </div>
          )}
          <div className="overlay-br">
            <button
              className={`layer-btn ${layerSelected(1) ? 'on' : ''}`}
              onClick={() => begin(2)}
              aria-label="Bottom layer"
            >
              <LayerGlyph layers={1} />
            </button>
            <button
              className={`layer-btn ${layerSelected(2) ? 'on' : ''}`}
              onClick={() => begin(3)}
              aria-label="Middle layer"
            >
              <LayerGlyph layers={2} />
            </button>
            <button
              className={`layer-btn ${layerSelected(3) ? 'on' : ''}`}
              onClick={() => begin(4)}
              aria-label="Last layer"
            >
              <LayerGlyph layers={3} />
            </button>
          </div>
          <div className="overlay-tr">
            <div className={`brand-capsule ${titleIn ? 'in' : ''}`}>CubeEasy</div>
            <button className="formulas-btn" onClick={() => setShowFormulas(true)} aria-label="Formulas">
              <FormulaIcon />
            </button>
          </div>
          {snap.caption && snap.playFace.kind !== 'formula' && !snap.algActing ? (
            <div className="caption-pill">{snap.caption}</div>
          ) : null}
        </div>

        <div className="advance-block">
          <button
            className="advance-btn"
            disabled={playDisabled}
            onClick={onAdvance}
            aria-label={snap.step === 0 ? 'Start' : 'Play'}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <div className="formula-strip-slot">
            {showFormulaStrip && (
              <div className="formula-strip">
                {formulaMoves.map((m, i) => {
                  const on = i === activeMove
                  return (
                    <span
                      key={i}
                      className={`fchip ${on ? 'on' : ''}`}
                      style={{
                        background: chipBg(m.face),
                        color: chipInk(m.face),
                        fontSize: on ? 22 : 15,
                        opacity: on ? 1 : 0.78,
                      }}
                    >
                      {moveNotation(m)}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="utility-row">
          <button
            className="util-btn util-speed"
            onClick={cycleSpeed}
            aria-label={`Speed, ${snap.speedTitle}`}
          >
            {snap.speedTitle}
          </button>
          <button className="util-btn util-reset" onClick={onReset}>
            Reset
          </button>
        </div>

        <div className="move-pad">
          {MOVE_TOKENS.map((t) => (
            <button
              key={t}
              className="pad-btn"
              disabled={!snap.padUnlocked}
              style={{ opacity: snap.padUnlocked ? 1 : 0.38 }}
              onClick={() => onPad(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          className="lifetime-link"
          disabled={ent.isLifetime}
          onClick={() => {
            if (!ent.isLifetime) setShowPaywall(true)
          }}
        >
          {ent.isLifetime ? 'Unlocked' : `Lifetime · ${LIFETIME_PRICE_LABEL}`}
        </button>
      </div>

      <Paywall
        open={showPaywall}
        onClose={() => {
          setShowPaywall(false)
          if (ent.isLifetime && pendingStep != null) {
            const s = pendingStep
            setPendingStep(null)
            coachRef.current?.start(s)
          }
        }}
        onUnlockDemo={() => {
          const next = unlockLifetime(ent)
          setEnt(next)
          setShowPaywall(false)
          if (pendingStep != null) {
            const s = pendingStep
            setPendingStep(null)
            coachRef.current?.start(s)
          }
        }}
      />
      <FormulasSheet open={showFormulas} onClose={() => setShowFormulas(false)} />
    </div>
  )
}
