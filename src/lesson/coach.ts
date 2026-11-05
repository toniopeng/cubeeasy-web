/**
 * LessonCoach — TypeScript port of iOS Lesson/LessonCoach.swift teaching-v51.
 * Drives CubeViewport with the same step machine, piece finding, Play waits, and formulas.
 */
import type { CubeViewport, TeachSpeed } from '../cube/viewport'
import { SPEED_LABEL } from '../cube/viewport'
import {
  ALGS,
  ALL_FACES,
  CORNER_HOMES,
  FACE_NORMAL,
  MID_HOMES,
  TOP_CORNERS,
  TOP_EDGES,
  WHITE_EDGES,
  type Face,
  type Move,
  type Sticker,
  type Vec3,
  type YellowCase,
  adjacentMatchYaw,
  applyView,
  bestMatchCount,
  bestUCount,
  cloneState,
  colorName,
  cornerPlaced,
  cornerPrep,
  cornerSolved,
  edgeMatched,
  firstLayerSolved,
  frontDrops,
  invertMoves,
  isSolved,
  key,
  matchCount,
  midSolved,
  middlePlan,
  normalizeOrientation,
  pieceAt,
  pieceHome,
  prepared,
  solvedHomes,
  suneYaw,
  teachingDaisy,
  topPattern,
  twisted,
  twistedSlots,
  uMoves,
  uMovesUntilSolved,
  uMovesUntilTwistedAtUFR,
  ufrSlot,
  whiteDir,
  bestVisibleYaw,
  yawFor,
  yawRight,
  yellowAlignMoves,
  yellowDir,
  yellowUp,
  solveYellowCross,
  v3,
  vEq,
  slotSideFaces,
  parseMoves,
  applyMoves,
  localOfView,
} from '../cube/model'

export type PlayFace =
  | { kind: 'play' }
  | { kind: 'ok' }
  | { kind: 'formula'; moves: Move[]; active: number | null }

export type Advance =
  | 'start'
  | 'play'
  | 'whiteCross'
  | 'bottomLayer'
  | 'again'
  | 'ok'
  | { move: Move }

export type MiddleSlide = 'left' | 'right'
export type Cheer = 'none' | 'piece' | 'step' | 'solved'

export type CoachSnapshot = {
  step: number
  playFace: PlayFace
  advance: Advance
  crossCase: YellowCase | null
  crossUps: boolean[]
  showCrossCards: boolean
  middleSlide: MiddleSlide | null
  showMiddleSlides: boolean
  showSideGhost: boolean
  matchedSideFaces: Face[]
  showCornerCycle: boolean
  practiceOrbit: boolean
  inputLocked: boolean
  caption: string
  /** True while a formula/alg is on screen or its moves are turning. */
  algActing: boolean
  celebrating: boolean
  cheer: Cheer
  cheerID: number
  padUnlocked: boolean
  speed: TeachSpeed
  speedTitle: string
  playWillAct: boolean
}

type Listener = () => void

const GUIDE_CENTERS: Vec3[] = ALL_FACES.map((f) => FACE_NORMAL[f])


function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function movesEqual(a: Move[], b: Move[]): boolean {
  if (a.length !== b.length) return false
  return a.every((m, i) => m.face === b[i].face && m.suffix === b[i].suffix)
}

export class LessonCoach {
  step = 0
  playFace: PlayFace = { kind: 'play' }
  advance: Advance = 'start'
  crossCase: YellowCase | null = null
  crossUps: boolean[] = []
  showCrossCards = false
  middleSlide: MiddleSlide | null = null
  showMiddleSlides = false
  showSideGhost = false
  matchedSideFaces: Face[] = []
  showCornerCycle = false
  practiceOrbit = true
  private persistCornerMarks = false
  inputLocked = false
  caption = ''
  algActing = false
  celebrating = false
  cheer: Cheer = 'none'
  cheerID = 0
  padUnlocked = true
  speed: TeachSpeed = 'fast'
  private focusHomes = new Set<string>()
  private token = 0
  private waiter: (() => void) | null = null
  private listeners = new Set<Listener>()
  private scene: CubeViewport

  constructor(scene: CubeViewport) {
    this.scene = scene
    this.scene.teachSpeed = this.speed
    this.scene.onSolved = () => {
      if (this.step === 0 && this.padUnlocked) this.celebrate('solved')
    }
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    for (const fn of this.listeners) fn()
  }

  snapshot(): CoachSnapshot {
    return {
      step: this.step,
      playFace: this.playFace,
      advance: this.advance,
      crossCase: this.crossCase,
      crossUps: this.crossUps,
      showCrossCards: this.showCrossCards,
      middleSlide: this.middleSlide,
      showMiddleSlides: this.showMiddleSlides,
      showSideGhost: this.showSideGhost,
      matchedSideFaces: this.matchedSideFaces,
      showCornerCycle: this.showCornerCycle,
      practiceOrbit: this.practiceOrbit,
      inputLocked: this.inputLocked,
      caption: this.caption,
      algActing: this.algActing,
      celebrating: this.celebrating,
      cheer: this.cheer,
      cheerID: this.cheerID,
      padUnlocked: this.padUnlocked,
      speed: this.speed,
      speedTitle: SPEED_LABEL[this.speed],
      playWillAct: this.step === 0 || this.waiter != null,
    }
  }

  get playWillAct() {
    return this.step === 0 || this.waiter != null
  }

  start(step: number) {
    this.stopGuidance()
    this.step = step
    this.practiceOrbit = false
    this.padUnlocked = false
    this.scene.setPadEnabled(false)
    this.scene.setPracticeEnabled(false)
    this.celebrating = false
    this.emit()
    const current = this.token
    void this.run(step, current).catch((err) => {
      console.error('[LessonCoach] run failed', err)
      if (this.token === current) {
        this.inputLocked = false
        this.playFace = { kind: 'play' }
        this.advance = 'play'
        this.emit()
      }
    })
  }

  stopGuidance(restoreColors = true) {
    this.token++
    if (this.waiter) {
      const w = this.waiter
      this.waiter = null
      w()
    }
    this.scene.invalidate()
    this.focusHomes = new Set()
    if (restoreColors) this.scene.restoreColors()
    this.inputLocked = false
    this.playFace = { kind: 'play' }
    this.advance = 'start'
    this.crossCase = null
    this.crossUps = []
    this.showCrossCards = false
    this.middleSlide = null
    this.showSideGhost = false
    this.matchedSideFaces = []
    this.showMiddleSlides = false
    this.showCornerCycle = false
    this.persistCornerMarks = false
    this.celebrating = false
    this.cheer = 'none'
    this.algActing = false
    this.emit()
  }

  private celebrate(level: Cheer) {
    this.cheerID++
    this.cheer = level
    const id = this.cheerID
    const seconds = level === 'piece' ? 1.5 : level === 'step' ? 1.9 : level === 'solved' ? 2.6 : 0
    this.emit()
    if (!seconds) return
    void (async () => {
      await sleep(seconds * 1000)
      if (this.cheerID === id) {
        this.cheer = 'none'
        this.emit()
      }
    })()
  }

  cycleSpeed() {
    const order: TeachSpeed[] = ['slow', 'normal', 'fast', 'faster']
    this.speed = order[(order.indexOf(this.speed) + 1) % order.length]
    this.scene.teachSpeed = this.speed
    this.emit()
  }

  tapPlay() {
    if (this.inputLocked || !this.waiter) return
    const w = this.waiter
    this.waiter = null
    w()
  }

