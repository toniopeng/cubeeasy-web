/** Integer cubie model — faithful port of iOS CubeModel teaching helpers. */

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

export const FACE_AXIS: Record<Face, Axis> = {
  U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z',
}
export const FACE_LAYER: Record<Face, number> = {
  U: 1, R: 1, F: 1, D: -1, L: -1, B: -1,
}
export const CLOCKWISE_SIGN: Record<Face, number> = {
  U: -1, R: -1, F: -1, D: 1, L: 1, B: 1,
}

export type Move = { face: Face; suffix: Suffix }
export type Mat3 = { c0: Vec3; c1: Vec3; c2: Vec3 }
export type Piece = { home: Vec3; pos: Vec3; ori: Mat3 }
export type CubeState = { pieces: Piece[]; yaw: number; flipped: boolean }
export type Sticker = { home: Vec3; face: Face }
export type YellowCase = 'dot' | 'L' | 'line' | 'cross' | 'other'
export type Stage = 'cross' | 'firstLayer' | 'f2l' | 'yellowCross' | 'edges' | 'cornersPlaced'

export type FrontDrop = {
  home: Vec3
  side: Face
  yaw: number
  aligns: Move[]
  drop: boolean
}
export type MiddlePlan = {
  uMoves: Move[]
  yaw: number
  right: boolean
  side: Face
  roof: Face
}
export type CornerPrep = {
  popYaw: number | null
  uMoves: Move[]
  yaw: number
}

export const MAT_I: Mat3 = {
  c0: { x: 1, y: 0, z: 0 },
  c1: { x: 0, y: 1, z: 0 },
  c2: { x: 0, y: 0, z: 1 },
}

