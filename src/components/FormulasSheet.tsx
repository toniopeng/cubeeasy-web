import { useEffect, useState } from 'react'
import { COLORS, type Face, moveNotation, type Move } from '../cube/model'
import { warmFormulaPoses } from '../cube/miniCube'
import { FORMULA_ROWS } from '../data/course'
import {
  LastFormulaCube,
  MiddleSlideCard,
  PlaceCornersPattern,
  StepPreviewMini,
  YellowPatternRow,
} from '../lesson/patterns'

function chipColor(face: Face) {
  return COLORS[face]
}
function chipInk(_face: Face) {
  return COLORS.ink
}

function FormulaChips({ moves }: { moves: Move[] }) {
  return (
    <div className="formula-chips sheet-chips">
      {moves.map((m, i) => (
        <span
          key={`${m.face}-${i}-${moveNotation(m)}`}
          className="fchip sheet-fchip"
          style={{ background: chipColor(m.face), color: chipInk(m.face) }}
        >
          {moveNotation(m)}
        </span>
      ))}
    </div>
  )
}

export function FormulasSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [built, setBuilt] = useState(false)
  useEffect(() => {
    let cancelled = false
    const build = () => {
      if (cancelled) return
      warmFormulaPoses()
      setBuilt(true)
    }
    if (open) {
      build()
      return
    }
    const idle = window.requestIdleCallback
    if (idle) {
      const id = idle(build, { timeout: 400 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }
    const id = window.setTimeout(build, 200)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [open])

  if (!built) return null
  return (
    <div
      className={`formulas-sheet${open ? '' : ' is-closed'}`}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      aria-label="Formulas"
    >
      <div className="formulas-panel">
        <div className="formulas-toolbar">
          <div className="formulas-drag" aria-hidden />
          <button className="formulas-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="formulas-scroll">
          {FORMULA_ROWS.map((row) => (
            <div key={row.id} className="formula-row">
              <div className="formula-row-top">
                {row.step != null ? (
                  <StepPreviewMini step={row.step} side={68} active={open} blit />
                ) : (
                  <LastFormulaCube side={68} blit />
                )}
                {row.pattern === 'middleRight' && <MiddleSlideCard slide="right" active sheet />}
                {row.pattern === 'middleLeft' && <MiddleSlideCard slide="left" active sheet />}
                {row.pattern === 'yellow' && <YellowPatternRow active={null} horizontal large />}
                {row.pattern === 'corners' && <PlaceCornersPattern side={50.4} active={open} />}
              </div>
              <FormulaChips moves={[...row.moves]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