  resetCube() {
    this.stopGuidance(false)
    this.step = 0
    this.caption = ''
    this.algActing = false
    // Free 360° orbit the moment Reset is pressed — do not lock the camera
    // for the scramble flourish or after it lands.
    this.practiceOrbit = true
    this.scene.setPracticeEnabled(true)
    this.padUnlocked = false
    this.scene.setPadEnabled(false)
    this.emit()
    const my = this.token
    void (async () => {
      await this.scene.zoomRevealScramble()
      if (this.token !== my || this.step !== 0) return
      this.padUnlocked = true
      this.scene.setPadEnabled(true)
      this.practiceOrbit = true
      this.scene.setPracticeEnabled(true)
      this.emit()
    })()
  }

  private async run(step: number, token: number) {
    switch (step) {
      case 1:
        await this.stepWhiteCross(token)
        break
      case 2:
        await this.stepWhiteCorners(token, false)
        break
      case 3:
        await this.stepMiddle(token, true)
        break
      case 4:
        await this.stepYellowCross(token, true)
        break
      case 5:
        await this.stepMatchEdges(token, true)
        break
      case 6:
        await this.stepPlaceCorners(token, true)
        break
      case 7:
        await this.stepTwist(token, true)
        break
    }
  }

  private get model() {
    return this.scene.model
  }

  private async hold(seconds: number, token: number) {
    const ticks = Math.max(1, Math.floor(seconds / 0.1))
    for (let i = 0; i < ticks; i++) {
      if (this.token !== token) return false
      await sleep(100)
    }
    return this.token === token
  }

  private wait(): Promise<void> {
    return new Promise((resolve) => {
      // Resume any stale waiter so a prior cycle cannot hang forever.
      if (this.waiter) {
        const stale = this.waiter
        this.waiter = null
        stale()
      }
      this.waiter = resolve
      this.emit()
    })
  }

  private async confirm(token: number) {
    return this.token === token
  }

  // —— Color helpers ——
  private stageFocus(pieces: Iterable<Vec3>) {
    this.focusHomes = new Set([...pieces].map(key))
  }

  private showFocus(pieces: Iterable<Vec3>) {
    this.stageFocus(pieces)
    this.scene.grayExcept([...GUIDE_CENTERS, ...pieces])
    this.emit()
  }

  private showPlaced() {
    const keep = [...solvedHomes(this.model)].map((k) => {
      const [x, y, z] = k.split(',').map(Number)
      return v3(x, y, z)
    })
    this.scene.grayExcept([...keep, ...GUIDE_CENTERS])
    this.emit()
  }

  private showFullCube() {
    const homes = this.model.pieces.map((p) => p.home)
    this.focusHomes = new Set(homes.map(key))
    this.scene.restoreColors()
    this.emit()
  }

  private whiteEdgeHomes() {
    return WHITE_EDGES.map((e) => e.home)
  }

  private solvedFirstLayerHomes(): Vec3[] {
    const edges = this.whiteEdgeHomes().filter((home) => {
      const p = pieceHome(this.model, home)
      return p && vEq(p.pos, home) && whiteDir(p).y === -1
    })
    const corners = CORNER_HOMES.filter((h) => cornerSolved(this.model, h))
    return [...edges, ...corners]
  }

  private showFirstLayer(plus: Vec3[] = []) {
    const pieces = [...this.solvedFirstLayerHomes(), ...plus]
    const keep = [...pieces, ...GUIDE_CENTERS]
    // Keep formula focus locked on the solving piece (plus) so grayBefore
    // during sexy cannot wander across the whole first layer.
    if (plus.length) this.focusHomes = new Set(plus.map(key))
    this.scene.grayExcept(keep)
    this.emit()
  }

  private showStep1(homes: Vec3[]) {
    const keep = [...homes, ...GUIDE_CENTERS]
    this.scene.grayExcept(keep)
    this.emit()
  }

  private showStep3(current: Vec3 | null) {
    const pieces = [...this.solvedFirstLayerHomes(), ...MID_HOMES]
    if (current) pieces.push(current)
    this.showFocus(pieces)
  }

  private showDaisyWhites(sides: Face[] = []) {
    const stickers: Sticker[] = ALL_FACES.map((f) => ({ home: FACE_NORMAL[f], face: f }))
    for (const edge of WHITE_EDGES) {
      stickers.push({ home: edge.home, face: 'D' })
      if (sides.includes(edge.side)) stickers.push({ home: edge.home, face: edge.side })
    }
    this.scene.grayExceptStickers(stickers)
    this.emit()
  }

  private topEdgeHomes(): Vec3[] {
    return TOP_EDGES.map((p) => pieceAt(this.model, p)?.home).filter(Boolean) as Vec3[]
  }

  private topCornerHomes(): Vec3[] {
    return TOP_CORNERS.map((p) => pieceAt(this.model, p)?.home).filter(Boolean) as Vec3[]
  }

  private showAllTopCorners() {
    const keep = [
      ...[...solvedHomes(this.model)].map((k) => {
        const [x, y, z] = k.split(',').map(Number)
        return v3(x, y, z)
      }),
      ...this.topCornerHomes(),
      ...GUIDE_CENTERS,
    ]
    this.scene.grayExcept(keep)
    this.emit()
  }

  private showYellowCrossFormed() {
    const pieces = [...solvedHomes(this.model)].map((k) => {
      const [x, y, z] = k.split(',').map(Number)
      return v3(x, y, z)
    })
    for (const pos of TOP_EDGES) {
      if (!yellowUp(this.model, pos)) continue
      const home = pieceAt(this.model, pos)?.home
      if (home) pieces.push(home)
    }
    this.scene.grayExcept(pieces)
    this.emit()
  }

  private showMatchedCorners() {
    const keep = [...solvedHomes(this.model)].map((k) => {
      const [x, y, z] = k.split(',').map(Number)
      return v3(x, y, z)
    })
    for (const slot of TOP_CORNERS) {
      if (!cornerPlaced(this.model, slot)) continue
      const home = pieceAt(this.model, slot)?.home
      if (home) keep.push(home)
    }
    this.scene.grayExcept(keep)
    this.emit()
  }

  private grayBefore(moves: Move[]) {
    if (this.step === 7 && movesEqual(moves, [...ALGS.twist])) {
      this.scene.restoreColors()
      return
    }
    // iOS always reapplies guideCenters ∪ focusHomes before a formula cycle.
    const focus = [...this.focusHomes].map((k) => {
      const [x, y, z] = k.split(',').map(Number)
      return v3(x, y, z)
    })
    this.scene.grayExcept([...GUIDE_CENTERS, ...focus])
  }

  private publishCrossPattern() {
    const pattern = topPattern(this.model)
    if (pattern.kind === 'dot' || pattern.kind === 'L' || pattern.kind === 'line') {
      this.crossCase = pattern.kind
      this.crossUps = pattern.ups
    } else {
      this.crossCase = null
      this.crossUps = []
    }
    this.emit()
  }

  private publishSideGhost() {
    const faces: Face[] = []
    for (const pos of TOP_EDGES) {
      if (!edgeMatched(this.model, pos)) continue
      const occupant = pieceAt(this.model, pos)
      if (!occupant) continue
      const side = (['R', 'L', 'F', 'B'] as Face[]).find(
        (f) => FACE_NORMAL[f].x === occupant.home.x && FACE_NORMAL[f].z === occupant.home.z,
      )
      if (side && !faces.includes(side)) faces.push(side)
    }
    this.matchedSideFaces = faces
    this.showSideGhost = faces.length > 0
    this.emit()
  }

  // —— Playback ——
  /** Drop on-cube words (orange / next / bottom) the moment a formula is shown or acted. */
  private cancelWordLabels() {
    if (!this.caption) return
    this.caption = ''
    this.emit()
  }