export function v3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}
export function vEq(a: Vec3, b: Vec3) {
  return a.x === b.x && a.y === b.y && a.z === b.z
}
export function key(v: Vec3) {
  return `${v.x},${v.y},${v.z}`
}
export function component(v: Vec3, axis: Axis) {
  return v[axis]
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

export function withFace(m: Move, face: Face): Move {
  return { face, suffix: m.suffix }
}

export function plusQuarters(m: Move): number {
  let k = CLOCKWISE_SIGN[m.face]
  if (m.suffix === 'prime') k = -k
  if (m.suffix === 'two') k *= 2
  const r = k % 4
  return r >= 0 ? r : r + 4
}

/** Signed short-arc quarters (iOS signedTurnAngle / π/2). */
export function signedQuarters(m: Move): number {
  let q = CLOCKWISE_SIGN[m.face]
  if (m.suffix === 'prime') q = -q
  if (m.suffix === 'two') q *= 2
  return q
}

export function uMoves(count: number): Move[] {
  switch (((count % 4) + 4) % 4) {
    case 0:
      return []
    case 1:
      return [{ face: 'U', suffix: 'none' }]
    case 2:
      return [{ face: 'U', suffix: 'two' }]
    default:
      return [{ face: 'U', suffix: 'prime' }]
  }
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

export const MOVE_U: Move = { face: 'U', suffix: 'none' }

export const FIXED_SCRAMBLE =
  "D2 R' F2 U2 L' B2 R2 D' F U' R2 L2 B' D R U2 F' L D2 B'"

export const WHITE_EDGES: { home: Vec3; side: Face }[] = [
  { home: v3(1, -1, 0), side: 'R' },
  { home: v3(0, -1, 1), side: 'F' },
  { home: v3(-1, -1, 0), side: 'L' },
  { home: v3(0, -1, -1), side: 'B' },
]
export const CORNER_HOMES = [v3(1, -1, 1), v3(-1, -1, 1), v3(-1, -1, -1), v3(1, -1, -1)]
export const MID_HOMES = [v3(1, 0, 1), v3(-1, 0, 1), v3(-1, 0, -1), v3(1, 0, -1)]
export const TOP_EDGES = [v3(-1, 1, 0), v3(0, 1, -1), v3(1, 1, 0), v3(0, 1, 1)]
export const TOP_CORNERS = [v3(1, 1, 1), v3(-1, 1, 1), v3(-1, 1, -1), v3(1, 1, -1)]
export const ALL_FACES: Face[] = ['U', 'D', 'R', 'L', 'F', 'B']

export function faceMatching(n: Vec3): Face {
  return ALL_FACES.find((f) => vEq(FACE_NORMAL[f], n)) ?? 'U'
}

export function solved(): CubeState {
  const pieces: Piece[] = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue
        const home = { x, y, z }
        pieces.push({
          home,
          pos: { ...home },
          ori: {
            c0: { ...MAT_I.c0 },
            c1: { ...MAT_I.c1 },
            c2: { ...MAT_I.c2 },
          },
        })
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

export function applyLocal(state: CubeState, move: Move): void {
  const axis = FACE_AXIS[move.face]
  const layer = FACE_LAYER[move.face]
  const q = quarter(axis, plusQuarters(move))
  for (const p of state.pieces) {
    if (component(p.pos, axis) !== layer) continue
    p.pos = applyMat(q, p.pos)
    p.ori = mulMat(q, p.ori)
  }
}

export function applyMove(state: CubeState, move: Move): void {
  applyLocal(state, move)
}

export function applyMoves(state: CubeState, moves: Move[]): void {
  for (const m of moves) applyLocal(state, m)
}

export function ry(v: Vec3, k: number): Vec3 {
  let out = { ...v }
  const turns = ((k % 4) + 4) % 4
  for (let i = 0; i < turns; i++) out = { x: out.z, y: out.y, z: -out.x }
  return out
}

export function viewToLocal(state: CubeState, face: Face): Face {
  let v = { ...FACE_NORMAL[face] }
  if (state.flipped) v = { x: v.x, y: -v.y, z: -v.z }
  const turns = (4 - (((state.yaw % 4) + 4) % 4)) % 4
  v = ry(v, turns)
  return faceMatching(v)
}

export function applyView(state: CubeState, move: Move): void {
  applyLocal(state, withFace(move, viewToLocal(state, move.face)))
}

export function normalizeOrientation(state: CubeState): void {
  state.yaw = 0
  state.flipped = false
}

export function yawFor(x: number, z: number): number {
  for (let k = 0; k < 4; k++) {
    const v = ry(v3(x, 0, z), k)
    if (v.x === 1 && v.z === 1) return k
  }
  return 0
}

export function yawFront(normal: Vec3): number {
  for (let k = 0; k < 4; k++) {
    const v = ry(normal, k)
    if (v.z === 1 && v.x === 0) return k
  }
  return 0
}

export function yawRight(normal: Vec3): number {
  for (let k = 0; k < 4; k++) {
    const v = ry(normal, k)
    if (v.x === 1 && v.z === 0) return k
  }
  return 0
}

export function pieceHome(state: CubeState, home: Vec3): Piece | undefined {
  return state.pieces.find((p) => vEq(p.home, home))
}
export function pieceAt(state: CubeState, pos: Vec3): Piece | undefined {
  return state.pieces.find((p) => vEq(p.pos, pos))
}
export function whiteDir(piece: Piece): Vec3 {
  return applyMat(piece.ori, v3(0, -1, 0))
}
export function yellowDir(piece: Piece): Vec3 {
  return applyMat(piece.ori, v3(0, 1, 0))
}

export function isSolved(state: CubeState): boolean {
  for (const piece of state.pieces) {
    if (!vEq(piece.pos, piece.home)) return false
    const zeros = [piece.home.x, piece.home.y, piece.home.z].filter((n) => n === 0).length
    if (zeros >= 2) continue
    for (const face of ALL_FACES) {
      const n = FACE_NORMAL[face]
      const on =
        (n.x !== 0 && n.x === piece.home.x) ||
        (n.y !== 0 && n.y === piece.home.y) ||
        (n.z !== 0 && n.z === piece.home.z)
      if (on && !vEq(applyMat(piece.ori, n), n)) return false
    }
  }
  return true
}

export function crossSolved(state: CubeState): boolean {
  return WHITE_EDGES.every((edge) => {
    const p = pieceHome(state, edge.home)
    return p && vEq(p.pos, edge.home) && vEq(whiteDir(p), v3(0, -1, 0))
  })
}

export function cornerSolved(state: CubeState, home: Vec3): boolean {
  const p = pieceHome(state, home)
  return !!p && vEq(p.pos, home) && whiteDir(p).y === -1
}

export function firstLayerSolved(state: CubeState): boolean {
  return crossSolved(state) && CORNER_HOMES.every((h) => cornerSolved(state, h))
}

export function midSolved(state: CubeState, home: Vec3): boolean {
  const p = pieceHome(state, home)
  if (!p) return false
  const facing = applyMat(p.ori, v3(home.x, 0, 0))
  return vEq(p.pos, home) && facing.x === home.x
}

export function yellowUp(state: CubeState, pos: Vec3): boolean {
  const p = pieceAt(state, pos)
  return !!p && p.home.y === 1 && yellowDir(p).y === 1
}

export function edgeMatched(state: CubeState, pos: Vec3): boolean {
  const p = pieceAt(state, pos)
  return !!p && vEq(p.home, pos)
}

export function cornerPlaced(state: CubeState, pos: Vec3): boolean {
  const p = pieceAt(state, pos)
  return !!p && p.home.x === pos.x && p.home.z === pos.z
}

export function matchCount(state: CubeState): number {
  return TOP_EDGES.filter((e) => edgeMatched(state, e)).length
}

export function bestMatchCount(state: CubeState): number {
  const work = cloneState(state)
  let score = 0
  for (let i = 0; i < 4; i++) {
    score = Math.max(score, matchCount(work))
    applyLocal(work, MOVE_U)
  }
  return score
}

export function topPattern(state: CubeState): { ups: boolean[]; kind: YellowCase } {
  const ups = TOP_EDGES.map((e) => yellowUp(state, e))
  const n = ups.filter(Boolean).length
  let kind: YellowCase
  if (n === 0) kind = 'dot'
  else if (n === 4) kind = 'cross'
  else if ((ups[0] && ups[2]) || (ups[1] && ups[3])) kind = 'line'
  else if (n === 2) kind = 'L'
  else kind = 'other'
  return { ups, kind }
}

export function wantHold(state: CubeState, kind: YellowCase): boolean {
  const ups = topPattern(state).ups
  if (kind === 'L') return !!(ups[0] && ups[1])
  if (kind === 'line') return !!(ups[0] && ups[2])
  return true
}

export function twisted(state: CubeState, pos: Vec3): boolean {
  return !yellowUp(state, pos)
}
export function twistedSlots(state: CubeState): Vec3[] {
  return TOP_CORNERS.filter((c) => twisted(state, c))
}

export function ufrSlot(state: CubeState): Vec3 {
  const local = ry(v3(1, 0, 1), (4 - (((state.yaw % 4) + 4) % 4)) % 4)
  return v3(local.x, 1, local.z)
}

export function localOfView(state: CubeState, x: number, y: number, z: number): Vec3 {
  const turns = (4 - (((state.yaw % 4) + 4) % 4)) % 4
  return ry(v3(x, y, z), turns)
}

function sideStickers(state: CubeState, home: Vec3): { face: Face; dir: Vec3 }[] {
  const p = pieceHome(state, home)
  if (!p) return []
  const normals: Vec3[] = []
  if (home.x !== 0) normals.push(v3(home.x, 0, 0))
  if (home.z !== 0) normals.push(v3(0, 0, home.z))
  return normals.map((n) => ({ face: faceMatching(n), dir: applyMat(p.ori, n) }))
}

export function middlePlan(state: CubeState, home: Vec3): MiddlePlan | null {
  const work = cloneState(state)
  const initial = sideStickers(work, home)
  const up = initial.find((s) => s.dir.y === 1)
  const front = initial.find((s) => s.dir.y !== 1)
  if (!up || !front) return null
  const center = FACE_NORMAL[front.face]
  let count = 0
  for (let i = 0; i < 4; i++) {
    const dir = sideStickers(work, home).find((s) => s.face === front.face)?.dir ?? v3(0, 0, 0)
    if (dir.x === center.x && dir.z === center.z) break
    applyLocal(work, MOVE_U)
    count++
  }
  const yaw = yawFront(center)
  const turned = ry(FACE_NORMAL[up.face], yaw)
  return {
    uMoves: uMoves(count),
    yaw,
    right: turned.x === 1,
    side: front.face,
    roof: up.face,
  }
}

export function cornerPrep(state: CubeState, home: Vec3): CornerPrep | null {
  if (cornerSolved(state, home)) return null
  const work = cloneState(state)
  const start = pieceHome(work, home)
  if (!start) return null
  let pop: number | null = null
  if (start.pos.y === -1 && !(start.pos.x === home.x && start.pos.z === home.z)) {
    const popYaw = yawFor(start.pos.x, start.pos.z)
    work.yaw = popYaw
    pop = popYaw
    for (const m of ALGS.sexy) applyView(work, m)
  }
  let count = 0
  for (let i = 0; i < 4; i++) {
    const current = pieceHome(work, home)
    if (!current) break
    if (current.pos.x === home.x && current.pos.z === home.z) break
    applyLocal(work, MOVE_U)
    count++
  }
  return { popYaw: pop, uMoves: uMoves(count), yaw: yawFor(home.x, home.z) }
}

export function frontDrops(state: CubeState): FrontDrop[] {
  const order: Face[] = ['L', 'F', 'R', 'B']
  const work = cloneState(state)
  const plan: FrontDrop[] = []
  for (const side of order) {
    const edge = WHITE_EDGES.find((e) => e.side === side)
    if (!edge) continue
    const yaw = yawFront(FACE_NORMAL[side])
    work.yaw = yaw
    let count = 0
    let aligned = false
    for (let i = 0; i < 4; i++) {
      const piece = pieceHome(work, edge.home)
      if (!piece) break
      const viewPos = ry(piece.pos, yaw)
      const viewSide = ry(applyMat(piece.ori, FACE_NORMAL[side]), yaw)
      if (vEq(viewPos, v3(0, 1, 1)) && vEq(viewSide, v3(0, 0, 1))) {
        aligned = true
        break
      }
      applyView(work, MOVE_U)
      count++
    }
    if (aligned) applyView(work, { face: 'F', suffix: 'two' })
    plan.push({
      home: edge.home,
      side,
      yaw,
      aligns: aligned ? uMoves(count) : [],
      drop: aligned,
    })
  }
  return plan
}

export function yellowAlignMoves(state: CubeState): Move[] {
  const work = cloneState(state)
  const kind = topPattern(work).kind
  if (kind === 'cross' || kind === 'other') return []
  let count = 0
  while (count < 4 && !wantHold(work, kind)) {
    applyLocal(work, MOVE_U)
    count++
  }
  return uMoves(count)
}

export function bestUCount(state: CubeState): number {
  const work = cloneState(state)
  let best = 0
  let score = -1
  for (let u = 0; u < 4; u++) {
    const matches = matchCount(work)
    if (matches > score) {
      score = matches
      best = u
    }
    applyLocal(work, MOVE_U)
  }
  return best
}

export function adjacentMatchYaw(state: CubeState): number | null {
  const flags = TOP_EDGES.map((e) => edgeMatched(state, e))
  const count = flags.filter(Boolean).length
  if (count !== 2) return null
  const opposite = (flags[0] && flags[2]) || (flags[1] && flags[3])
  if (opposite) return null
  const normals = TOP_EDGES.filter((_, i) => flags[i]).map((pos) => v3(pos.x, 0, pos.z))
  for (let k = 0; k < 4; k++) {
    const turned = normals.map((n) => ry(n, k))
    if (turned.some((t) => t.z === -1) && turned.some((t) => t.x === 1)) return k
  }
  return 0
}

export function suneYaw(state: CubeState): number {
  if (matchCount(state) === 1) {
    const pos = TOP_EDGES.find((e) => edgeMatched(state, e))
    if (pos) {
      const preferred = yawFront(v3(pos.x, 0, pos.z))
      let bestYaw = preferred
      let bestScore = -1
      for (let k = 0; k < 4; k++) {
        const work = cloneState(state)
        work.yaw = k
        for (const m of ALGS.sune) applyView(work, m)
        const score = matchCount(work)
        if (score > bestScore || (score === bestScore && k === preferred)) {
          bestScore = score
          bestYaw = k
        }
      }
      return bestYaw
    }
  }
  return adjacentMatchYaw(state) ?? 0
}

export function uMovesUntilTwistedAtUFR(state: CubeState): Move[] {
  const work = cloneState(state)
  let count = 0
  for (let i = 0; i < 4; i++) {
    if (twisted(work, ufrSlot(work))) break
    applyLocal(work, MOVE_U)
    count++
  }
  return uMoves(count)
}

export function uMovesUntilSolved(state: CubeState): Move[] {
  const work = cloneState(state)
  let count = 0
  for (let i = 0; i < 4; i++) {
    if (isSolved(work)) break
    applyLocal(work, MOVE_U)
    count++
  }
  return uMoves(count)
}

export function slotSideFaces(home: Vec3, yaw: number): { front: Face; right: Face } {
  const sides = [faceMatching(v3(home.x, 0, 0)), faceMatching(v3(0, 0, home.z))]
  const turned = (face: Face) => ry(FACE_NORMAL[face], yaw)
  const front = sides.find((f) => turned(f).z === 1) ?? sides[0]
  const right = sides.find((f) => turned(f).x === 1) ?? sides[1]
  return { front, right }
}

export function solvedHomes(state: CubeState): Set<string> {
  const homes = new Set<string>()
  for (const piece of state.pieces) {
    const zeros = [piece.home.x, piece.home.y, piece.home.z].filter((n) => n === 0).length
    if (zeros >= 2) {
      homes.add(key(piece.home))
      continue
    }
    if (!vEq(piece.pos, piece.home)) continue
    let oriented = true
    for (const face of ALL_FACES) {
      const n = FACE_NORMAL[face]
      const on =
        (n.x !== 0 && n.x === piece.home.x) ||
        (n.y !== 0 && n.y === piece.home.y) ||
        (n.z !== 0 && n.z === piece.home.z)
      if (on && !vEq(applyMat(piece.ori, n), n)) {
        oriented = false
        break
      }
    }
    if (oriented) homes.add(key(piece.home))
  }
  return homes
}

export function invertMoves(moves: Move[]): Move[] {
  return [...moves].reverse().map((m) => {
    if (m.suffix === 'two') return m
    if (m.suffix === 'prime') return { face: m.face, suffix: 'none' as Suffix }
    return { face: m.face, suffix: 'prime' as Suffix }
  })
}

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

function finishDaisy(state: CubeState): void {
  // BFS daisy then drop — simplified: use teachingDaisy setup path for prepared stages
  // Full daisy BFS ported below for teachingDaisy; for silent solve use dropPlan-style.
  const daisy = daisyMoves(state)
  applyMoves(state, daisy)
  // Drop petals to bottom
  for (const edge of WHITE_EDGES) {
    const p = pieceHome(state, edge.home)
    if (!p) continue
    if (vEq(p.pos, edge.home) && vEq(whiteDir(p), v3(0, -1, 0))) continue
    let count = 0
    let aligned = false
    for (let i = 0; i < 4; i++) {
      const cur = pieceHome(state, edge.home)
      if (!cur) break
      const dir = applyMat(cur.ori, FACE_NORMAL[edge.side])
      if (dir.y === 0 && dir.x === FACE_NORMAL[edge.side].x && dir.z === FACE_NORMAL[edge.side].z) {
        aligned = true
        break
      }
      applyLocal(state, MOVE_U)
      count++
    }
    if (!aligned) continue
    applyLocal(state, { face: edge.side, suffix: 'two' })
  }
}

type Snap = { x: number; y: number; z: number; wx: number; wy: number; wz: number }
function snapKey(s: Snap) {
  return `${s.x},${s.y},${s.z},${s.wx},${s.wy},${s.wz}`
}
function daisyKey(state: CubeState): Snap[] {
  return WHITE_EDGES.map((edge) => {
    const piece = pieceHome(state, edge.home) ?? {
      home: edge.home,
      pos: edge.home,
      ori: MAT_I,
    }
    const w = whiteDir(piece)
    return { x: piece.pos.x, y: piece.pos.y, z: piece.pos.z, wx: w.x, wy: w.y, wz: w.z }
  })
}
function daisyDone(snaps: Snap[]) {
  return snaps.every((s) => s.y === 1 && s.wy === 1 && s.wx === 0 && s.wz === 0)
}
function applySnapKey(snaps: Snap[], move: Move): Snap[] {
  const rot = quarter(FACE_AXIS[move.face], plusQuarters(move))
  return snaps.map((snap) => {
    const pos = v3(snap.x, snap.y, snap.z)
    if (component(pos, FACE_AXIS[move.face]) !== FACE_LAYER[move.face]) return snap
    const turned = applyMat(rot, pos)
    const white = applyMat(rot, v3(snap.wx, snap.wy, snap.wz))
    return { x: turned.x, y: turned.y, z: turned.z, wx: white.x, wy: white.y, wz: white.z }
  })
}

export function daisyMoves(state: CubeState): Move[] {
  const start = daisyKey(state)
  if (daisyDone(start)) return []
  const startK = start.map(snapKey).join('|')
  const parent = new Map<string, { prev: string; move: Move; snaps: Snap[] }>()
  const seen = new Set<string>([startK])
  const queue: { k: string; snaps: Snap[] }[] = [{ k: startK, snaps: start }]
  let found: string | null = null
  const alphabet: Face[] = ['U', 'D', 'R', 'L', 'F', 'B']
  const suffixes: Suffix[] = ['none', 'prime', 'two']
  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]
    if (daisyDone(cur.snaps)) {
      found = cur.k
      break
    }
    for (const face of alphabet) {
      for (const suffix of suffixes) {
        const move = { face, suffix }
        const next = applySnapKey(cur.snaps, move)
        const nk = next.map(snapKey).join('|')
        if (seen.has(nk)) continue
        seen.add(nk)
        parent.set(nk, { prev: cur.k, move, snaps: next })
        queue.push({ k: nk, snaps: next })
      }
    }
    if (seen.size > 200000) break
  }
  if (!found) return []
  const moves: Move[] = []
  let cursor = found
  while (parent.has(cursor)) {
    const p = parent.get(cursor)!
    moves.push(p.move)
    cursor = p.prev
  }
  return moves.reverse()
}

function solveCorners(state: CubeState): void {
  const y0 = state.yaw
  for (let n = 0; n < 8; n++) {
    const home = CORNER_HOMES.find((h) => !cornerSolved(state, h))
    if (!home) break
    const start = pieceHome(state, home)
    if (!start) break
    if (start.pos.y === -1 && !(start.pos.x === home.x && start.pos.z === home.z)) {
      state.yaw = yawFor(start.pos.x, start.pos.z)
      for (const m of ALGS.sexy) applyView(state, m)
    }
    for (let i = 0; i < 4; i++) {
      const current = pieceHome(state, home)
      if (!current) break
      if (current.pos.x === home.x && current.pos.z === home.z) break
      applyLocal(state, MOVE_U)
    }
    state.yaw = yawFor(home.x, home.z)
    for (let i = 0; i < 6; i++) {
      if (cornerSolved(state, home)) break
      for (const m of ALGS.sexy) applyView(state, m)
    }
  }
  state.yaw = y0
}

function solveMiddle(state: CubeState): void {
  const y0 = state.yaw
  for (let n = 0; n < 16; n++) {
    if (MID_HOMES.every((h) => midSolved(state, h))) break
    const top = MID_HOMES.find((h) => pieceHome(state, h)?.pos.y === 1)
    if (top) {
      const plan = middlePlan(state, top)
      if (!plan) break
      applyMoves(state, plan.uMoves)
      state.yaw = plan.yaw
      const alg = plan.right ? ALGS.middleRight : ALGS.middleLeft
      for (const m of alg) applyView(state, m)
    } else {
      const stuck = MID_HOMES.find((h) => !midSolved(state, h))
      const pos = stuck && pieceHome(state, stuck)?.pos
      if (!stuck || !pos) break
      state.yaw = yawFor(pos.x, pos.z)
      for (const m of ALGS.middleRight) applyView(state, m)
    }
  }
  state.yaw = y0
}

export function solveYellowCross(state: CubeState): void {
  const y0 = state.yaw
  state.yaw = 0
  for (let n = 0; n < 4; n++) {
    const kind = topPattern(state).kind
    if (kind === 'cross') break
    for (let i = 0; i < 4; i++) {
      if (wantHold(state, kind)) break
      applyLocal(state, MOVE_U)
    }
    for (const m of ALGS.yellowCross) applyView(state, m)
  }
  state.yaw = y0
}

function solveEdges(state: CubeState): void {
  const y0 = state.yaw
  for (let n = 0; n < 6; n++) {
    state.yaw = 0
    const best = bestUCount(state)
    applyMoves(state, uMoves(best))
    if (matchCount(state) === 4) break
    const hold = adjacentMatchYaw(state)
    if (hold != null) state.yaw = hold
    for (const m of ALGS.sune) applyView(state, m)
  }
  state.yaw = y0
}

function solvePlaces(state: CubeState): void {
  const y0 = state.yaw
  for (let n = 0; n < 6; n++) {
    const placed = TOP_CORNERS.filter((c) => cornerPlaced(state, c))
    if (placed.length === 4) break
    state.yaw = 0
    if (placed.length === 1) state.yaw = yawFor(placed[0].x, placed[0].z)
    for (const m of ALGS.placeCorners) applyView(state, m)
  }
  state.yaw = y0
}

export function teachingDaisy(): CubeState {
  const cube = solved()
  applyMoves(cube, parseMoves("R F2 D' R2 L' B2"))
  normalizeOrientation(cube)
  return cube
}

export function prepared(stage: Stage): CubeState {
  let scramble = parseMoves(FIXED_SCRAMBLE)
  let tries = 0
  while (true) {
    const cube = solved()
    applyMoves(cube, scramble)
    finishDaisy(cube)
    if (stage === 'cross') {
      normalizeOrientation(cube)
      return cube
    }
    solveCorners(cube)
    if (stage === 'firstLayer') {
      normalizeOrientation(cube)
      return cube
    }
    solveMiddle(cube)
    if (stage === 'f2l') {
      normalizeOrientation(cube)
      return cube
    }
    solveYellowCross(cube)
    if (stage === 'yellowCross') {
      normalizeOrientation(cube)
      return cube
    }
    solveEdges(cube)
    if (stage === 'edges') {
      normalizeOrientation(cube)
      return cube
    }
    solvePlaces(cube)
    normalizeOrientation(cube)
    if (twistedSlots(cube).length > 0 || tries >= 5) return cube
    scramble = randomScramble()
    tries++
  }
}

/** @deprecated use prepared() — kept for Formulas/legacy callers */
export function preparedForStep(step: number): CubeState {
  if (step <= 1) return teachingDaisy()
  if (step === 2) return prepared('cross')
  if (step === 3) return prepared('firstLayer')
  if (step === 4) return prepared('f2l')
  if (step === 5) return prepared('yellowCross')
  if (step === 6) return prepared('edges')
  return prepared('cornersPlaced')
}

export function formulaForStep(step: number): Move[] {
  switch (step) {
    case 2:
      return [...ALGS.sexy]
    case 3:
      return [...ALGS.middleRight]
    case 4:
      return [...ALGS.yellowCross]
    case 5:
      return [...ALGS.sune]
    case 6:
      return [...ALGS.placeCorners]
    case 7:
      return [...ALGS.twist]
    default:
      return parseMoves('F2')
  }
}

export function colorName(face: Face): string {
  switch (face) {
    case 'U':
      return 'Yellow'
    case 'D':
      return 'White'
    case 'R':
      return 'Orange'
    case 'L':
      return 'Red'
    case 'F':
      return 'Green'
    case 'B':
      return 'Blue'
  }
}
