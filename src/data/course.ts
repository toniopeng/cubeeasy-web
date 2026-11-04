import { ALGS, moveNotation } from '../cube/model'

export const FREE_RUNS = 2
export const LIFETIME_PRICE_LABEL = '$9.99'
export const PRODUCT_NAME = 'CubeEasy Lifetime'

export const FORMULA_ROWS = [
  { id: 'sexy', step: 2 as number | null, moves: ALGS.sexy, pattern: 'none' as const },
  { id: 'middleLeft', step: 3, moves: ALGS.middleLeft, pattern: 'middleRight' as const },
  { id: 'middleRight', step: 3, moves: ALGS.middleRight, pattern: 'middleLeft' as const },
  { id: 'yellowCross', step: 4, moves: ALGS.yellowCross, pattern: 'yellow' as const },
  { id: 'sune', step: 5, moves: ALGS.sune, pattern: 'none' as const },
  { id: 'placeCorners', step: 6, moves: ALGS.placeCorners, pattern: 'corners' as const },
  { id: 'twist', step: null, moves: ALGS.twist, pattern: 'none' as const },
]

export function algText(moves: { face: string; suffix: string }[]) {
  return moves.map((m) => moveNotation(m as never)).join(' ')
}