  private async playMoves(moves: Move[], viewRelative: boolean) {
    if (!moves.length) return
    this.cancelWordLabels()
    const inherited = this.algActing
    this.algActing = true
    this.emit()
    try {
      await this.scene.play(moves, viewRelative, true)
    } finally {
      if (!inherited) {
        this.algActing = false
        this.emit()
      }
    }
  }

  private async oneCycle(moves: Move[], token: number, returnHome = true) {
    if (!moves.length) return this.token === token
    this.cancelWordLabels()
    this.inputLocked = true
    await this.scene.settleMainAngle()
    if (this.token !== token) return false
    this.grayBefore(moves)
    this.advance = 'play'
    this.cancelWordLabels()
    this.playFace = moves.length > 1 ? { kind: 'formula', moves, active: 0 } : { kind: 'play' }
    this.algActing = moves.length > 1
    this.inputLocked = false
    this.emit()
    await this.wait()
    if (this.token !== token) return false
    // The right-pattern cue pose is held only until Play. Turns use the teaching angle.
    this.scene.preserveView = false
    await this.scene.settleMainAngle()
    if (this.token !== token) return false
    this.scene.hideRepeatMark()
    this.scene.hideGuideArrow()
    this.inputLocked = true
    this.cancelWordLabels()
    this.emit()
    for (let index = 0; index < moves.length; index++) {
      if (this.token !== token) return false
      this.advance = 'play'
      if (moves.length > 1) {
        this.cancelWordLabels()
        this.playFace = { kind: 'formula', moves, active: index }
        this.algActing = true
      }
      this.emit()
      await this.playMoves([moves[index]], true)
      if (this.token !== token) return false
      this.scene.reapplyTeachingColors()
    }
    this.algActing = false
    this.playFace = { kind: 'play' }
    if (this.step === 7 && movesEqual(moves, [...ALGS.twist])) this.scene.restoreColors()
    if (this.persistCornerMarks) this.refreshCornerStage()
    this.inputLocked = false
    this.emit()
    if (returnHome) return this.returnToMainAngle(token)
    await this.scene.settleMainAngle()
    return this.token === token
  }

  private async returnToMainAngle(token: number) {
    await this.scene.settleMainAngle()
    if (this.token !== token) return false
    if (this.model.yaw !== 0) {
      await this.scene.animateYaw(0)
      if (this.token !== token) return false
    }
    return true
  }

  private async askAgain(_token: number, _moves: Move[]) {
    return true
  }

  private async pointAndHold(from: Vec3, to: Vec3, token: number, firstFormula = false) {
    await this.scene.guideArrow(from, to, firstFormula)
    if (this.token !== token) return false
    this.scene.hideGuideArrow()
    await this.scene.guideArrow(from, to, firstFormula)
    if (this.token !== token) return false
    if (!(await this.hold(2, token))) return false
    this.scene.hideGuideArrow()
    return this.token === token
  }

  private async runFormula(
    moves: Move[],
    token: number,
    revealed: boolean,
    opts: {
      guideFrom?: Vec3 | null
      guideTo?: Vec3 | null
      anchor?: Vec3 | null
      returnHome?: boolean
      guides?: boolean
      marks?: boolean
      firstFormula?: boolean
    } = {},
  ) {
    const {
      guideFrom = null,
      guideTo = null,
      anchor = null,
      returnHome = true,
      guides = true,
      marks = true,
      firstFormula = false,
    } = opts
    if (revealed) {
      if (marks && anchor) this.scene.showRepeatMark(anchor)
      if (!(await this.askAgain(token, moves))) return false
    } else if (guides && guideFrom && guideTo) {
      if (moves[0]) {
        this.advance = { move: moves[0] }
        this.cancelWordLabels()
        this.playFace = { kind: 'formula', moves, active: 0 }
        this.algActing = true
        this.emit()
      }
      if (firstFormula) {
        // Highlight just ended. The guide can draw while Play is already live —
        // the old point-and-hold locked the button for about two extra seconds.
        void this.scene.guideArrow(guideFrom, guideTo, true)
      } else {
        this.inputLocked = true
        this.emit()
        if (!(await this.pointAndHold(guideFrom, guideTo, token, false))) return false
      }
    }
    return this.oneCycle(moves, token, returnHome)
  }

  private async playUntil(
    token: number,
    moves: Move[],
    reorient: () => number,
    done: () => boolean,
    opts: {
      stay?: boolean
      guideFrom?: Vec3 | null
      guideTo?: Vec3 | null
      anchor?: Vec3 | null
      firstFormula?: boolean
    } = {},
  ) {
    const { stay = false, guideFrom = null, guideTo = null, anchor = null, firstFormula = false } = opts
    let revealed = false
    let spins = 0
    while (this.token === token) {
      if (done()) {
        this.scene.hideRepeatMark()
        return true
      }
      spins++
      if (spins > 8) return true
      if (spins > 1) {
        const yaw = reorient()
        if (!stay || yaw !== this.model.yaw) {
          await this.scene.settleMainAngle()
          if (this.token !== token) return false
          await this.scene.animateYaw(yaw)
          if (this.token !== token) return false
        }
      }
      if (
        !(await this.runFormula(moves, token, revealed, {
          guideFrom: revealed ? null : guideFrom,
          guideTo: revealed ? null : guideTo,
          anchor,
          returnHome: !stay,
          firstFormula,
        }))
      )
        return false
      revealed = true
    }
    return false
  }

  private async playCross(moves: Move[]) {
    if (!moves.length) return
    this.playFace = { kind: 'play' }
    this.advance = 'whiteCross'
    this.emit()
    await this.playMoves(moves, true)
  }

  private async playAuto(moves: Move[], viewRelative: boolean) {
    if (!moves.length) return
    this.inputLocked = true
    this.emit()
    await this.playMoves(moves, viewRelative)
  }

  private async playLesson(moves: Move[], viewRelative: boolean) {
    const token = this.token
    for (const move of moves) {
      if (this.token !== token) return
      this.advance = 'play'
      this.playFace = { kind: 'play' }
      this.inputLocked = false
      this.emit()
      await this.wait()
      if (this.token !== token) return
      this.inputLocked = true
      this.emit()
      await this.playMoves([move], viewRelative)
      if (this.persistCornerMarks) this.refreshCornerStage()
    }
  }

  private async presentResult(token: number) {
    await this.scene.settleMainAngle()
    if (this.token !== token) return false
    if (this.model.yaw !== 0) {
      await this.scene.animateYaw(0)
      if (this.token !== token) return false
    }
    if (isSolved(this.model)) {
      this.celebrate('solved')
      this.celebrating = true
    } else if (this.step > 0) {
      this.celebrate('step')
    }
    if (this.step === 7) this.showFullCube()
    else if (this.step === 4 || this.step === 5) this.showYellowCrossFormed()
    else if (this.step === 6) this.showMatchedCorners()
    else if (this.step === 2) this.showFirstLayer()
    else this.showPlaced()
    if (!(await this.hold(3, token))) return false
    return this.token === token
  }

  private refreshCornerStage() {
    const homes = TOP_CORNERS.filter((home) => {
      const piece = pieceHome(this.model, home)
      return piece && yellowDir(piece).y !== 1
    })
    if (!homes.length) this.scene.hideRepeatMark()
    else this.scene.showRepeatMarks(homes)
  }

