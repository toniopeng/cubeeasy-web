import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Paywall } from '../components/Paywall'
import { FormulasSheet } from '../components/FormulasSheet'
import {
  COLORS,
  type Face,
  applyMoves,
  formulaForStep,
  moveNotation,
  type Move,
  parseMoves,
  preparedForStep,
  randomScramble,
} from '../cube/model'
import {
  CubeViewport,
  SPEED_LABEL,
  type TeachSpeed,
} from '../cube/viewport'
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

const SPEEDS: TeachSpeed[] = ['slow', 'normal', 'fast', 'faster']

type Phase = 'idle' | 'ready' | 'playing' | 'awaitOk'

function chipBg(face: Face) {
  return COLORS[face]
}
function chipInk(face: Face) {
  return face === 'L' || face === 'B' ? '#fff' : COLORS.ink
}

/**
 * One-page LessonScreen — layout + controls mirrored from iOS teaching-v51.
 * Teaching logic is a web-friendly Play/OK cycle (full SceneKit coach is approx.).
 */
export function Learn() {
  const [params] = useSearchParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vpRef = useRef<CubeViewport | null>(null)

  const [ent, setEnt] = useState<EntitlementState>(() => loadEntitlement())
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [speed, setSpeed] = useState<TeachSpeed>('fast')
  const [padUnlocked, setPadUnlocked] = useState(true)
  const [practiceOrbit, setPracticeOrbit] = useState(true)
  const [formulaMoves, setFormulaMoves] = useState<Move[]>([])
  const [activeMove, setActiveMove] = useState<number | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showFormulas, setShowFormulas] = useState(false)
  const [pendingStep, setPendingStep] = useState<number | null>(null)
  const [titleIn, setTitleIn] = useState(false)
  const [locked, setLocked] = useState(false)
  const [showCross, setShowCross] = useState(false)
  const [showMiddle, setShowMiddle] = useState(false)
  const [showCorners, setShowCorners] = useState(false)
  const [cheer, setCheer] = useState<'none' | 'piece' | 'step' | 'solved'>('none')

  // Mount viewport
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const vp = new CubeViewport(canvas)
    vpRef.current = vp
    const s = preparedForStep(1)
    applyMoves(s, randomScramble(12))
    vp.syncFromModel(s)
    vp.onSolved = () => {
      if (step === 0 && padUnlocked) burst('solved')
    }
    const ro = new ResizeObserver(() => vp.resize())
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    requestAnimationFrame(() => setTitleIn(true))
    return () => {
      ro.disconnect()
      vp.dispose()
      vpRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (params.get('unlocked') === '1' && !ent.isLifetime) {
      setEnt(unlockLifetime(ent))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const vp = vpRef.current
    if (!vp) return
    vp.teachSpeed = speed
    vp.practiceOrbit = practiceOrbit
  }, [speed, practiceOrbit])

  const burst = useCallback((level: 'piece' | 'step' | 'solved') => {
    setCheer(level)
    const ms = level === 'piece' ? 1500 : level === 'step' ? 1900 : 2600
    window.setTimeout(() => setCheer('none'), ms)
  }, [])

  function cycleSpeed() {
    setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])
  }

  function cuesFor(s: number) {
    setShowCross(s === 4)
    setShowMiddle(s === 3)
    setShowCorners(s === 6)
  }

  function begin(target: number) {
    const restart = target === 1 && step > 1
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
    startStep(target)
  }

  function startStep(target: number) {
    const vp = vpRef.current
    if (!vp) return
    setStep(target)
    setPadUnlocked(false)
    setPracticeOrbit(false)
    setPhase('ready')
    setLocked(false)
    setActiveMove(null)
    cuesFor(target)
    const state = preparedForStep(target)
    vp.restoreColors()
    vp.syncFromModel(state)
    vp.resetCamera()
    const moves = formulaForStep(target)
    setFormulaMoves(moves)
  }

  async function onAdvance() {
    if (locked) return
    if (step === 0) {
      begin(1)
      return
    }
    if (phase === 'ready') {
      // Play formula cycle
      const vp = vpRef.current
      if (!vp || formulaMoves.length === 0) return
      setLocked(true)
      setPhase('playing')
      try {
        await vp.animateMoves(formulaMoves, (i) => setActiveMove(i < 0 ? null : i))
        setActiveMove(null)
        setPhase('awaitOk')
        burst(step === 7 ? 'solved' : 'piece')
      } finally {
        setLocked(false)
      }
      return
    }
    if (phase === 'awaitOk') {
      if (step >= 7) {
        setEnt(finishRun(ent))
        burst('solved')
        setStep(0)
        setPhase('idle')
        setPadUnlocked(true)
        setPracticeOrbit(true)
        setFormulaMoves([])
        setShowCross(false)
        setShowMiddle(false)
        setShowCorners(false)
        cuesFor(0)
        return
      }
      startStep(step + 1)
    }
  }

  async function onReset() {
    const vp = vpRef.current
    if (!vp) return
    setStep(0)
    setPhase('idle')
    setFormulaMoves([])
    setActiveMove(null)
    setLocked(true)
    setPadUnlocked(false)
    setPracticeOrbit(false)
    setShowCross(false)
    setShowMiddle(false)
    setShowCorners(false)
    vp.restoreColors()
    const s = preparedForStep(1)
    applyMoves(s, randomScramble(8))
    vp.syncFromModel(s)
    for (const m of randomScramble(10)) {
      // eslint-disable-next-line no-await-in-loop
      await vp.animateMove(m)
    }
    setPadUnlocked(true)
    setPracticeOrbit(true)
    setLocked(false)
  }

  async function onPad(token: string) {
    if (!padUnlocked || locked) return
    const move = parseMoves(token)[0]
    if (!move) return
    await vpRef.current?.userTurn(move)
  }

  const minimapStep = step >= 1 && step <= 7 ? step : 0
  const showFormulaStrip = step !== 1 && formulaMoves.length > 1 && (phase === 'ready' || phase === 'playing' || phase === 'awaitOk')
  const playDisabled = locked || (step > 0 && phase === 'playing')

  function layerSelected(layers: number) {
    if (layers === 1) return step === 2
    if (layers === 2) return step === 3
    return step >= 4 && step <= 7
  }

  return (
    <div className="lesson">
      <div className="studio-bg" aria-hidden />
      <div className="lesson-col">
        <div className="viewport-wrap">
          <canvas ref={canvasRef} className="cube-canvas" />
          {cheer !== 'none' && <div className={`cheer cheer-${cheer}`} aria-hidden />}
          {minimapStep > 0 && (
            <div className="overlay-tl">
              <StepPreviewMini step={minimapStep} side={92} />
            </div>
          )}
          {(showCross || showMiddle || showCorners) && (
            <div className="overlay-bl">
              {showCross && <YellowPatternRow active="dot" />}
              {showMiddle && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MiddleSlideCard slide="right" active />
                  <MiddleSlideCard slide="left" />
                </div>
              )}
              {showCorners && <PlaceCornersPattern side={68} />}
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
        </div>

        <div className="advance-block">
          <button
            className="advance-btn"
            disabled={playDisabled}
            onClick={onAdvance}
            aria-label={phase === 'awaitOk' ? 'OK' : step === 0 ? 'Start' : 'Play'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
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
          <button className="util-btn" onClick={cycleSpeed} aria-label={`Speed, ${SPEED_LABEL[speed]}`}>
            {SPEED_LABEL[speed]}
          </button>
          <button className="util-btn" onClick={onReset}>
            Reset
          </button>
        </div>

        <div className="move-pad">
          {MOVE_TOKENS.map((t) => (
            <button
              key={t}
              className="pad-btn"
              disabled={!padUnlocked}
              style={{ opacity: padUnlocked ? 1 : 0.38 }}
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
            startStep(s)
          }
        }}
        onUnlockDemo={() => {
          const next = unlockLifetime(ent)
          setEnt(next)
          setShowPaywall(false)
          if (pendingStep != null) {
            const s = pendingStep
            setPendingStep(null)
            startStep(s)
          }
        }}
      />
      <FormulasSheet open={showFormulas} onClose={() => setShowFormulas(false)} />
    </div>
  )
}
