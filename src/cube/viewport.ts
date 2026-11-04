import * as THREE from 'three'
import {
  COLORS,
  FACE_NORMAL,
  type Axis,
  type CubeState,
  type Face,
  type Move,
  plusQuarters,
  cloneState,
  applyMove,
  solved,
} from './model'

const FACE_AXIS: Record<Face, Axis> = {
  U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z',
}
const FACE_LAYER: Record<Face, number> = {
  U: 1, R: 1, F: 1, D: -1, L: -1, B: -1,
}

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

const BASE_TURN_MS = 520

type CubieMesh = THREE.Group & { userData: { home: THREE.Vector3; stickers: Map<Face, THREE.Mesh> } }

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

export class CubeViewport {
  readonly canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private root: THREE.Group
  private cubies: CubieMesh[] = []
  private pivot = new THREE.Group()
  private animating = false
  private raf = 0
  private disposed = false
  practiceOrbit = true
  private dragging = false
  private lastX = 0
  private lastY = 0
  private yaw = 0.55
  private pitch = 0.42
  private distance = 7.2
  teachSpeed: TeachSpeed = 'fast'
  model: CubeState = solved()
  onSolved: (() => void) | null = null
  private watchHomes: Set<string> | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40)
    this.root = new THREE.Group()
    this.scene.add(this.root)
    this.root.add(this.pivot)

    const ambient = new THREE.AmbientLight(0xffffff, 0.78)
    this.scene.add(ambient)
    const key = new THREE.DirectionalLight(0xffffff, 0.85)
    key.position.set(0.6, 1.4, 0.2)
    this.camera.add(key)
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

  private buildCubies() {
    this.cubies.forEach((c) => this.pivot.remove(c))
    this.cubies = []
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue
          const g = new THREE.Group() as CubieMesh
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.9, 0.9),
            new THREE.MeshPhysicalMaterial({
              color: COLORS.body,
              roughness: 0.36,
              metalness: 0.02,
              clearcoat: 0.42,
              clearcoatRoughness: 0.38,
            }),
          )
          g.add(box)
          const stickers = new Map<Face, THREE.Mesh>()
          const home = new THREE.Vector3(x, y, z)
          for (const face of Object.keys(FACE_NORMAL) as Face[]) {
            const n = FACE_NORMAL[face]
            const show =
              (n.x !== 0 && n.x === x) || (n.y !== 0 && n.y === y) || (n.z !== 0 && n.z === z)
            if (!show) continue
            const plane = new THREE.Mesh(
              new THREE.PlaneGeometry(0.68, 0.68),
              new THREE.MeshPhysicalMaterial({
                color: faceColor(face),
                roughness: 0.32,
                metalness: 0,
                clearcoat: 0.3,
                clearcoatRoughness: 0.34,
              }),
            )
            plane.position.set(n.x * 0.47, n.y * 0.47, n.z * 0.47)
            plane.quaternion.copy(stickerOrientation(face))
            g.add(plane)
            stickers.set(face, plane)
          }
          g.position.set(x, y, z)
          g.userData = { home, stickers }
          this.pivot.add(g)
          this.cubies.push(g)
        }
      }
    }
  }

  setWatchHomes(homes: Array<{ x: number; y: number; z: number }> | null) {
    if (!homes) {
      this.watchHomes = null
    } else {
      this.watchHomes = new Set(homes.map((h) => this.homeKey(h)))
    }
    this.syncColors()
  }

  restoreColors() {
    this.watchHomes = null
    this.syncColors()
  }

  private syncColors() {
    for (const c of this.cubies) {
      const home = c.userData.home
      const on = !this.watchHomes || this.watchHomes.has(`${home.x},${home.y},${home.z}`)
      // Centers always colored when watching
      const isCenter = Math.abs(home.x) + Math.abs(home.y) + Math.abs(home.z) === 1
      const lit = on || (this.watchHomes && isCenter)
      for (const [face, mesh] of c.userData.stickers) {
        const mat = mesh.material as THREE.MeshPhysicalMaterial
        mat.color = faceColor(face, !lit)
      }
    }
  }

  /** Snap meshes from model state. */
  syncFromModel(state: CubeState = this.model) {
    this.model = cloneState(state)
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
    this.syncColors()
  }

  private placeCamera() {
    const eye = new THREE.Vector3(6.2, 5.2, 7.6).normalize().multiplyScalar(this.distance)
    // Orbit around using yaw/pitch relative to teaching eye
    const spherical = new THREE.Spherical().setFromVector3(eye)
    spherical.theta = this.yaw
    spherical.phi = Math.PI / 2 - this.pitch
    this.camera.position.setFromSpherical(spherical)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(0, 0, 0)
  }

  resetCamera() {
    this.yaw = 0.55
    this.pitch = 0.42
    this.distance = 7.2
    this.placeCamera()
  }

  resize() {
    const parent = this.canvas.parentElement
    const w = Math.max(1, parent?.clientWidth || this.canvas.clientWidth || 320)
    const h = Math.max(1, parent?.clientHeight || this.canvas.clientHeight || 320)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
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
      this.yaw -= dx * 0.008
      this.pitch = Math.max(-0.2, Math.min(1.2, this.pitch - dy * 0.008))
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
    this.renderer.render(this.scene, this.camera)
  }

  private turnMs() {
    return BASE_TURN_MS * SPEED_FACTOR[this.teachSpeed]
  }

  async animateMove(move: Move): Promise<void> {
    if (this.animating) return
    this.animating = true
    const axis = FACE_AXIS[move.face]
    const layer = FACE_LAYER[move.face]
    const quarters = plusQuarters(move)
    const angle = (Math.PI / 2) * quarters
    const axisVec = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0,
    )
    const moving = this.cubies.filter((c) => Math.round(c.position[axis]) === layer)
    const startPos = moving.map((c) => c.position.clone())
    const startQuat = moving.map((c) => c.quaternion.clone())
    const dur = this.turnMs() * (move.suffix === 'two' ? 1.35 : 1)
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const step = () => {
        if (this.disposed) {
          resolve()
          return
        }
        const k = Math.min(1, (performance.now() - t0) / dur)
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
        const q = new THREE.Quaternion().setFromAxisAngle(axisVec, angle * e)
        moving.forEach((c, i) => {
          c.position.copy(startPos[i]).applyQuaternion(q)
          c.quaternion.copy(q).multiply(startQuat[i])
        })
        if (k < 1) requestAnimationFrame(step)
        else {
          applyMove(this.model, move)
          this.syncFromModel(this.model)
          this.animating = false
          if (this.onSolved) {
            const ok = this.model.pieces.every(
              (p) =>
                p.pos.x === p.home.x &&
                p.pos.y === p.home.y &&
                p.pos.z === p.home.z &&
                p.ori.c0.x === 1 &&
                p.ori.c1.y === 1 &&
                p.ori.c2.z === 1,
            )
            if (ok) this.onSolved()
          }
          resolve()
        }
      }
      requestAnimationFrame(step)
    })
  }

  async animateMoves(
    moves: Move[],
    onActive?: (index: number) => void,
  ): Promise<void> {
    for (let i = 0; i < moves.length; i++) {
      onActive?.(i)
      await this.animateMove(moves[i])
    }
    onActive?.(-1)
  }

  async userTurn(move: Move) {
    if (this.animating) return
    await this.animateMove(move)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.renderer.dispose()
  }
}