  // —— Steps ——
  private async stepWhiteCross(token: number) {
    if (token !== this.token) return
    this.step = 1
    this.caption = ''
    this.inputLocked = true
    this.emit()
    await this.scene.zoomSwap(teachingDaisy(), () => this.showDaisyWhites())
    if (token !== this.token) return
    await this.scene.settleMainAngle()
    if (token !== this.token) return
    this.showDaisyWhites()
    this.playFace = { kind: 'play' }
    this.advance = 'whiteCross'
    this.inputLocked = true
    this.emit()
    if (!(await this.hold(0.7, token))) return

    const drops = frontDrops(this.model)
    const daisyWhites: Sticker[] = WHITE_EDGES.map((e) => ({ home: e.home, face: 'D' }))
    await this.scene.pulseStickers(daisyWhites)
    if (token !== this.token) return
    this.showDaisyWhites()
    const revealed = new Set<Face>()
    for (const drop of drops) {
      if (token !== this.token) return
      this.caption = colorName(drop.side)
      revealed.add(drop.side)
      this.showDaisyWhites([...revealed])
      this.emit()
      if (!(await this.hold(0.8, token))) return
    }
    for (let index = 0; index < drops.length; index++) {
      if (index === 0) this.scene.setRepeatMarksSuppressed(true)
      const ok = await this.teachOneCrossPiece(drops[index], token)
      if (index === 0) this.scene.setRepeatMarksSuppressed(false)
      if (!ok) return
    }
    if (token !== this.token) return
    this.caption = ''
    this.playFace = { kind: 'play' }
    this.advance = 'whiteCross'
    this.showStep1(this.whiteEdgeHomes())
    await this.scene.animateYaw(0)
    if (token !== this.token) return
    await this.scene.animateToWhiteUp()
    if (token !== this.token) return
    this.celebrate('step')
    if (!(await this.hold(3, token))) return
    if (!(await this.confirm(token))) return
    await this.stepWhiteCorners(token, true)
  }

  private async teachOneCrossPiece(
    drop: { home: Vec3; side: Face; yaw: number; aligns: Move[]; drop: boolean },
    token: number,
  ) {
    if (token !== this.token) return false
    this.caption = colorName(drop.side)
    this.showStep1(this.whiteEdgeHomes())
    this.emit()
    await this.scene.animateYaw(drop.yaw)
    if (token !== this.token) return false
    if (drop.aligns.length) {
      await this.playCross(drop.aligns)
      if (token !== this.token) return false
    }
    if (drop.drop || drop.aligns.length) {
      await this.scene.pulseStickers(
        [
          { home: drop.home, face: drop.side },
          { home: FACE_NORMAL[drop.side], face: drop.side },
        ],
        2,
      )
      if (token !== this.token) return false
    }
    if (drop.drop) {
      await this.playCross([{ face: 'F', suffix: 'two' }])
      if (token !== this.token) return false
      if (!(await this.hold(0.35, token))) return false
    } else if (!drop.aligns.length) {
      if (!(await this.hold(0.8, token))) return false
    }
    return token === this.token
  }

  private nextCornerHome(): Vec3 | null {
    const open = CORNER_HOMES.filter((h) => !cornerSolved(this.model, h))
    const onTop = open.find((h) => pieceHome(this.model, h)?.pos.y === 1)
    return onTop ?? open[0] ?? null
  }

  private async stepWhiteCorners(token: number, fromCross: boolean) {
    if (token !== this.token) return
    this.step = 2
    this.caption = ''
    this.advance = 'bottomLayer'
    this.inputLocked = false
    this.emit()
    await this.wait()
    if (token !== this.token) return
    this.inputLocked = true
    this.emit()
    if (fromCross) {
      await this.scene.levelCube()
      if (token !== this.token) return
      if (this.model.yaw !== 0) {
        await this.scene.animateYaw(0)
        if (token !== this.token) return
      }
      await this.scene.restCamera()
    } else {
      const cube = prepared('cross')
      cube.flipped = true
      await this.scene.fade(cube, () => this.showFirstLayer())
      if (token !== this.token) return
      await this.scene.restCamera()
    }
    this.showFirstLayer()
    if (this.model.flipped) {
      await this.scene.animateFlip(false)
      if (token !== this.token) return
    }

    let taughtFirst = false
    let guardCount = 0
    while (token === this.token) {
      guardCount++
      if (guardCount > 12) break
      const home = this.nextCornerHome()
      if (!home) break
      const prep = cornerPrep(this.model, home)
      if (!prep) break
      this.inputLocked = true
      this.showFirstLayer([home])
      let ready = true
      if (!taughtFirst) {
        taughtFirst = true
        if (!(await this.previewFirstCorner(home, prep.yaw, token))) return
        this.showFirstLayer([home])
        if (prep.popYaw != null) {
          await this.scene.settleMainAngle()
          await this.scene.animateYaw(prep.popYaw)
          if (token !== this.token) return
          this.stageFocus([home])
          this.scene.grayExcept([...GUIDE_CENTERS, home])
          await this.playAuto([...ALGS.sexy], true)
          if (token !== this.token) return
          const again = cornerPrep(this.model, home)
          if (again) {
            if (!(await this.autoAlignCorner(home, again, token))) return
          } else ready = false
        } else {
          if (!(await this.autoAlignCorner(home, prep, token))) return
        }
      } else if (prep.popYaw != null) {
        await this.scene.settleMainAngle()
        await this.scene.animateYaw(prep.popYaw)
        if (token !== this.token) return
        this.stageFocus([home])
        const popFrom = pieceHome(this.model, home)?.pos ?? home
        if (
          !(await this.runFormula([...ALGS.sexy], token, false, {
            guideFrom: popFrom,
            guideTo: home,
            anchor: home,
            returnHome: false,
            firstFormula: true,
          }))
        )
          return
        const again = cornerPrep(this.model, home)
        if (again) {
          this.showFirstLayer([home])
          if (!(await this.alignCorner(home, again, token, true))) return
        } else ready = false
      } else {
        if (!(await this.alignCorner(home, prep, token, true))) return
      }
      if (token !== this.token) return
      if (ready) {
        if (!(await this.highlightCornerSolve(home, token))) return
        this.stageFocus([home])
        const from = pieceHome(this.model, home)?.pos ?? home
        if (
          !(await this.playUntil(
            token,
            [...ALGS.sexy],
            () => this.model.yaw,
            () => cornerSolved(this.model, home),
            { stay: true, guideFrom: from, guideTo: home, anchor: home, firstFormula: true },
          ))
        )
          return
        if (cornerSolved(this.model, home)) {
          if (!(await this.showSolvedWhiteCorner(home, token))) return
        }
      }
      this.showFirstLayer()
      const more = CORNER_HOMES.some((h) => !cornerSolved(this.model, h))
      if (more) {
        this.celebrate('piece')
        this.caption = 'Next'
        this.emit()
        if (!(await this.confirm(token))) return
      }
    }
    if (token !== this.token) return
    this.caption = ''
    if (!(await this.presentResult(token))) return
    if (!(await this.confirm(token))) return
    await this.stepMiddle(token, false)
  }

  private async previewFirstCorner(home: Vec3, project: number, token: number) {
    const wrongYaw = this.model.yaw
    this.advance = 'play'
    this.playFace = { kind: 'play' }
    this.showFirstLayer([home])
    if (!(await this.hold(0.5, token))) return false
    if (this.model.yaw !== project) {
      await this.scene.settleMainAngle()
      await this.scene.animateYaw(project)
      if (token !== this.token) return false
    }
    this.scene.showRepeatMark(home)
    if (!(await this.hold(0.9, token))) return false
    this.scene.hideRepeatMark()
    if (this.model.yaw !== wrongYaw) {
      await this.scene.settleMainAngle()
      await this.scene.animateYaw(wrongYaw)
      if (token !== this.token) return false
    }
    this.showFirstLayer([home])
    this.advance = 'play'
    this.playFace = { kind: 'play' }
    this.inputLocked = false
    this.emit()
    await this.wait()
    if (token !== this.token) return false
    this.inputLocked = true
    this.emit()
    return true
  }

