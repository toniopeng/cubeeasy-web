/**
 * Shared plastic teaching-cube renderer for StepPreview / LayerGlyph / Formulas.
 * Matches iOS TeachingCubeStyle + LayerGlyph SceneKit look (PBR plastic, stickers, camera).
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  ALL_FACES,
  COLORS,
  FACE_NORMAL,
  TOP_CORNERS,
  TOP_EDGES,
  WHITE_EDGES,
  cornerPlaced,
  key,
  prepared,
  solved,
  type CubeState,
  type Face,
  type Vec3,
  v3,
} from './model'

const EYE = new THREE.Vector3(6.2, 5.2, 7.6)

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

function roundedSticker(size: number, radius: number): THREE.ShapeGeometry {
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

function plasticMat() {
  return new THREE.MeshPhysicalMaterial({
    color: COLORS.body,
    roughness: 0.45,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.42,
    specularIntensity: 0.1,
  })
}

function stickerMat(hex: string) {
  const color = new THREE.Color(hex)
  return new THREE.MeshPhysicalMaterial({
    color,
    emissive: color.clone(),
    emissiveIntensity: 0.18,
    roughness: 0.36,
    metalness: 0,
    clearcoat: 0.04,
    clearcoatRoughness: 0.6,
    specularIntensity: 0.03,
    side: THREE.FrontSide,
  })
}

function placeCamera(camera: THREE.PerspectiveCamera, distance: number) {
  const dir = EYE.clone().normalize()
  camera.position.copy(dir.multiplyScalar(distance))
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)
}

function viewRight(): THREE.Vector3 {
  const forward = new THREE.Vector3(6.2, 0, 7.6).normalize()
  return new THREE.Vector3(-forward.z, 0, forward.x).normalize()
}

/** iOS StepGoal.make(step) */
export function stepGoal(step: number): { model: CubeState; colored: Set<string> } {
  const centers = new Set(ALL_FACES.map((f) => key(FACE_NORMAL[f])))
  const withCenters = (s: Set<string>) => {
    for (const c of centers) s.add(c)
    return s
  }
  const homesWhere = (model: CubeState, pred: (p: CubeState['pieces'][0]) => boolean) =>
    new Set(model.pieces.filter(pred).map((p) => key(p.home)))

  if (step <= 1) {
    const model = prepared('cross')
    const colored = new Set(WHITE_EDGES.map((e) => key(e.home)))
    return { model, colored: withCenters(colored) }
  }
  if (step === 2) {
    const model = prepared('firstLayer')
    return { model, colored: withCenters(homesWhere(model, (p) => p.home.y < 0)) }
  }
  if (step === 3) {
    const model = prepared('f2l')
    return { model, colored: withCenters(homesWhere(model, (p) => p.home.y <= 0)) }
  }
  if (step === 4 || step === 5) {
    const model = prepared(step === 4 ? 'yellowCross' : 'edges')
    const colored = homesWhere(model, (p) => p.home.y <= 0)
    colored.add(key(v3(0, 1, 0)))
    for (const e of TOP_EDGES) colored.add(key(e))
    return { model, colored: withCenters(colored) }
  }
  if (step === 6) {
    const model = prepared('edges')
    const colored = homesWhere(model, (p) => p.home.y <= 0)
    colored.add(key(v3(0, 1, 0)))
    for (const slot of TOP_EDGES) {
      const piece = model.pieces.find((p) => p.pos.x === slot.x && p.pos.y === slot.y && p.pos.z === slot.z)
      if (piece) colored.add(key(piece.home))
    }
    for (const slot of TOP_CORNERS) {
      const piece = model.pieces.find((p) => p.pos.x === slot.x && p.pos.y === slot.y && p.pos.z === slot.z)
      if (piece) colored.add(key(piece.home))
    }
    // Prefer corners that are placed
    for (const slot of TOP_CORNERS) {
      if (cornerPlaced(model, slot)) {
        const piece = model.pieces.find((p) => p.pos.x === slot.x && p.pos.y === slot.y && p.pos.z === slot.z)
        if (piece) colored.add(key(piece.home))
      }
    }
    return { model, colored: withCenters(colored) }
  }
  const model = solved()
  return { model, colored: new Set(model.pieces.map((p) => key(p.home))) }
}

