import { COLORS, type Face, moveNotation, type Move } from '../cube/model'
import { FORMULA_ROWS } from '../data/course'
import {
  FormulaIcon,
  MiddleSlideCard,
  PlaceCornersPattern,
  StepPreviewMini,
  YellowPatternRow,
} from '../lesson/patterns'

function chipColor(face: Face) {
  return COLORS[face]
}
function chipInk(face: Face) {
  return face === 'L' || face === 'B' ? '#fff' : COLORS.ink
}

function FormulaChips({ moves }: { moves: Move[] }) {
  return (
    <div className="formula-chips">
      {moves.map((m, i) => (
        <span
          key={`${m.face}-${i}`}
          className="fchip"
          style={{ background: chipColor(m.face), color: chipInk(m.face) }}
        >
          {moveNotation(m)}
        </span>
      ))}
    </div>
  )
}

export function FormulasSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="formulas-sheet" role="dialog" aria-modal="true" aria-label="Formulas">
      <div className="formulas-panel">
        <div className="formulas-toolbar">
          <div className="formulas-title">
            <FormulaIcon />
            <span>Formulas</span>
          </div>
          <button className="paywall-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="formulas-scroll">
          {FORMULA_ROWS.map((row) => (
            <div key={row.id} className="formula-row">
              <div className="formula-row-top">
                {row.step != null ? (
                  <StepPreviewMini step={row.step} side={68} />
                ) : (
                  <div className="last-formula-cube" aria-hidden />
                )}
                {row.pattern === 'middleRight' && <MiddleSlideCard slide="right" sheet />}
                {row.pattern === 'middleLeft' && <MiddleSlideCard slide="left" sheet />}
                {row.pattern === 'yellow' && <YellowPatternRow horizontal large />}
                {row.pattern === 'corners' && <PlaceCornersPattern side={50.4} />}
              </div>
              <FormulaChips moves={[...row.moves]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