  private async autoAlignCorner(
    home: Vec3,
    prep: { yaw: number; uMoves: Move[] },
    token: number,
  ) {
    this.advance = 'play'
    this.playFace = { kind: 'play' }
    this.emit()
    if (this.model.yaw !== prep.yaw) {
      this.showFirstLayer([home])
      await this.scene.settleMainAngle()
      await this.scene.animateYaw(prep.yaw)
      if (token !== this.token) return false
    }
    if (prep.uMoves.length) {
      this.showFirstLayer([home])
      await this.playAuto(prep.uMoves, false)
      if (token !== this.token) return false
    }
    return token === this.token
  }

  private async alignCorner(
    home: Vec3,
    prep: { yaw: number; uMoves: Move[] },
    token: number,
    spinToSlot: boolean,
  ) {
    if (spinToSlot && this.model.yaw !== prep.yaw) {
      this.showFirstLayer([home])
      await this.scene.settleMainAngle()
      await this.scene.animateYaw(prep.yaw)
      if (token !== this.token) return false
    }
    if (prep.uMoves.length) {
      this.showFirstLayer([home])
      await this.scene.settleMainAngle()
      await this.playLesson(prep.uMoves, false)
      if (token !== this.token) return false
    }
    return token === this.token
  }

  private async highlightCornerSolve(home: Vec3, token: number) {
    this.showFirstLayer([home])
    await this.scene.pulseStickers([{ home, face: 'D' }], 3)
    if (token !== this.token) return false
    const sides = slotSideFaces(home, this.model.yaw)
    await this.scene.pulseStickers(
      [
        { home, face: sides.front },
        { home: FACE_NORMAL[sides.front], face: sides.front },
      ],
      2,
    )
    if (token !== this.token) return false
    await this.scene.pulseStickers(
      [
        { home, face: sides.right },
        { home: FACE_NORMAL[sides.right], face: sides.right },
      ],
      2,
    )
    return token === this.token
  }

  private async showSolvedWhiteCorner(home: Vec3, token: number) {
    this.showFirstLayer()
    await this.scene.settleMainAngle()
    if (token !== this.token) return false
    await this.scene.animateYaw(yawFor(home.x, home.z), true)
    if (token !== this.token) return false
    this.showFirstLayer()
    await this.scene.revealWhiteFace()
    if (token !== this.token) return false
    await this.scene.settleMainAngle()
    await this.scene.animateYaw(0, true)
    return token === this.token
  }

  private async stepMiddle(token: number, fresh: boolean) {
    if (token !== this.token) return
    this.step = 3
    this.showMiddleSlides = true
    this.middleSlide = null
    this.emit()
    if (fresh) {
      this.inputLocked = true
      this.caption = ''
      this.emit()
      await this.scene.fade(prepared('firstLayer'), () => {
        const first = MID_HOMES.find((h) => !midSolved(this.model, h)) ?? null
        this.showStep3(first)
      })
      if (token !== this.token) return
      await this.scene.settleMainAngle()
    }
    const first = MID_HOMES.find((h) => !midSolved(this.model, h)) ?? null
    if (first) this.showStep3(first)
    else this.showPlaced()
    this.ensureLeftToRightMiddle()
    const first2 = MID_HOMES.find((h) => !midSolved(this.model, h)) ?? null
    if (first2) this.showStep3(first2)

    let guardCount = 0
    while (token === this.token) {
      guardCount++
      if (guardCount > 12) break
      if (MID_HOMES.every((h) => midSolved(this.model, h))) break
      const top = MID_HOMES.find((h) => pieceHome(this.model, h)?.pos.y === 1)
      if (top) {
        const plan = middlePlan(this.model, top)
        if (!plan) break
        this.showStep3(top)
        this.inputLocked = true
        this.emit()
        if (plan.uMoves.length) {
          await this.scene.settleMainAngle()
          this.showStep3(top)
          await this.playLesson(plan.uMoves, false)
          if (token !== this.token) return
        }
        const aligned = middlePlan(this.model, top)
        if (!aligned) break
        this.showStep3(top)
        const placedAt = pieceHome(this.model, top)?.pos ?? top
        const solvedMid = MID_HOMES.filter((h) => midSolved(this.model, h)).length
        let cueYaw: number
        if (solvedMid >= 2) {
          cueYaw = this.yawShowingCue(placedAt, top, [aligned.side, aligned.roof])
        } else {
          cueYaw = yawRight(v3(placedAt.x, 0, placedAt.z))
        }
        if (this.model.yaw !== cueYaw) {
          await this.scene.settleMainAngle()
          await this.scene.animateYaw(cueYaw)
          if (token !== this.token) return
        }
        this.showStep3(top)
        this.middleSlide = aligned.right ? 'right' : 'left'
        this.emit()
        await this.scene.pulseStickers(
          [
            { home: top, face: aligned.side },
            { home: FACE_NORMAL[aligned.side], face: aligned.side },
          ],
          3,
        )
        if (token !== this.token) return
        await this.scene.pulseStickers(
          [
            { home: top, face: aligned.roof },
            { home: FACE_NORMAL[aligned.roof], face: aligned.roof },
          ],
          3,
        )
        if (token !== this.token) return
        const alg = aligned.right ? [...ALGS.middleRight] : [...ALGS.middleLeft]
        this.cancelWordLabels()
        const from = pieceHome(this.model, top)?.pos ?? top
        if (alg[0]) {
          this.advance = { move: alg[0] }
          this.playFace = { kind: 'formula', moves: alg, active: 0 }
          this.algActing = true
          this.emit()
        }
        this.inputLocked = true
        this.emit()
        // Highlight finished. For the to-the-right pattern, spin until every
        // exclamation mark and solving piece is on the camera side.
        if (aligned.right) {
          if (!(await this.presentMiddleRight(token, from, top, aligned.side, aligned.roof))) return
        } else if (
          !(await this.presentMiddleArrow(
            token,
            aligned.yaw,
            from,
            top,
            FACE_NORMAL[aligned.side],
          ))
        )
          return
        this.showStep3(top)
        if (
          !(await this.playUntil(
            token,
            alg,
            () => middlePlan(this.model, top)?.yaw ?? this.model.yaw,
            () => midSolved(this.model, top),
            { stay: true, anchor: top },
          ))
        )
          return
        if (midSolved(this.model, top)) {
          if (!(await this.showSolvedMiddleEdge(top, token))) return
        }
        this.middleSlide = null
        this.emit()
        const more = MID_HOMES.some((h) => !midSolved(this.model, h))
        if (more) {
          this.celebrate('piece')
          this.caption = 'Next'
          const next = MID_HOMES.find((h) => !midSolved(this.model, h))
          if (next) this.showStep3(next)
          this.emit()
          if (!(await this.confirm(token))) return
        }
      } else {
        const stuck = MID_HOMES.find((h) => !midSolved(this.model, h))
        const pos = stuck && pieceHome(this.model, stuck)?.pos
        if (!stuck || !pos) break
        this.showStep3(stuck)
        this.inputLocked = true
        this.caption = ''
        this.emit()
        const cueYaw = yawRight(v3(pos.x, 0, pos.z))
        if (this.model.yaw !== cueYaw) {
          await this.scene.settleMainAngle()
          await this.scene.animateYaw(cueYaw)
          if (token !== this.token) return
        }
        this.middleSlide = 'right'
        this.emit()
        for (const pair of this.middleColorPairs(stuck)) {
          await this.scene.pulseStickers(pair, 3)
          if (token !== this.token) return
        }
        const alg = [...ALGS.middleRight]
        if (alg[0]) {
          this.advance = { move: alg[0] }
          this.playFace = { kind: 'formula', moves: alg, active: 0 }
          this.emit()
        }
        const shown = pieceHome(this.model, stuck)?.pos ?? pos
        const faces = this.middleColorPairs(stuck).map((pair) => pair[0].face)
        if (!(await this.presentMiddleRight(token, shown, stuck, faces[0] ?? 'F', faces[1] ?? faces[0] ?? 'R')))
          return
        this.showStep3(stuck)
        if (
          !(await this.playUntil(
            token,
            alg,
            () => {
              const p = pieceHome(this.model, stuck)?.pos
              return p ? yawFor(p.x, p.z) : this.model.yaw
            },
            () => {
              const p = pieceHome(this.model, stuck)
              return (p && p.pos.y === 1) || midSolved(this.model, stuck)
            },
            { stay: true, anchor: stuck },
          ))
        )
          return
        if (midSolved(this.model, stuck)) {
          if (!(await this.showSolvedMiddleEdge(stuck, token))) return
        }
        this.middleSlide = null
        this.emit()
      }
    }
    if (token !== this.token) return
    this.middleSlide = null
    this.showMiddleSlides = false
    this.caption = ''
    this.emit()
    if (!(await this.presentResult(token))) return
    if (!(await this.confirm(token))) return
    await this.stepYellowCross(token, false)
  }