function twistColor(home: Vec3, face: Face): string {
  if (home.y === 1 && face === 'U') return COLORS.U
  if (home.y === 1 && home.z === 1 && face === 'F') return COLORS.L
  if (home.y === 1 && home.x === 1 && face === 'R') return COLORS.F
  return COLORS[face]
}

type CubieOpts = {
  box: number
  chamfer: number
  sticker: number
  stickerR: number
  stickerLift: number
}

const TEACH: CubieOpts = { box: 0.9, chamfer: 0.095, sticker: 0.68, stickerR: 0.16, stickerLift: 0.47 }
const LAYER: CubieOpts = { box: 0.82, chamfer: 0.08, sticker: 0.58, stickerR: 0.12, stickerLift: 0.43 }

export type MiniMode =
  | { kind: 'step'; step: number }
  | { kind: 'twist' }
  | { kind: 'layers'; layers: 1 | 2 | 3 }

let sharedCanvas: HTMLCanvasElement | null = null
let sharedRenderer: THREE.WebGLRenderer | null = null

function sharedMiniRenderer(side: number): THREE.WebGLRenderer {
  if (!sharedCanvas || !sharedRenderer) {
    sharedCanvas = document.createElement('canvas')
    sharedRenderer = new THREE.WebGLRenderer({
      canvas: sharedCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    })
    sharedRenderer.outputColorSpace = THREE.SRGBColorSpace
    sharedRenderer.toneMapping = THREE.NoToneMapping
  }
  const ratio = Math.min(2, window.devicePixelRatio || 1)
  sharedRenderer.setPixelRatio(ratio)
  sharedRenderer.setSize(side, side, false)
  return sharedRenderer
}

/** Warm the cached teaching cubes the formula sheet draws, off the click path. */
export function warmFormulaPoses(): void {
  for (const step of [2, 3, 4, 5, 6]) stepGoal(step)
}

export class MiniTeachingCube {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private root = new THREE.Group()
  private raf = 0
  private disposed = false
  private spinId = 0
  private spinTick: (() => void) | null = null
  private readonly blit: boolean
  private readonly view: HTMLCanvasElement
  private readonly side: number

