/** Integer cubie model — same right-hand quarters as iOS CubeModel / three.js lab. */

export type Axis = 'x' | 'y' | 'z'
export type Face = 'U' | 'D' | 'R' | 'L' | 'F' | 'B'
export type Suffix = 'none' | 'prime' | 'two'

export type Vec3 = { x: number; y: number; z: number }

export const COLORS = {
  U: '#fff200',
  D: '#f0f0f0',
  F: '#00e632',
  R: '#ff7f00',
  L: '#c01a16',
  B: '#1a40c2',
  body: '#0a0a0a',
  grayed: '#3a3a3a',
  faceletGray: '#4e4e4e',
  ink: '#1b1d22',
  purple: '#8b55d5',
} as const

export const FACE_NORMAL: Record<Face, Vec3> = {
  U: { x: 0, y: 1, z: 0 },
  D: { x: 0, y: -1, z: 0 },
  R: { x: 1, y: 0, z: 0 },
  L: { x: -1, y: 0, z: 0 },
  F: { x: 0, y: 0, z: 1 },
  B: { x: 0, y: 0, z: -1 },
}

const FACE_AXIS: Record<Face, Axis> = {
  U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z',
}
const FACE_LAYER: Record<Face, number> = {
  U: 1, R: 1, F: 1, D: -1, L: -1, B: -1,
}
const CLOCKWISE_SIGN: Record<Face, number> = {
  U: -1, R: -1, F: -1, D: 1, L: 1, B: 1,
}

export type Move = { face: Face; suffix: Suffix }

export function moveNotation(m: Move): string {
  if (m.suffix === 'prime') return m.face + "'"
  if (m.suffix === 'two') return m.face + '2'
  return m.face
}