  private middleColorPairs(home: Vec3): Sticker[][] {
    const order: Face[] = ['R', 'L', 'F', 'B']
    return order
      .filter((face) => {
        const n = FACE_NORMAL[face]
        return (n.x !== 0 && n.x === home.x) || (n.z !== 0 && n.z === home.z)
      })
      .map((face) => [
        { home, face },
        { home: FACE_NORMAL[face], face },
      ])
  }

  /**
   * To-the-right middle insert: after the highlight, yaw and orbit so the
   * piece, the slot, both centers, their ! marks, and the narrow arrow sit
   * on the side facing the camera.
   */
  private async presentMiddleRight(
    token: number,
    piece: Vec3,
    slot: Vec3,
    side: Face,
    roof: Face,
  ) {
    await this.scene.settleMainAngle()
    if (this.token !== token) return false
    const cues = [piece, slot, FACE_NORMAL[side], FACE_NORMAL[roof]]
    const yaw = bestVisibleYaw(cues)
    await this.scene.animateYaw(yaw)
    if (this.token !== token) return false
    const facing = this.scene.localCameraDir()
    this.scene.showCueMarks(cues)
    this.scene.narrowArrow(piece, slot, facing)
    this.scene.frameCues(cues)
    this.scene.preserveView = true
    return true
  }

  /**
   * After the middle-layer highlight, yaw the insert face toward the camera
   * and draw the thin "to the right / left" arrow in that view.
   */
  private async presentMiddleArrow(
    token: number,
    yaw: number,
    from: Vec3,
    to: Vec3,
    facing: Vec3,
  ) {
    await this.scene.settleMainAngle()
    if (this.token !== token) return false
    await this.scene.animateYaw(yaw)
    if (this.token !== token) return false
    this.scene.narrowArrow(from, to, facing)
    return this.token === token
  }

  private yawShowingCue(from: Vec3, _to: Vec3, _faces: Face[]): number {
    // Simplified: prefer yaw that puts `to` on the right
    return yawRight(v3(from.x, 0, from.z))
  }

  private ensureLeftToRightMiddle() {
    const leftExists = () => {
      for (const home of MID_HOMES) {
        if (midSolved(this.model, home)) continue
        if (pieceHome(this.model, home)?.pos.x === -1) return true
        if (middlePlan(this.model, home)?.side === 'L') return true
      }
      return false
    }
    if (leftExists()) return
    const algos = [ALGS.middleLeft, ALGS.middleRight, invertMoves([...ALGS.middleLeft]), invertMoves([...ALGS.middleRight])]
    for (let yaw = 0; yaw < 4; yaw++) {
      for (const alg of algos) {
        const cube = cloneState(this.model)
        cube.yaw = yaw
        for (const m of alg) applyView(cube, m)
        normalizeOrientation(cube)
        if (firstLayerSolved(cube)) {
          // check left
          let ok = false
          for (const home of MID_HOMES) {
            if (midSolved(cube, home)) continue
            if (pieceHome(cube, home)?.pos.x === -1) ok = true
            if (middlePlan(cube, home)?.side === 'L') ok = true
          }
          if (ok) {
            this.scene.replaceModel(cube)
            return
          }
        }
      }
    }
  }

  private async showSolvedMiddleEdge(home: Vec3, token: number) {
    this.showStep3(home)
    await this.scene.settleMainAngle()
    if (token !== this.token) return false
    const pos = pieceHome(this.model, home)?.pos ?? home
    await this.scene.animateYaw(yawFor(pos.x, pos.z), true)
    if (token !== this.token) return false
    this.showStep3(home)
    const stickers = this.middleColorPairs(home).flat()
    await this.scene.pulseStickers(stickers, 2)
    if (token !== this.token) return false
    await this.scene.settleMainAngle()
    await this.scene.animateYaw(0, true)
    return token === this.token
  }

  private async stepYellowCross(token: number, fresh: boolean) {
    if (token !== this.token) return
    this.step = 4
    if (fresh) {
      this.inputLocked = true
      this.emit()
      await this.scene.fade(prepared('f2l'))
      if (token !== this.token) return
      await this.scene.restCamera()
    }
    this.ensureYellowCrossStart()
    if (token !== this.token) return
    this.showFocus(this.topEdgeHomes())
    this.showCrossCards = true
    this.publishCrossPattern()
    let again = false
    let guardCount = 0
    while (token === this.token && topPattern(this.model).kind !== 'cross') {
      guardCount++
      if (guardCount > 4) break
      if (again) {
        if (!(await this.askAgain(token, [...ALGS.yellowCross]))) return
      }
      this.inputLocked = true
      this.showFocus(this.topEdgeHomes())
      const align = yellowAlignMoves(this.model)
      if (align.length) {
        await this.scene.settleMainAngle()
        this.showFocus(this.topEdgeHomes())
        await this.playLesson(align, false)
        if (token !== this.token) return
      }
      if (topPattern(this.model).kind === 'cross') break
      this.caption = ''
      this.showFocus(this.topEdgeHomes())
      this.publishCrossPattern()
      await this.scene.settleMainAngle()
      if (token !== this.token) return
      const pattern = this.yellowPatternGroups().flat()
      await this.scene.pulseStickers(pattern, 3)
      if (token !== this.token) return
      this.showFocus(this.topEdgeHomes())
      if (
        !(await this.runFormula([...ALGS.yellowCross], token, false, {
          returnHome: true,
          guides: false,
          marks: false,
        }))
      )
        return
      again = true
      if (topPattern(this.model).kind === 'cross') break
    }
    if (token !== this.token) return
    this.showCrossCards = false
    this.crossCase = null
    this.crossUps = []
    this.caption = ''
    this.emit()
    if (!(await this.presentResult(token))) return
    if (!(await this.confirm(token))) return
    await this.stepMatchEdges(token, false)
  }

