import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  COLORS,
  FACE_NORMAL,
  FACE_AXIS,
  FACE_LAYER,
  type Axis,
  type CubeState,
  type Face,
  type Move,
  type Sticker,
  type Vec3,
  signedQuarters,
  cloneState,
  applyLocal,
  withFace,
  viewToLocal,
  solved,
  isSolved,
  key,
  randomScramble,
  applyMoves,
  normalizeOrientation,
} from './model'

export type TeachSpeed = 'slow' | 'normal' | 'fast' | 'faster'

export const SPEED_FACTOR: Record<TeachSpeed, number> = {
  slow: 1,
  normal: 0.58,
  fast: 0.34,
  faster: 0.2,
}

export const SPEED_LABEL: Record<TeachSpeed, string> = {
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
  faster: 'Faster',
}

/** iOS lessonQuarter = 2.0s at Slow; scaled by teachSpeed.factor */
const LESSON_QUARTER_MS = 2000
const REST = new THREE.Vector3(6.2, 5.2, 7.6)

type CubieMesh = THREE.Group & {
  userData: { home: THREE.Vector3; stickers: Map<Face, THREE.Mesh> }
}

function faceColor(face: Face, gray?: boolean): THREE.Color {
  return new THREE.Color(gray ? COLORS.grayed : COLORS[face])
}

function stickerOrientation(face: Face): THREE.Quaternion {
  const q = new THREE.Quaternion()
  switch (face) {
    case 'F':
      return q
    case 'B':
      return q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
    case 'U':
      return q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
    case 'D':
      return q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
    case 'R':
      return q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
    case 'L':
      return q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)
  }
}

function roundedStickerGeometry(size = 0.68, radius = 0.16): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  const hw = size / 2
  const r = Math.min(radius, hw)
  shape.moveTo(-hw + r, -hw)
  shape.lineTo(hw - r, -hw)
  shape.quadraticCurveTo(hw, -hw, hw, -hw + r)
  shape.lineTo(hw, hw - r)
  shape.quadraticCurveTo(hw, hw, hw - r, hw)
  shape.lineTo(-hw + r, hw)
  shape.quadraticCurveTo(-hw, hw, -hw, hw - r)
  shape.lineTo(-hw, -hw + r)
  shape.quadraticCurveTo(-hw, -hw, -hw + r, -hw)
  return new THREE.ShapeGeometry(shape)
}

function restYawPitch() {
  const s = new THREE.Spherical().setFromVector3(REST.clone().normalize())
  return { yaw: s.theta, pitch: Math.PI / 2 - s.phi }
}