export function parseMoves(text: string): Move[] {
  const chars = [...text.replace(/[’′`]/g, "'")]
  const out: Move[] = []
  let i = 0
  while (i < chars.length) {
    const f = chars[i] as Face
    if (!'UDRLFB'.includes(f)) {
      i++
      continue
    }
    let suffix: Suffix = 'none'
    if (i + 1 < chars.length) {
      const n = chars[i + 1]
      if (n === "'") {
        suffix = 'prime'
        i++
      } else if (n === '2') {
        suffix = 'two'
        i++
      }
    }
    out.push({ face: f, suffix })
    i++
  }
  return out
}

export const ALGS = {
  sexy: parseMoves("R U R' U'"),
  middleRight: parseMoves("U R U' R' U' F' U F"),
  middleLeft: parseMoves("U' L' U L U F U' F'"),
  yellowCross: parseMoves("F R U R' U' F'"),
  sune: parseMoves("R U R' U R U2 R'"),
  placeCorners: parseMoves("U R U' L' U R' U' L"),
  twist: parseMoves("R' D' R D"),
} as const

export type Mat3 = { c0: Vec3; c1: Vec3; c2: Vec3 }

export const MAT_I: Mat3 = {
  c0: { x: 1, y: 0, z: 0 },
  c1: { x: 0, y: 1, z: 0 },
  c2: { x: 0, y: 0, z: 1 },
}

function applyMat(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m.c0.x * v.x + m.c1.x * v.y + m.c2.x * v.z,
    y: m.c0.y * v.x + m.c1.y * v.y + m.c2.y * v.z,
    z: m.c0.z * v.x + m.c1.z * v.y + m.c2.z * v.z,
  }
}

function mulMat(a: Mat3, b: Mat3): Mat3 {
  return { c0: applyMat(a, b.c0), c1: applyMat(a, b.c1), c2: applyMat(a, b.c2) }
}

function qr(axis: Axis, v: Vec3): Vec3 {
  if (axis === 'x') return { x: v.x, y: -v.z, z: v.y }
  if (axis === 'y') return { x: v.z, y: v.y, z: -v.x }
  return { x: -v.y, y: v.x, z: v.z }
}

function quarter(axis: Axis, k: number): Mat3 {
  let turns = ((k % 4) + 4) % 4
  let m = MAT_I
  for (let i = 0; i < turns; i++) {
    m = { c0: qr(axis, m.c0), c1: qr(axis, m.c1), c2: qr(axis, m.c2) }
  }
  return m
}

export type Piece = { home: Vec3; pos: Vec3; ori: Mat3 }

export type CubeState = {
  pieces: Piece[]
  yaw: number
  flipped: boolean
}

function key(v: Vec3): string {
  return `${v.x},${v.y},${v.z}`
}

export function solved(): CubeState {
  const pieces: Piece[] = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue
        const home = { x, y, z }
        pieces.push({ home, pos: { ...home }, ori: { ...MAT_I, c0: { ...MAT_I.c0 }, c1: { ...MAT_I.c1 }, c2: { ...MAT_I.c2 } } })
      }
    }
  }
  return { pieces, yaw: 0, flipped: false }
}

export function cloneState(s: CubeState): CubeState {
  return {
    yaw: s.yaw,
    flipped: s.flipped,
    pieces: s.pieces.map((p) => ({
      home: { ...p.home },
      pos: { ...p.pos },
      ori: {
        c0: { ...p.ori.c0 },
        c1: { ...p.ori.c1 },
        c2: { ...p.ori.c2 },
      },
    })),
  }
}

export function plusQuarters(m: Move): number {
  let k = CLOCKWISE_SIGN[m.face]
  if (m.suffix === 'prime') k = -k
  if (m.suffix === 'two') k *= 2
  const r = k % 4
  return r >= 0 ? r : r + 4
}

export function applyMove(state: CubeState, move: Move): void {
  const axis = FACE_AXIS[move.face]
  const layer = FACE_LAYER[move.face]
  const q = quarter(axis, plusQuarters(move))
  for (const p of state.pieces) {
    if (p.pos[axis] !== layer) continue
    p.pos = applyMat(q, p.pos)
    p.ori = mulMat(q, p.ori)
  }
}

export function applyMoves(state: CubeState, moves: Move[]): void {
  for (const m of moves) applyMove(state, m)
}

export const FIXED_SCRAMBLE =
  "D2 R' F2 U2 L' B2 R2 D' F U' R2 L2 B' D R U2 F' L D2 B'"

export function randomScramble(length = 20): Move[] {
  const faces: Face[] = ['U', 'D', 'R', 'L', 'F', 'B']
  const suffixes: Suffix[] = ['none', 'prime', 'two']
  const out: Move[] = []
  let last: Face | null = null
  while (out.length < length) {
    const face = faces[(Math.random() * 6) | 0]
    if (face === last) continue
    last = face
    out.push({ face, suffix: suffixes[(Math.random() * 3) | 0] })
  }
  return out
}

export function invertMoves(moves: Move[]): Move[] {
  return [...moves].reverse().map((m) => {
    if (m.suffix === 'two') return m
    if (m.suffix === 'prime') return { face: m.face, suffix: 'none' as Suffix }
    return { face: m.face, suffix: 'prime' as Suffix }
  })
}

/** Step → primary formula shown under Play (matches Formulas sheet). */
export function formulaForStep(step: number): Move[] {
  switch (step) {
    case 2:
      return ALGS.sexy
    case 3:
      return ALGS.middleRight
    case 4:
      return ALGS.yellowCross
    case 5:
      return ALGS.sune
    case 6:
      return ALGS.placeCorners
    case 7:
      return ALGS.twist
    default:
      return parseMoves('F2')
  }
}

/** Demo start state for a teaching step: scrambled then reverse-apply remaining formulas. */
export function preparedForStep(step: number): CubeState {
  const cube = solved()
  applyMoves(cube, parseMoves(FIXED_SCRAMBLE))
  // Walk forward through beginner formulas so earlier stages look "done"
  if (step <= 1) {
    // White-cross teaching start: daisy-ish — apply a short setup
    const daisy = solved()
    applyMoves(daisy, parseMoves("R F2 D' R2 L' B2"))
    return daisy
  }
  // After scramble, apply enough algs to leave the cube in a plausible mid-stage.
  // For web demo we reset to near-solved for later steps then undo the step formula.
  const near = solved()
  if (step >= 7) {
    applyMoves(near, invertMoves(ALGS.twist))
    return near
  }
  if (step === 6) {
    applyMoves(near, invertMoves(ALGS.placeCorners))
    return near
  }
  if (step === 5) {
    applyMoves(near, invertMoves(ALGS.sune))
    return near
  }
  if (step === 4) {
    applyMoves(near, invertMoves(ALGS.yellowCross))
    applyMoves(near, invertMoves(ALGS.yellowCross))
    return near
  }
  if (step === 3) {
    applyMoves(near, invertMoves(ALGS.middleRight))
    return near
  }
  // step 2: white cross done, corners need sexy
  applyMoves(near, invertMoves(ALGS.sexy))
  applyMoves(near, invertMoves(ALGS.sexy))
  return near
}

export function isSolved(state: CubeState): boolean {
  return state.pieces.every(
    (p) =>
      p.pos.x === p.home.x &&
      p.pos.y === p.home.y &&
      p.pos.z === p.home.z &&
      p.ori.c0.x === 1 &&
      p.ori.c1.y === 1 &&
      p.ori.c2.z === 1,
  )
}

export function pieceAt(state: CubeState, pos: Vec3): Piece | undefined {
  return state.pieces.find((p) => p.pos.x === pos.x && p.pos.y === pos.y && p.pos.z === pos.z)
}

export { key }