  private ensureYellowCrossStart() {
    const cube = cloneState(this.model)
    let spins = 0
    while (spins < 4) {
      const kind = topPattern(cube).kind
      if (kind === 'dot' || kind === 'L' || kind === 'line') break
      spins++
      if (kind === 'cross') {
        applyMoves(cube, parseMoves("F U R U' R' F'"))
      } else {
        solveYellowCross(cube)
      }
    }
    const kind = topPattern(cube).kind
    if (!(kind === 'dot' || kind === 'L' || kind === 'line')) return
    if (kind === topPattern(this.model).kind) return
    normalizeOrientation(cube)
    this.scene.replaceModel(cube)
  }

  private yellowPatternGroups(): Sticker[][] {
    const pattern = topPattern(this.model)
    const edges: Sticker[][] = []
    pattern.ups.forEach((up, index) => {
      if (!up) return
      const occupant = pieceAt(this.model, TOP_EDGES[index])
      if (occupant) edges.push([{ home: occupant.home, face: 'U' }])
    })
    const center: Sticker[] = [{ home: v3(0, 1, 0), face: 'U' }]
    if (pattern.kind === 'dot') return [center]
    if (pattern.kind === 'L' || pattern.kind === 'line') return [...edges, center]
    return edges.length ? [...edges, center] : [center]
  }

  private async stepMatchEdges(token: number, fresh: boolean) {
    if (token !== this.token) return
    this.step = 5
    if (fresh) {
      this.inputLocked = true
      this.emit()
      await this.scene.fade(prepared('yellowCross'))
      if (token !== this.token) return
      await this.scene.restCamera()
    }
    this.ensureUnmatchedSides()
    if (token !== this.token) return
    this.showFocus(this.topEdgeHomes())
    this.publishSideGhost()
    let again = false
    let guardCount = 0
    while (token === this.token && matchCount(this.model) < 4) {
      guardCount++
      if (guardCount > 6) break
      if (again) {
        this.inputLocked = true
        this.emit()
        if (!(await this.hold(3, token))) return
      }
      this.inputLocked = true
      this.showFocus(this.topEdgeHomes())
      const align = uMoves(bestUCount(this.model))
      if (align.length) {
        await this.scene.settleMainAngle()
        this.showFocus(this.topEdgeHomes())
        if (again) await this.playAuto(align, false)
        else await this.playLesson(align, false)
        if (token !== this.token) return
      }
      if (matchCount(this.model) === 4) break
      this.showFocus(this.topEdgeHomes())
      this.publishSideGhost()
      if (!(await this.presentEdgeCase(token))) return
      if (matchCount(this.model) === 4) break
      this.stageFocus(this.topEdgeHomes())
      if (
        !(await this.runFormula([...ALGS.sune], token, false, {
          guides: false,
          marks: false,
        }))
      )
        return
      this.publishSideGhost()
      again = true
      if (!(await this.returnToMainAngle(token))) return
    }
    if (token !== this.token) return
    this.publishSideGhost()
    if (!(await this.celebrateMatchedSides(token))) return
    this.showSideGhost = false
    this.caption = ''
    this.emit()
    if (!(await this.presentResult(token))) return
    if (!(await this.confirm(token))) return
    await this.stepPlaceCorners(token, false)
  }

  private ensureUnmatchedSides() {
    if (bestMatchCount(this.model) < 4) return
    const cube = cloneState(this.model)
    cube.yaw = 0
    cube.flipped = false
    for (const m of ALGS.sune) applyView(cube, m)
    normalizeOrientation(cube)
    this.scene.replaceModel(cube)
  }

  private async presentEdgeCase(token: number) {
    const count = matchCount(this.model)
    this.caption = ''
    if (count <= 0) {
      this.showFocus(this.topEdgeHomes())
      await this.scene.settleMainAngle()
      await this.scene.animateYaw(0)
      return token === this.token
    }
    if (count === 1) {
      const pos = TOP_EDGES.find((e) => edgeMatched(this.model, e))
      if (pos) {
        const right = yawRight(v3(pos.x, 0, pos.z))
        this.showFocus(this.topEdgeHomes())
        await this.scene.settleMainAngle()
        await this.scene.animateYaw(right)
        if (token !== this.token) return false
        await this.scene.pulseStickers(this.edgeMatchStickers(pos), 2)
        if (token !== this.token) return false
        const project = suneYaw(this.model)
        if (project !== this.model.yaw) {
          await this.scene.settleMainAngle()
          await this.scene.animateYaw(project)
          if (token !== this.token) return false
        }
        return true
      }
    }
    const project = adjacentMatchYaw(this.model)
    if (project != null) {
      this.showFocus(this.topEdgeHomes())
      await this.scene.settleMainAngle()
      await this.scene.animateYaw(project)
      if (token !== this.token) return false
      const matched = TOP_EDGES.filter((e) => edgeMatched(this.model, e))
      const stickers = matched.flatMap((p) => this.edgeMatchStickers(p))
      await this.scene.pulseStickers(stickers, 2)
      if (token !== this.token) return false
      return true
    }
    this.showFocus(this.topEdgeHomes())
    await this.scene.settleMainAngle()
    await this.scene.animateYaw(0)
    return token === this.token
  }

  private edgeMatchStickers(pos: Vec3): Sticker[] {
    const occupant = pieceAt(this.model, pos)
    if (!occupant) return []
    const side = (['R', 'L', 'F', 'B'] as Face[]).find(
      (f) => FACE_NORMAL[f].x === occupant.home.x && FACE_NORMAL[f].z === occupant.home.z,
    )
    if (!side) return []
    return [
      { home: occupant.home, face: side },
      { home: FACE_NORMAL[side], face: side },
    ]
  }

  private async celebrateMatchedSides(token: number) {
    this.showFocus(this.topEdgeHomes())
    for (let yaw = 0; yaw < 4; yaw++) {
      if (token !== this.token) return false
      await this.scene.settleMainAngle()
      await this.scene.animateYaw(yaw)
      if (token !== this.token) return false
      const pos = localOfView(this.model, 0, 1, 1)
      if (edgeMatched(this.model, pos)) {
        await this.scene.pulseStickers(this.edgeMatchStickers(pos), 2)
        if (token !== this.token) return false
      }
    }
    return token === this.token
  }

  private async stepPlaceCorners(token: number, fresh: boolean) {
    if (token !== this.token) return
    this.step = 6
    if (fresh) {
      this.inputLocked = true
      this.emit()
      await this.scene.fade(prepared('edges'))
      if (token !== this.token) return
      await this.scene.restCamera()
    }
    this.ensureUnplacedCorner()
    if (token !== this.token) return
    this.showAllTopCorners()
    this.showCornerCycle = true
    this.emit()
    let guardCount = 0
    while (
      token === this.token &&
      TOP_CORNERS.filter((c) => cornerPlaced(this.model, c)).length < 4
    ) {
      guardCount++
      if (guardCount > 6) break
      this.inputLocked = true
      this.advance = 'play'
      this.playFace = { kind: 'play' }
      this.showAllTopCorners()
      this.emit()
      if (!(await this.introducePlaceCorners(token))) return
      this.caption = ''
      this.stageFocus(this.topCornerHomes())
      const placedBefore = new Set(
        TOP_CORNERS.filter((c) => cornerPlaced(this.model, c)).map(key),
      )
      if (
        !(await this.runFormula([...ALGS.placeCorners], token, false, {
          returnHome: false,
          guides: false,
          marks: false,
        }))
      )
        return
      const finished = TOP_CORNERS.every((c) => cornerPlaced(this.model, c))
      if (finished) break
      const gained = TOP_CORNERS.filter(
        (c) => cornerPlaced(this.model, c) && !placedBefore.has(key(c)),
      )
      if (gained.length) {
        if (!(await this.tourJustPlacedCorners(token))) return
      }
    }
    if (token !== this.token) return
    this.scene.hideRepeatMark()
    this.showCornerCycle = false
    this.caption = ''
    this.emit()
    if (!(await this.tourSolvedCorners(token))) return
    if (!(await this.presentResult(token))) return
    if (!(await this.confirm(token))) return
    await this.stepTwist(token, false)
  }