function sleep(ms: number, token: { n: number }, my: number): Promise<boolean> {
  return new Promise((resolve) => {
    const t0 = performance.now()
    const tick = () => {
      if (token.n !== my) {
        resolve(false)
        return
      }
      if (performance.now() - t0 >= ms) {
        resolve(true)
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function easeSmooth(t: number) {
  return t * t * (3 - 2 * t)
}

function easeCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export class CubeViewport {
  readonly canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private root: THREE.Group
  private cubeRoot: THREE.Group
  private cubies: CubieMesh[] = []
  private animating = false
  private raf = 0
  private disposed = false
  practiceOrbit = true
  private dragging = false
  private lastX = 0
  private lastY = 0
  private camYaw: number
  private camPitch: number
  private distance = 7.2
  teachSpeed: TeachSpeed = 'fast'
  model: CubeState = solved()
  onSolved: (() => void) | null = null
  private watchHomes: Set<string> | null = null
  private watchStickers: Set<string> | null = null
  private stickerGeo = roundedStickerGeometry()
  private token = { n: 0 }
  private formulaGuard = false
  private padEnabled = true
  private suppressMarks = false
  private markNodes: THREE.Object3D[] = []
  private arrowNode: THREE.Object3D | null = null
  private cubeYawQuarters = 0
  private cubeFlipped = false
  private jobs: Array<() => Promise<void>> = []
  private draining = false

  constructor(canvas: HTMLCanvasElement) {
    const rest = restYawPitch()
    this.camYaw = rest.yaw
    this.camPitch = rest.pitch
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NoToneMapping
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80)
    this.root = new THREE.Group()
    this.cubeRoot = new THREE.Group()
    this.scene.add(this.root)
    this.root.add(this.cubeRoot)

    const ambient = new THREE.AmbientLight(0xfafafa, 0.72)
    this.scene.add(ambient)
    const key = new THREE.DirectionalLight(0xfffbf5, 0.78)
    key.position.set(0.4, 1.2, 0.15)
    this.camera.add(key)
    const fill = new THREE.DirectionalLight(0xebf2ff, 0.38)
    fill.position.set(-1.4, -0.4, 0.2)
    this.camera.add(fill)
    this.scene.add(this.camera)

    this.buildCubies()
    this.bindInput()
    this.resize()
    this.placeCamera()
    this.loop()
  }

  private homeKey(v: { x: number; y: number; z: number }) {
    return `${v.x},${v.y},${v.z}`
  }

  private stickerKey(s: Sticker) {
    return `${key(s.home)}:${s.face}`
  }

  private plasticMat() {
    return new THREE.MeshPhysicalMaterial({
      color: COLORS.body,
      roughness: 0.36,
      metalness: 0.02,
      clearcoat: 0.42,
      clearcoatRoughness: 0.38,
      specularIntensity: 0.16,
    })
  }

  private stickerMat(face: Face) {
    return new THREE.MeshPhysicalMaterial({
      color: faceColor(face),
      roughness: 0.32,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.34,
      specularIntensity: 0.14,
      side: THREE.FrontSide,
    })
  }

  private buildCubies() {
    this.cubies.forEach((c) => this.cubeRoot.remove(c))
    this.cubies = []
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue
          const g = new THREE.Group() as CubieMesh
          const box = new THREE.Mesh(
            new RoundedBoxGeometry(0.9, 0.9, 0.9, 3, 0.095),
            this.plasticMat(),
          )
          g.add(box)
          const stickers = new Map<Face, THREE.Mesh>()
          const home = new THREE.Vector3(x, y, z)
          for (const face of Object.keys(FACE_NORMAL) as Face[]) {
            const n = FACE_NORMAL[face]
            const show =
              (n.x !== 0 && n.x === x) || (n.y !== 0 && n.y === y) || (n.z !== 0 && n.z === z)
            if (!show) continue
            const plane = new THREE.Mesh(this.stickerGeo, this.stickerMat(face))
            plane.position.set(n.x * 0.47, n.y * 0.47, n.z * 0.47)
            plane.quaternion.copy(stickerOrientation(face))
            g.add(plane)
            stickers.set(face, plane)
          }
          g.position.set(x, y, z)
          g.userData = { home, stickers }
          this.cubeRoot.add(g)
          this.cubies.push(g)
        }
      }
    }
  }

  invalidate() {
    this.token.n++
    this.hideGuideArrow()
    this.hideRepeatMark()
    this.suppressMarks = false
    this.watchHomes = null
    this.watchStickers = null
    this.formulaGuard = false
    this.animating = false
    this.setGroupOpacity(1)
  }

  setPadEnabled(on: boolean) {
    this.padEnabled = on
  }
  setPracticeEnabled(on: boolean) {
    this.practiceOrbit = on
  }
  setRepeatMarksSuppressed(suppressed: boolean) {
    this.suppressMarks = suppressed
    if (suppressed) this.hideRepeatMark()
  }

  setWatchHomes(homes: Vec3[] | null) {
    this.watchStickers = null
    this.watchHomes = homes ? new Set(homes.map((h) => this.homeKey(h))) : null
    this.syncColors()
  }

  grayExcept(homes: Iterable<Vec3> | Set<string>) {
    this.watchStickers = null
    const set = new Set<string>()
    for (const h of homes as Iterable<Vec3 | string>) {
      if (typeof h === 'string') set.add(h)
      else set.add(this.homeKey(h))
    }
    this.watchHomes = set
    this.syncColors()
  }

  grayExceptStickers(stickers: Sticker[]) {
    this.watchHomes = null
    this.watchStickers = new Set(stickers.map((s) => this.stickerKey(s)))
    this.syncColors()
  }

  restoreColors() {
    this.watchHomes = null
    this.watchStickers = null
    this.syncColors()
  }

  reapplyTeachingColors() {
    this.syncColors()
  }

  setStickerLock(_keep: Sticker[] | null) {
    /* twist step clears lock — restore handled by coach */
  }

  private syncColors() {
    for (const c of this.cubies) {
      const home = c.userData.home
      const hk = `${home.x},${home.y},${home.z}`
      for (const [face, mesh] of c.userData.stickers) {
        const mat = mesh.material as THREE.MeshPhysicalMaterial
        let lit = true
        if (this.watchStickers) {
          lit = this.watchStickers.has(`${hk}:${face}`)
        } else if (this.watchHomes) {
          const isCenter = Math.abs(home.x) + Math.abs(home.y) + Math.abs(home.z) === 1
          lit = this.watchHomes.has(hk) || isCenter
        }
        mat.color = faceColor(face, !lit)
      }
    }
  }

  syncFromModel(state: CubeState = this.model) {
    this.model = cloneState(state)
    this.cubeYawQuarters = this.model.yaw
    this.cubeFlipped = this.model.flipped
    const byHome = new Map(state.pieces.map((p) => [this.homeKey(p.home), p]))
    for (const c of this.cubies) {
      const home = c.userData.home
      const piece = byHome.get(`${home.x},${home.y},${home.z}`)
      if (!piece) continue
      c.position.set(piece.pos.x, piece.pos.y, piece.pos.z)
      const m = new THREE.Matrix4()
      m.makeBasis(
        new THREE.Vector3(piece.ori.c0.x, piece.ori.c0.y, piece.ori.c0.z),
        new THREE.Vector3(piece.ori.c1.x, piece.ori.c1.y, piece.ori.c1.z),
        new THREE.Vector3(piece.ori.c2.x, piece.ori.c2.y, piece.ori.c2.z),
      )
      c.quaternion.setFromRotationMatrix(m)
    }
    this.applyOrientationInstant()
    this.syncColors()
  }

  replaceModel(next: CubeState) {
    this.syncFromModel(next)
  }

  private applyOrientationInstant() {
    const yawQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.cubeYawQuarters * (Math.PI / 2),
    )
    const flipQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      this.cubeFlipped ? Math.PI : 0,
    )
    this.cubeRoot.quaternion.copy(flipQ).multiply(yawQ)
  }

  private placeCamera() {
    const spherical = new THREE.Spherical()
    spherical.radius = this.distance
    spherical.theta = this.camYaw
    spherical.phi = Math.PI / 2 - this.camPitch
    this.camera.position.setFromSpherical(spherical)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(0, 0, 0)
  }

  private updateFit(w: number, h: number) {
    const fov = (this.camera.fov * Math.PI) / 180
    const aspect = w / h
    const verticalHalf = Math.tan(fov / 2)
    const horizontalHalf = verticalHalf * Math.max(aspect, 0.05)
    const limit = Math.min(verticalHalf, horizontalHalf)
    this.distance = (2.55 * 1.18) / Math.max(limit, 0.08)
  }

  resetCamera() {
    const rest = restYawPitch()
    this.camYaw = rest.yaw
    this.camPitch = rest.pitch
    this.placeCamera()
  }

  async settleMainAngle() {
    this.resetCamera()
  }

  async restCamera() {
    this.resetCamera()
  }

  resize() {
    const parent = this.canvas.parentElement
    const w = Math.max(1, parent?.clientWidth || this.canvas.clientWidth || 320)
    const h = Math.max(1, parent?.clientHeight || this.canvas.clientHeight || 320)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.updateFit(w, h)
    this.placeCamera()
  }

  private bindInput() {
    const el = this.canvas
    const down = (x: number, y: number) => {
      if (!this.practiceOrbit || this.animating) return
      this.dragging = true
      this.lastX = x
      this.lastY = y
    }
    const move = (x: number, y: number) => {
      if (!this.dragging) return
      const dx = x - this.lastX
      const dy = y - this.lastY
      this.lastX = x
      this.lastY = y
      this.camYaw -= dx * 0.008
      this.camPitch = Math.max(-0.2, Math.min(1.2, this.camPitch - dy * 0.008))
      this.placeCamera()
    }
    const up = () => {
      this.dragging = false
    }
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId)
      down(e.clientX, e.clientY)
    })
    el.addEventListener('pointermove', (e) => move(e.clientX, e.clientY))
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    window.addEventListener('resize', () => this.resize())
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    // hop marks
    const t = performance.now() / 1000
    for (const n of this.markNodes) {
      n.position.y = (n.userData.baseY as number) + Math.sin(t * Math.PI / 0.72) * 0.14
    }
    this.renderer.render(this.scene, this.camera)
  }

  private teachMs(seconds: number) {
    return seconds * 1000 * 4.0 * SPEED_FACTOR[this.teachSpeed]
  }

  private moveDurationMs(move: Move, slow: boolean) {
    const base = slow ? LESSON_QUARTER_MS * SPEED_FACTOR[this.teachSpeed] : 1200
    return move.suffix === 'two' ? base * 1.45 : base
  }

  private enqueue(job: () => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      this.jobs.push(async () => {
        await job()
        resolve()
      })
      if (!this.draining) {
        this.draining = true
        void (async () => {
          while (this.jobs.length) {
            const next = this.jobs.shift()!
            await next()
          }
          this.draining = false
        })()
      }
    })
  }

  async play(
    moves: Move[],
    viewRelative: boolean,
    slow = true,
    onMove?: (index: number) => void,
  ): Promise<void> {
    const my = this.token.n
    this.formulaGuard = true
    await this.enqueue(async () => {
      this.formulaGuard = true
      for (let i = 0; i < moves.length; i++) {
        if (this.token.n !== my) break
        onMove?.(i)
        const move = moves[i]
        const local = viewRelative ? withFace(move, viewToLocal(this.model, move.face)) : move
        await this.turn(local, slow)
        if (slow) {
          const pause = 400 * SPEED_FACTOR[this.teachSpeed]
          if (!(await sleep(pause, this.token, my))) break
        }
        if (this.token.n !== my) break
      }
      this.formulaGuard = false
    })
  }

  /** Legacy alias used by older Learn helpers */
  async animateMove(move: Move) {
    await this.play([move], false, true)
  }
  async animateMoves(moves: Move[], onActive?: (i: number) => void) {
    await this.play(moves, true, true, onActive)
  }

  private async turn(move: Move, slow: boolean) {
    const my = this.token.n
    this.animating = true
    const axis = FACE_AXIS[move.face]
    const layer = FACE_LAYER[move.face]
    const angle = signedQuarters(move) * (Math.PI / 2)
    const axisVec = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0,
    )
    // Capture the layer from the CURRENT visual pose (iOS: homes before applyLocal).
    const moving = this.cubies.filter((c) => Math.round(c.position[axis as Axis]) === layer)
    const startPos = moving.map((c) => c.position.clone())
    const startQuat = moving.map((c) => c.quaternion.clone())
    // Model updates first; the visual spins the same short arc into place.
    applyLocal(this.model, move)

    const dur = this.moveDurationMs(move, slow)
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const step = () => {
        if (this.disposed || this.token.n !== my) {
          this.syncFromModel(this.model)
          this.animating = false
          resolve()
          return
        }
        const k = Math.min(1, (performance.now() - t0) / dur)
        const e = easeSmooth(k)
        const q = new THREE.Quaternion().setFromAxisAngle(axisVec, angle * e)
        moving.forEach((c, i) => {
          c.position.copy(startPos[i]).applyQuaternion(q)
          c.quaternion.copy(q).multiply(startQuat[i])
        })
        if (k < 1) requestAnimationFrame(step)
        else {
          this.syncFromModel(this.model)
          this.animating = false
          resolve()
        }
      }
      requestAnimationFrame(step)
    })
  }

  /** Cube-local face currently pointing along a pad/view face (iOS localFace). */
  localFace(facing: Face): Face {
    const position = this.camera.position.clone()
    const length = position.length()
    const toUser = length > 0.001 ? position.multiplyScalar(1 / length) : new THREE.Vector3(0, 0.4, 1)
    const forward = toUser.clone().negate()
    const hintedUp = this.camera.up.clone().normalize()
    const right = new THREE.Vector3().crossVectors(forward, hintedUp).normalize()
    const up = new THREE.Vector3().crossVectors(right, forward).normalize()
    let direction: THREE.Vector3
    switch (facing) {
      case 'F':
        direction = toUser
        break
      case 'B':
        direction = toUser.clone().negate()
        break
      case 'U':
        direction = up
        break
      case 'D':
        direction = up.clone().negate()
        break
      case 'R':
        direction = right
        break
      case 'L':
        direction = right.clone().negate()
        break
    }
    // World-space face normal after cubeRoot orientation
    let best: Face = 'F'
    let bestDot = -2
    for (const face of Object.keys(FACE_NORMAL) as Face[]) {
      const n = FACE_NORMAL[face]
      const world = new THREE.Vector3(n.x, n.y, n.z).applyQuaternion(this.cubeRoot.quaternion).normalize()
      const dot = world.dot(direction)
      if (dot > bestDot) {
        bestDot = dot
        best = face
      }
    }
    return best
  }

  async userTurn(move: Move) {
    if (this.formulaGuard || !this.padEnabled || this.animating) return
    const was = isSolved(this.model)
    await this.enqueue(async () => {
      if (this.formulaGuard || !this.padEnabled) return
      const local = withFace(move, this.localFace(move.face))
      await this.turn(local, true)
      if (!was && isSolved(this.model) && this.padEnabled) this.onSolved?.()
    })
  }

  async animateYaw(to: number, slowSteps = false) {
    const dest = ((to % 4) + 4) % 4
    if (this.model.yaw === dest) return
    const my = this.token.n
    let delta = dest - this.model.yaw
    if (delta > 2) delta -= 4
    if (delta < -2) delta += 4
    const hops = slowSteps ? Math.max(1, Math.abs(delta)) : 1
    const seconds = (slowSteps ? 0.78 : 0.62) * hops
    const target = this.orientationQuat(dest, this.model.flipped)
    const from = this.cubeRoot.quaternion.clone()
    const dur = this.teachMs(seconds)
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const step = () => {
        if (this.token.n !== my) {
          resolve()
          return
        }
        const k = Math.min(1, (performance.now() - t0) / dur)
        const e = easeCubic(k)
        this.cubeRoot.quaternion.slerpQuaternions(from, target, e)
        if (k < 1) requestAnimationFrame(step)
        else {
          this.model.yaw = dest
          this.cubeYawQuarters = dest
          this.applyOrientationInstant()
          resolve()
        }
      }
      requestAnimationFrame(step)
    })
  }

  private orientationQuat(yaw: number, flipped: boolean) {
    const yawQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw * (Math.PI / 2),
    )
    const flipQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      flipped ? Math.PI : 0,
    )
    return flipQ.multiply(yawQ)
  }

  async animateToWhiteUp() {
    const my = this.token.n
    const target = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
    const from = this.cubeRoot.quaternion.clone()
    const dur = this.teachMs(0.8)
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const step = () => {
        if (this.token.n !== my) {
          resolve()
          return
        }
        const k = Math.min(1, (performance.now() - t0) / dur)
        this.cubeRoot.quaternion.slerpQuaternions(from, target, easeCubic(k))
        if (k < 1) requestAnimationFrame(step)
        else {
          this.model.yaw = 0
          this.model.flipped = true
          this.cubeYawQuarters = 0
          this.cubeFlipped = true
          this.applyOrientationInstant()
          resolve()
        }
      }
      requestAnimationFrame(step)
    })
  }

  async animateFlip(whiteUp: boolean) {
    const end = whiteUp
    const startFlip = this.model.flipped
    const startA = startFlip ? Math.PI : 0
    const endA = end ? Math.PI : 0
    const mid = (startA + endA) / 2
    const my = this.token.n
    await this.slerpTo(this.orientationWithFlipAngle(mid), this.teachMs(0.7), my)
    if (this.token.n !== my) return
    if (!(await sleep(this.teachMs(0.55), this.token, my))) return
    await this.slerpTo(this.orientationWithFlipAngle(endA), this.teachMs(0.7), my)
    if (this.token.n !== my) return
    this.model.flipped = end
    this.cubeFlipped = end
    this.applyOrientationInstant()
  }

  private orientationWithFlipAngle(angle: number) {
    const yawQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.model.yaw * (Math.PI / 2),
    )
    const flipQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle)
    return flipQ.multiply(yawQ)
  }

  private async slerpTo(target: THREE.Quaternion, dur: number, my: number) {
    const from = this.cubeRoot.quaternion.clone()
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const step = () => {
        if (this.token.n !== my) {
          resolve()
          return
        }
        const k = Math.min(1, (performance.now() - t0) / dur)
        this.cubeRoot.quaternion.slerpQuaternions(from, target, easeCubic(k))
        if (k < 1) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  async levelCube() {
    /* pitch reset — web cube pitch unused in most steps */
  }

  async fade(to: CubeState, prepare?: () => void) {
    const my = this.token.n
    this.setGroupOpacity(1)
    await this.animateOpacity(0, this.teachMs(0.22), my)
    if (this.token.n !== my) return
    this.syncFromModel(to)
    prepare?.()
    await this.animateOpacity(1, this.teachMs(0.28), my)
  }

  async zoomSwap(to: CubeState, prepare?: () => void) {
    const my = this.token.n
    this.setGroupOpacity(1)
    this.syncFromModel(solved())
    this.restoreColors()
    this.resetCamera()
    // zoom in (shorten distance)
    const startD = this.distance
    await this.lerpDistance(startD, startD * 0.22, 550, my)
    if (this.token.n !== my) return
    await this.animateOpacity(0, 220, my)
    if (this.token.n !== my) return
    this.syncFromModel(to)
    prepare?.()
    this.cubeRoot.visible = true
    this.setGroupOpacity(0)
    await Promise.all([
      this.lerpDistance(this.distance, startD, 700, my),
      this.animateOpacity(1, 700, my),
    ])
    this.distance = startD
    this.placeCamera()
  }

  async zoomRevealScramble() {
    const my = this.token.n
    this.setGroupOpacity(1)
    this.syncFromModel(solved())
    this.restoreColors()
    this.resetCamera()
    const startD = this.distance
    await this.lerpDistance(startD, startD * 0.62, 480, my)
    if (this.token.n !== my) return
    const scrambled = solved()
    applyMoves(scrambled, randomScramble())
    normalizeOrientation(scrambled)
    this.syncFromModel(scrambled)
    this.restoreColors()
    await this.lerpDistance(this.distance, startD, 640, my)
  }

  private setGroupOpacity(o: number) {
    this.cubeRoot.traverse((obj) => {
      const m = (obj as THREE.Mesh).material
      if (m && 'opacity' in (m as THREE.Material)) {
        const mat = m as THREE.Material
        mat.transparent = o < 1
        mat.opacity = o
      }
    })
  }

  private async animateOpacity(to: number, dur: number, my: number) {
    const start = (this.cubies[0]?.children[0] as THREE.Mesh)?.material
      ? ((this.cubies[0].children[0] as THREE.Mesh).material as THREE.Material).opacity
      : 1
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const step = () => {
        if (this.token.n !== my) {
          // Cancelled mid-fade must not leave the cube invisible.
          if (to < 1) this.setGroupOpacity(1)
          resolve()
          return
        }
        const k = Math.min(1, (performance.now() - t0) / dur)
        this.setGroupOpacity(start + (to - start) * easeSmooth(k))
        if (k < 1) requestAnimationFrame(step)
        else {
          this.setGroupOpacity(to)
          resolve()
        }
      }
      requestAnimationFrame(step)
    })
  }

  private async lerpDistance(from: number, to: number, dur: number, my: number) {
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const step = () => {
        if (this.token.n !== my) {
          resolve()
          return
        }
        const k = Math.min(1, (performance.now() - t0) / dur)
        this.distance = from + (to - from) * easeSmooth(k)
        this.placeCamera()
        if (k < 1) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  async pulseStickers(stickers: Sticker[], times = 2) {
    const unique = stickers
    if (!unique.length) return
    const my = this.token.n
    for (let t = 0; t < times; t++) {
      if (this.token.n !== my) return
      this.paint(unique, true)
      if (!(await sleep(380, this.token, my))) return
      this.paint(unique, false)
      if (!(await sleep(420, this.token, my))) return
    }
  }

  private paint(stickers: Sticker[], gray: boolean) {
    for (const s of stickers) {
      const cubie = this.cubies.find(
        (c) => c.userData.home.x === s.home.x && c.userData.home.y === s.home.y && c.userData.home.z === s.home.z,
      )
      const mesh = cubie?.userData.stickers.get(s.face)
      if (!mesh) continue
      const mat = mesh.material as THREE.MeshPhysicalMaterial
      mat.color = faceColor(s.face, gray)
    }
  }

  async revealWhiteFace() {
    const my = this.token.n
    const saved = this.cubeRoot.quaternion.clone()
    const savedYaw = this.model.yaw
    const right = new THREE.Vector3().crossVectors(
      new THREE.Vector3(0, 1, 0),
      REST.clone().setY(0).normalize(),
    ).normalize()
    // tip toward camera
    const tip = new THREE.Quaternion().setFromAxisAngle(right, 1.15)
    const base = this.orientationQuat(savedYaw, this.model.flipped)
    const tipped = tip.clone().multiply(base)
    await this.slerpTo(tipped, this.teachMs(0.62), my)
    if (this.token.n !== my) return
    const hold = Math.max(350, 1000 * SPEED_FACTOR[this.teachSpeed])
    if (!(await sleep(hold, this.token, my))) return
    await this.slerpTo(saved, this.teachMs(0.55), my)
    this.model.yaw = savedYaw
    this.applyOrientationInstant()
  }

  async guideArrow(from: Vec3, to: Vec3, _firstFormula = false) {
    this.hideGuideArrow()
    const g = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.purple })
    const start = new THREE.Vector3(from.x, from.y, from.z)
    const end = new THREE.Vector3(to.x, to.y, to.z)
    const mid = start.clone().add(end).multiplyScalar(0.5)
    mid.y += 0.9
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    const pts = curve.getPoints(24)
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const dir = b.clone().sub(a)
      const len = dir.length()
      if (len < 0.01) continue
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, len, 8), mat)
      cyl.position.copy(a).add(b).multiplyScalar(0.5)
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
      g.add(cyl)
    }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.086, 0.22, 12), mat)
    cone.position.copy(end)
    const tipDir = end.clone().sub(pts[pts.length - 2] ?? mid).normalize()
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir)
    g.add(cone)
    this.cubeRoot.add(g)
    this.arrowNode = g
    // draw-on
    const my = this.token.n
    const kids = g.children
    for (const n of kids) {
      n.scale.setScalar(0.35)
      ;(n as THREE.Mesh).visible = false
    }
    for (const n of kids) {
      if (this.token.n !== my) return
      ;(n as THREE.Mesh).visible = true
      n.scale.setScalar(1)
      await sleep(26, this.token, my)
    }
  }

  hideGuideArrow() {
    if (this.arrowNode) {
      this.cubeRoot.remove(this.arrowNode)
      this.arrowNode = null
    }
  }

  showRepeatMark(near: Vec3) {
    this.showRepeatMarks([near])
  }

  showRepeatMarks(homes: Vec3[]) {
    if (this.suppressMarks) return
    this.hideRepeatMark()
    for (const home of homes) {
      const piece = this.model.pieces.find((p) => key(p.home) === key(home))
      const pos = piece?.pos ?? home
      const p = new THREE.Vector3(pos.x, pos.y, pos.z)
      if (p.length() > 0.2) p.add(p.clone().normalize().multiplyScalar(0.95))
      p.y += 0.15
      const mark = this.makeBang()
      mark.position.copy(p)
      mark.userData.baseY = p.y
      this.cubeRoot.add(mark)
      this.markNodes.push(mark)
    }
  }

  hideRepeatMark() {
    for (const n of this.markNodes) this.cubeRoot.remove(n)
    this.markNodes = []
  }

  private makeBang() {
    const g = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.purple })
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.08), mat)
    bar.position.y = 0.05
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), mat)
    dot.position.y = -0.32
    g.add(bar, dot)
    return g
  }

  dispose() {
    this.disposed = true
    this.token.n++
    cancelAnimationFrame(this.raf)
    this.renderer.dispose()
  }
}