  constructor(canvas: HTMLCanvasElement, side: number, blit = false) {
    this.view = canvas
    this.side = side
    this.blit = blit
    this.renderer = blit
      ? sharedMiniRenderer(side)
      : new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: 'low-power',
        })
    if (!blit) {
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      this.renderer.setSize(side, side, false)
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.toneMapping = THREE.NoToneMapping
    }
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40)
    this.scene.add(this.root)

    const ambient = new THREE.AmbientLight(0xffffff, 0.72)
    this.scene.add(ambient)
    const key = new THREE.DirectionalLight(0xffffff, 1.15)
    key.position.set(0.6, 1.4, 0.2)
    this.camera.add(key)
    this.scene.add(this.camera)
    placeCamera(this.camera, 8.4)
  }

  /** Stop the yaw loop without throwing away the cube. */
  setSpinning(on: boolean) {
    if (!on) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
      return
    }
    if (this.raf || !this.spinTick) return
    this.raf = requestAnimationFrame(this.spinTick)
  }

  show(mode: MiniMode) {
    this.spinId++
    this.spinTick = null
    const id = this.spinId
    cancelAnimationFrame(this.raf)
    this.raf = 0

    if (mode.kind === 'layers') {
      this.camera.fov = 28
      this.camera.updateProjectionMatrix()
      placeCamera(this.camera, 11.2)
      this.buildLayers(mode.layers)
      this.root.quaternion.identity()
      this.renderOnce()
      return
    }

    this.camera.fov = 32
    this.camera.updateProjectionMatrix()
    placeCamera(this.camera, 8.4)

    if (mode.kind === 'twist') {
      this.buildTwist()
      this.root.quaternion.identity()
      this.renderOnce()
      return
    }

    const step = mode.step
    const goal = stepGoal(step)
    this.buildFromGoal(goal.model, goal.colored, TEACH)

    // Step 1: white on top (π around X). Steps 2–3: tip + continuous yaw.
    if (step === 1) {
      this.root.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
      this.renderOnce()
      return
    }
    if (step === 2 || step === 3) {
      const tip = new THREE.Quaternion().setFromAxisAngle(viewRight(), 1.05)
      this.root.quaternion.copy(tip)
      this.renderOnce()
      let yaw = 0
      const tick = () => {
        this.raf = 0
        if (this.disposed || this.spinId !== id) return
        yaw += 0.012
        if (yaw > Math.PI * 2) yaw -= Math.PI * 2
        const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
        this.root.quaternion.copy(tip).multiply(spin)
        this.renderOnce()
        this.raf = requestAnimationFrame(tick)
      }
      this.spinTick = tick
      this.raf = requestAnimationFrame(tick)
      return
    }
    this.root.quaternion.identity()
    this.renderOnce()
  }

  private clearRoot() {
    while (this.root.children.length) {
      const c = this.root.children[0]
      this.root.remove(c)
      c.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry && mesh.geometry !== undefined) {
          // Shared sticker geos are recreated per cubie; dispose each.
          if ((mesh.geometry as THREE.BufferGeometry).type) mesh.geometry.dispose?.()
        }
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose?.()
      })
    }
  }

  private makeCubie(
    home: Vec3,
    colorFor: (face: Face) => string,
    opts: CubieOpts,
    pos = home,
    ori?: { c0: Vec3; c1: Vec3; c2: Vec3 },
  ) {
    const g = new THREE.Group()
    const box = new THREE.Mesh(
      new RoundedBoxGeometry(opts.box, opts.box, opts.box, 2, opts.chamfer),
      plasticMat(),
    )
    g.add(box)
    const stickerGeo = roundedSticker(opts.sticker, opts.stickerR)
    for (const face of ALL_FACES) {
      const n = FACE_NORMAL[face]
      const show =
        (n.x !== 0 && n.x === home.x) || (n.y !== 0 && n.y === home.y) || (n.z !== 0 && n.z === home.z)
      if (!show) continue
      const plane = new THREE.Mesh(stickerGeo, stickerMat(colorFor(face)))
      plane.position.set(n.x * opts.stickerLift, n.y * opts.stickerLift, n.z * opts.stickerLift)
      plane.quaternion.copy(stickerOrientation(face))
      g.add(plane)
    }
    g.position.set(pos.x, pos.y, pos.z)
    if (ori) {
      const m = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(ori.c0.x, ori.c0.y, ori.c0.z),
        new THREE.Vector3(ori.c1.x, ori.c1.y, ori.c1.z),
        new THREE.Vector3(ori.c2.x, ori.c2.y, ori.c2.z),
      )
      g.quaternion.setFromRotationMatrix(m)
    }
    this.root.add(g)
  }

  private buildFromGoal(model: CubeState, colored: Set<string>, opts: CubieOpts) {
    this.clearRoot()
    for (const piece of model.pieces) {
      const on = colored.has(key(piece.home))
      this.makeCubie(
        piece.home,
        (face) => (on ? COLORS[face] : COLORS.grayed),
        opts,
        piece.pos,
        piece.ori,
      )
    }
  }

  private buildTwist() {
    this.clearRoot()
    const model = solved()
    for (const piece of model.pieces) {
      this.makeCubie(piece.home, (face) => twistColor(piece.home, face), TEACH)
    }
  }

  private buildLayers(layers: 1 | 2 | 3) {
    this.clearRoot()
    const heights = layers === 1 ? [-1] : layers === 2 ? [-1, 0] : [-1, 0, 1]
    for (const y of heights) {
      for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue
          this.makeCubie(v3(x, y, z), (face) => COLORS[face], LAYER)
        }
      }
    }
  }

  private renderOnce() {
    if (this.disposed) return
    if (this.blit) sharedMiniRenderer(this.side)
    this.renderer.render(this.scene, this.camera)
    if (!this.blit || !sharedCanvas) return
    const ctx = this.view.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, this.view.width, this.view.height)
    ctx.drawImage(sharedCanvas, 0, 0, this.view.width, this.view.height)
  }

  dispose() {
    this.disposed = true
    this.spinId++
    this.spinTick = null
    cancelAnimationFrame(this.raf)
    this.clearRoot()
    if (!this.blit) this.renderer.dispose()
  }
}