  private ensureUnplacedCorner() {
    if (TOP_CORNERS.some((c) => !cornerPlaced(this.model, c))) return
    const cube = cloneState(this.model)
    cube.yaw = 0
    cube.flipped = false
    for (const m of ALGS.placeCorners) applyView(cube, m)
    normalizeOrientation(cube)
    this.scene.replaceModel(cube)
  }

  private async slowYaw(yaw: number, token: number) {
    await this.scene.settleMainAngle()
    if (token !== this.token) return false
    await this.scene.animateYaw(yaw, true)
    return token === this.token
  }

  private async introducePlaceCorners(token: number) {
    this.showAllTopCorners()
    if (!(await this.slowYaw(0, token))) return false
    this.showAllTopCorners()
    // pulse project Y/G/O
    const home = pieceAt(this.model, ufrSlot(this.model))?.home
    if (home) {
      await this.scene.pulseStickers([{ home, face: 'U' }], 3)
      if (token !== this.token) return false
      await this.scene.pulseStickers(this.colorOnlyStickers(home, 'F'), 2)
      if (token !== this.token) return false
      await this.scene.pulseStickers(this.colorOnlyStickers(home, 'R'), 2)
      if (token !== this.token) return false
    }
    for (let offset = 1; offset < 4; offset++) {
      const aimed = cloneState(this.model)
      aimed.yaw = offset
      const shown = ufrSlot(aimed)
      if (vEq(shown, v3(1, 1, 1)) || cornerPlaced(this.model, shown)) continue
      const h = pieceAt(this.model, shown)?.home
      if (!h) continue
      if (!(await this.slowYaw(offset, token))) return false
      this.showAllTopCorners()
      this.scene.showRepeatMark(h)
      if (!(await this.hold(2, token))) return false
      this.scene.hideRepeatMark()
    }
    this.scene.hideRepeatMark()
    if (!(await this.slowYaw(0, token))) return false
    this.showAllTopCorners()
    return true
  }

  private colorOnlyStickers(home: Vec3, face: Face): Sticker[] {
    const stickers: Sticker[] = [{ home: FACE_NORMAL[face], face }]
    const n = FACE_NORMAL[face]
    const owns = (n.x !== 0 && n.x === home.x) || (n.z !== 0 && n.z === home.z)
    if (owns) stickers.push({ home, face })
    return stickers
  }

  private async tourJustPlacedCorners(token: number) {
    this.showAllTopCorners()
    if (!(await this.slowYaw(0, token))) return false
    return this.slowYaw(0, token)
  }

  private async tourSolvedCorners(token: number) {
    this.showAllTopCorners()
    for (let offset = 0; offset < 4; offset++) {
      if (!(await this.slowYaw(offset, token))) return false
      this.showAllTopCorners()
      const home = pieceAt(this.model, ufrSlot(this.model))?.home
      if (home) {
        const stickers: Sticker[] = [{ home, face: 'U' }]
        for (const face of ['R', 'F', 'L', 'B'] as Face[]) {
          const n = FACE_NORMAL[face]
          if ((n.x !== 0 && n.x === home.x) || (n.z !== 0 && n.z === home.z)) {
            stickers.push({ home, face })
          }
        }
        await this.scene.pulseStickers(stickers, 1)
        if (token !== this.token) return false
      }
      if (!(await this.hold(2, token))) return false
    }
    return this.slowYaw(0, token)
  }

  private async stepTwist(token: number, fresh: boolean) {
    if (token !== this.token) return
    this.step = 7
    if (fresh) {
      this.inputLocked = true
      this.emit()
      await this.scene.fade(prepared('cornersPlaced'))
      if (token !== this.token) return
      await this.scene.restCamera()
      this.ensureTwistedCorner()
      if (token !== this.token) return
    }
    this.showFullCube()
    this.inputLocked = true
    await this.scene.settleMainAngle()
    await this.scene.animateYaw(0)
    if (token !== this.token) return
    this.persistCornerMarks = true
    this.refreshCornerStage()
    // tour matched angles briefly
    for (let yaw = 0; yaw < 4; yaw++) {
      if (!(await this.slowYaw(yaw, token))) return
    }
    if (!(await this.slowYaw(0, token))) return
    this.showFullCube()
    this.refreshCornerStage()

    let guardCount = 0
    while (token === this.token && twistedSlots(this.model).length > 0) {
      guardCount++
      if (guardCount > 16) break
      this.inputLocked = true
      this.emit()
      if (!twisted(this.model, ufrSlot(this.model))) {
        const turns = uMovesUntilTwistedAtUFR(this.model)
        if (turns.length) {
          this.caption = 'Next'
          this.showFullCube()
          await this.scene.settleMainAngle()
          this.showFullCube()
          await this.playLesson(turns, false)
          if (token !== this.token) return
        }
      }
      if (!twisted(this.model, ufrSlot(this.model))) break
      const home = pieceAt(this.model, ufrSlot(this.model))?.home
      this.showFullCube()
      this.caption = ''
      this.scene.hideRepeatMark()
      let revealed = false
      let spins = 0
      while (token === this.token) {
        spins++
        if (spins > 8) break
        this.showFullCube()
        this.refreshCornerStage()
        if (
          !(await this.runFormula([...ALGS.twist], token, revealed, {
            anchor: home ?? null,
            returnHome: false,
            guides: false,
            marks: false,
          }))
        )
          return
        revealed = true
        this.refreshCornerStage()
        const slot = ufrSlot(this.model)
        const back =
          pieceAt(this.model, slot)?.home &&
          home &&
          vEq(pieceAt(this.model, slot)!.home, home) &&
          yellowUp(this.model, slot)
        if (back) {
          this.showFullCube()
          this.refreshCornerStage()
          if (home) {
            await this.scene.pulseStickers([{ home, face: 'U' }], 3)
            if (token !== this.token) return
          }
          break
        }
        this.caption = 'Bottom looks messy'
        this.emit()
      }
      const more = twistedSlots(this.model)
      this.showFullCube()
      this.refreshCornerStage()
      if (more.length) {
        this.celebrate('piece')
        this.caption = ''
        this.emit()
      }
    }
    if (token !== this.token) return
    this.persistCornerMarks = false
    this.scene.hideRepeatMark()
    this.inputLocked = true
    const finish = uMovesUntilSolved(this.model)
    if (finish.length) {
      this.showFullCube()
      await this.scene.settleMainAngle()
      this.showFullCube()
      await this.playLesson(finish, false)
      if (token !== this.token) return
    }
    await this.scene.animateYaw(0)
    if (token !== this.token) return
    this.caption = ''
    if (!(await this.presentResult(token))) return
    this.inputLocked = true
    if (isSolved(this.model)) {
      this.celebrating = true
      await this.scene.settleMainAngle()
    }
    if (token !== this.token) return
    this.step = 0
    this.playFace = { kind: 'play' }
    this.advance = 'start'
    this.inputLocked = false
    this.practiceOrbit = true
    this.scene.setPracticeEnabled(true)
    this.scene.restoreColors()
    this.emit()
  }

  private ensureTwistedCorner() {
    if (twistedSlots(this.model).length) return
    const cube = cloneState(this.model)
    cube.yaw = yawFor(1, 1)
    for (const m of ALGS.twist) applyView(cube, m)
    normalizeOrientation(cube)
    this.scene.replaceModel(cube)
  }
}
