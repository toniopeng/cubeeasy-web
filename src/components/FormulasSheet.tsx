import { COLORS, type Face, moveNotation, type Move } from '../cube/model'
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
  // iOS Formulas sheet uses black ink on every face chip (including L/B).
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
  if (!open) return null
  return (
    <div className="formulas-sheet" role="dialog" aria-modal="true" aria-label="Formulas">
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
                  <StepPreviewMini step={row.step} side={68} />
                ) : (
                  <LastFormulaCube side={68} />
                )}
                {row.pattern === 'middleRight' && <MiddleSlideCard slide="right" active sheet />}
                {row.pattern === 'middleLeft' && <MiddleSlideCard slide="left" active sheet />}
                {row.pattern === 'yellow' && <YellowPatternRow active={null} horizontal large />}
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
