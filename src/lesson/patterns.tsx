import { useEffect, useRef } from 'react'
import { COLORS } from '../cube/model'

const GRAY = COLORS.faceletGray
const YELLOW = COLORS.U
const ORANGE = COLORS.R
const PURPLE = COLORS.purple

export type YellowCase = 'dot' | 'L' | 'line' | null

/** Three yellow-cross diagrams — black tiles, gray/#4e4e4e off, yellow on. */
export function YellowPatternRow({
  active = null,
  horizontal = false,
  large = false,
}: {
  active?: YellowCase
  horizontal?: boolean
  large?: boolean
}) {
  const cell = large ? 11.2 : 8
  const gap = large ? 2.8 : 2
  const pad = large ? 5.6 : 4
  const radius = large ? 9.6 : 8

  function edgeOn(kind: Exclude<YellowCase, null>, index: number) {
    if (kind === 'L') return index === 0 || index === 1
    if (kind === 'line') return index === 0 || index === 2
    return false
  }

  function card(kind: Exclude<YellowCase, null>) {
    const on = active === kind
    const ups = [0, 1, 2, 3].map((i) => edgeOn(kind, i))
    const rows = [
      [false, ups[1], false],
      [ups[0], true, ups[2]],
      [false, ups[3], false],
    ]
    return (
      <div
        key={kind}
        className="yp-card"
        style={{
          padding: pad,
          borderRadius: radius,
          background: '#000',
          boxShadow: '0 2px 4px rgba(0,0,0,.14)',
          outline: on ? `${large ? 1.2 : 1.5}px solid ${large ? PURPLE : YELLOW}` : 'none',
          outlineOffset: 0,
        }}
      >
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap, marginBottom: ri < 2 ? gap : 0 }}>
            {row.map((lit, ci) => (
              <div
                key={ci}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: large ? 2 : 1.5,
                  background: lit ? YELLOW : GRAY,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        gap: 4,
        alignItems: 'flex-start',
      }}
      aria-label="Yellow cross patterns"
    >
      {card('dot')}
      {card('L')}
      {card('line')}
    </div>
  )
}

/** Middle-layer insert card — black 3×3, orange curve arrow, rotated 180°. */
export function MiddleSlideCard({
  slide,
  active = false,
  sheet = false,
}: {
  slide: 'left' | 'right'
  active?: boolean
  sheet?: boolean
}) {
  const side = sheet ? 50.4 : 58
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = side * dpr
    canvas.height = side * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const unit = side / 63
    const r = 12 * unit
    ctx.fillStyle = '#000'
    roundRect(ctx, 0, 0, side, side, r)
    ctx.fill()
    const cell = 14 * unit
    const gap = 3.5 * unit
    const pad = 7 * unit
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = pad + col * (cell + gap)
        const y = pad + row * (cell + gap)
        ctx.fillStyle = GRAY
        roundRect(ctx, x, y, cell, cell, 2.5 * unit)
        ctx.fill()
      }
    }
    const face = { x: pad, y: pad, w: side - pad * 2, h: side - pad * 2 }
    const right = slide === 'right'
    const start = { x: face.x + face.w / 2, y: face.y + face.h - 7 * unit }
    const end = {
      x: right ? face.x + face.w - 8 * unit : face.x + 8 * unit,
      y: face.y + face.h / 2,
    }
    const control = {
      x: right ? face.x + face.w - 6 * unit : face.x + 6 * unit,
      y: face.y + face.h - 4 * unit,
    }
    ctx.strokeStyle = ORANGE
    ctx.lineWidth = 2.4 * unit
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y)
    ctx.stroke()
    const dx = end.x - control.x
    const dy = end.y - control.y
    const len = Math.max(0.001, Math.hypot(dx, dy))
    const dir = { x: dx / len, y: dy / len }
    const normal = { x: -dir.y, y: dir.x }
    const headLen = 8 * unit
    const headWide = 4 * unit
    ctx.fillStyle = ORANGE
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - dir.x * headLen + normal.x * headWide,
      end.y - dir.y * headLen + normal.y * headWide,
    )
    ctx.lineTo(
      end.x - dir.x * headLen - normal.x * headWide,
      end.y - dir.y * headLen - normal.y * headWide,
    )
    ctx.closePath()
    ctx.fill()
  }, [slide, side])

  return (
    <canvas
      ref={ref}
      width={side}
      height={side}
      style={{
        width: side,
        height: side,
        transform: 'rotate(180deg)',
        outline: !sheet && active ? `1.5px solid ${YELLOW}` : 'none',
        borderRadius: 8,
      }}
      aria-label={slide === 'right' ? 'Piece moves right' : 'Piece moves left'}
    />
  )
}

/** Place-corners 4-corner chip with purple narrow arrow cycle DL→UR→UL→DL. */
export function PlaceCornersPattern({ side = 50.4 }: { side?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let raf = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = side * dpr
    canvas.height = side * dpr

    const square = side * 0.22
    const inset = side * 0.13
    const spots = [
      { x: inset + square / 2, y: side - inset - square / 2 }, // DL
      { x: side - inset - square / 2, y: inset + square / 2 }, // UR
      { x: inset + square / 2, y: inset + square / 2 }, // UL
      { x: side - inset - square / 2, y: side - inset - square / 2 }, // DR (static)
    ]
    const cycle = [spots[0], spots[1], spots[2]] as const
    const controlFor = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
      const bend = { x: side / 2 - mid.x, y: side / 2 - mid.y }
      return { x: mid.x + bend.x * 0.35, y: mid.y + bend.y * 0.35 }
    }

    const draw = (t: number) => {
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, side, side)
      const hop = 1.05
      const phase = (t / 1000) % (hop * 3)
      const index = Math.floor(phase / hop) % 3
      const progress = phase / hop - index
      roundRect(ctx, 0, 0, side, side, side * 0.22)
      ctx.fillStyle = '#fff'
      ctx.fill()
      for (const spot of spots) {
        roundRect(ctx, spot.x - square / 2, spot.y - square / 2, square, square, square * 0.22)
        ctx.fillStyle = GRAY
        ctx.fill()
      }
      const unit = side / 63
      // Ghost full triangle cycle so a screenshot never reads as a lone diagonal.
      ctx.strokeStyle = 'rgba(139, 85, 213, 0.28)'
      ctx.lineWidth = 2.2 * unit
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const a = cycle[i]
        const b = cycle[(i + 1) % 3]
        const c = controlFor(a, b)
        if (i === 0) ctx.moveTo(a.x, a.y)
        for (let s = 1; s <= 12; s++) {
          const p = quad(a, c, b, s / 12)
          ctx.lineTo(p.x, p.y)
        }
      }
      ctx.stroke()

      const from = cycle[index]
      const to = cycle[(index + 1) % 3]
      const control = controlFor(from, to)
      const tip = quad(from, control, to, progress)
      const ahead = quad(from, control, to, Math.min(1, progress + 0.08))
      ctx.strokeStyle = PURPLE
      ctx.lineWidth = 2.9 * unit
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      const steps = Math.max(2, Math.floor(progress * 16))
      for (let s = 1; s <= steps; s++) {
        const p = quad(from, control, to, (progress * s) / steps)
        ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
      let tangent = { x: ahead.x - tip.x, y: ahead.y - tip.y }
      if (Math.hypot(tangent.x, tangent.y) < 0.4) {
        tangent = { x: to.x - from.x, y: to.y - from.y }
      }
      const len = Math.max(0.001, Math.hypot(tangent.x, tangent.y))
      const dir = { x: tangent.x / len, y: tangent.y / len }
      const normal = { x: -dir.y, y: dir.x }
      const headLen = 6 * unit
      const headWide = 2.8 * unit
      ctx.fillStyle = PURPLE
      ctx.beginPath()
      ctx.moveTo(tip.x, tip.y)
      ctx.lineTo(
        tip.x - dir.x * headLen + normal.x * headWide,
        tip.y - dir.y * headLen + normal.y * headWide,
      )
      ctx.lineTo(
        tip.x - dir.x * headLen - normal.x * headWide,
        tip.y - dir.y * headLen - normal.y * headWide,
      )
      ctx.closePath()
      ctx.fill()
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [side])

  return (
    <canvas
      ref={ref}
      width={side}
      height={side}
      style={{ width: side, height: side, boxShadow: '0 2px 4px rgba(0,0,0,.14)', borderRadius: side * 0.22 }}
      aria-label="Corner cycle"
    />
  )
}

function quad(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  t: number,
) {
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Isometric teaching-goal cube for formula rows / lesson minimap. */
export function StepPreviewMini({ step, side = 92 }: { step: number; side?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const spin = step === 2 || step === 3

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let raf = 0
    let yaw = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = side * dpr
    canvas.height = side * dpr
    const paint = () => {
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, side, side)
      // Static rows: slight three-quarter pose. Spinning rows: tipped + yaw (iOS middle spin).
      const poseYaw = spin ? yaw : 0.55
      const tip = spin || step === 2 || step === 3 ? WHITE_FACE_TILT : 0
      drawTeachingCube(ctx, side, step, poseYaw, tip)
      if (spin) {
        yaw += 0.0125
        if (yaw > Math.PI * 2) yaw -= Math.PI * 2
        raf = requestAnimationFrame(paint)
      }
    }
    paint()
    return () => cancelAnimationFrame(raf)
  }, [step, side, spin])

  return (
    <canvas
      ref={ref}
      className="step-preview"
      width={side}
      height={side}
      style={{ width: side, height: side, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.16))' }}
      aria-label={`Step ${step}`}
    />
  )
}

/** Twist-row cube: yellow top, red upper front row, green upper right row. */
export function LastFormulaCube({ side = 68 }: { side?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = side * dpr
    canvas.height = side * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, side, side)
    drawTeachingCube(ctx, side, 'twist', 0.55, 0)
  }, [side])
  return (
    <canvas
      ref={ref}
      className="step-preview"
      width={side}
      height={side}
      style={{ width: side, height: side, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.16))' }}
      aria-label="Twist formula"
    />
  )
}

type PreviewKind = number | 'twist'
type FaceKey = 'U' | 'F' | 'R' | 'L' | 'B' | 'D'
type Vec = { x: number; y: number; z: number }

/** iOS whiteFaceTilt — tips model-down (white) toward the camera. */
const WHITE_FACE_TILT = 1.05

/** Match iOS StepGoal.colored homes. */
function litHome(step: PreviewKind, x: number, y: number, z: number): boolean {
  if (step === 'twist' || step >= 7) return true
  const isCenter = Math.abs(x) + Math.abs(y) + Math.abs(z) === 1
  if (isCenter) return true
  if (step <= 1) {
    // White-cross edges
    return y === -1 && Math.abs(x) + Math.abs(z) === 1
  }
  if (step === 2) return y === -1 // first layer
  if (step === 3) return y <= 0 // F2L
  if (step === 4 || step === 5) {
    if (y <= 0) return true
    return y === 1 && Math.abs(x) + Math.abs(z) === 1 // yellow-cross edges
  }
  return true // step 6: full
}

function stickerColor(
  step: PreviewKind,
  face: FaceKey,
  _x: number,
  y: number,
  _z: number,
  lit: boolean,
): string {
  if (!lit) return COLORS.grayed
  if (step === 'twist') {
    if (face === 'U') return COLORS.U
    if (face === 'F' && y === 1) return COLORS.L
    if (face === 'R' && y === 1) return COLORS.F
    return COLORS[face]
  }
  return COLORS[face]
}

/** Camera-right axis for restDirection (6.2, 5.2, 7.6) — iOS viewRight. */
const VIEW_RIGHT: Vec = (() => {
  const fx = 6.2
  const fz = 7.6
  const len = Math.hypot(fx, fz)
  return { x: -fz / len, y: 0, z: fx / len }
})()

function rotYaw(v: Vec, yaw: number): Vec {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c }
}

function rotAxis(v: Vec, axis: Vec, angle: number): Vec {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const dot = v.x * axis.x + v.y * axis.y + v.z * axis.z
  return {
    x: v.x * c + (axis.y * v.z - axis.z * v.y) * s + axis.x * dot * (1 - c),
    y: v.y * c + (axis.z * v.x - axis.x * v.z) * s + axis.y * dot * (1 - c),
    z: v.z * c + (axis.x * v.y - axis.y * v.x) * s + axis.z * dot * (1 - c),
  }
}

/**
 * iOS: root.orientation = tip * yaw  (simd_mul(shown, spin))
 * → local point: tip(yaw(p)). Yaw around Y then tip around viewRight = diagonal tumble.
 */
function transformPoint(v: Vec, yaw: number, tip: number): Vec {
  let p = rotYaw(v, yaw)
  if (tip !== 0) p = rotAxis(p, VIEW_RIGHT, tip)
  return p
}

function drawTeachingCube(
  ctx: CanvasRenderingContext2D,
  side: number,
  step: PreviewKind,
  yaw: number,
  tip: number,
) {
  const scale = side * 0.132
  const ox = side / 2
  const oy = side / 2 + side * 0.05
  // Exploded gaps like SceneKit 0.9 boxes on a 1.0 lattice (extra air).
  const spacing = 1.14
  const bodyHalf = 0.40
  const stickerHalf = 0.28
  const project = (x: number, y: number, z: number) => {
    const p = transformPoint({ x, y, z }, yaw, tip)
    // Mild perspective so the tumble reads multi-axis (not flat ortho yaw).
    const persp = 1 / (1 + p.z * 0.045 + 0.55)
    return {
      x: ox + (p.x - p.z) * 0.866 * scale * persp,
      y: oy + (-p.y * 1.02 + (p.x + p.z) * 0.5 * 0.52) * scale * persp,
      depth: p.x * 0.3 + p.y * 0.5 + p.z * 0.85,
      p,
    }
  }

  type Quad = {
    pts: { x: number; y: number }[]
    fill: string
    depth: number
    round: number
    force: boolean
  }
  const quads: Quad[] = []

  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        if (ix === 0 && iy === 0 && iz === 0) continue
        const x = ix * spacing
        const y = iy * spacing
        const z = iz * spacing
        const lit = litHome(step, ix, iy, iz)
        const isUCenter = ix === 0 && iy === 1 && iz === 0

        const bodyFaces: Vec[] = [
          { x: 0, y: 0, z: 1 },
          { x: 0, y: 0, z: -1 },
          { x: 1, y: 0, z: 0 },
          { x: -1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
          { x: 0, y: -1, z: 0 },
        ]
        for (const n of bodyFaces) {
          const outward =
            (n.x !== 0 && n.x === ix) || (n.y !== 0 && n.y === iy) || (n.z !== 0 && n.z === iz)
          if (!outward) continue
          pushFaceQuad(quads, project, transformPoint, yaw, tip, {
            cx: x + n.x * bodyHalf,
            cy: y + n.y * bodyHalf,
            cz: z + n.z * bodyHalf,
            n,
            half: bodyHalf * 0.98,
            fill: COLORS.body,
            round: 0,
            depthBias: -0.03,
            force: false,
            cull: -0.35,
          })
        }

        const stickerFaces: Array<{ n: Vec; key: FaceKey; show: boolean }> = [
          { n: { x: 0, y: 0, z: 1 }, key: 'F', show: iz === 1 },
          { n: { x: 0, y: 0, z: -1 }, key: 'B', show: iz === -1 },
          { n: { x: 1, y: 0, z: 0 }, key: 'R', show: ix === 1 },
          { n: { x: -1, y: 0, z: 0 }, key: 'L', show: ix === -1 },
          { n: { x: 0, y: 1, z: 0 }, key: 'U', show: iy === 1 },
          { n: { x: 0, y: -1, z: 0 }, key: 'D', show: iy === -1 },
        ]
        for (const sf of stickerFaces) {
          if (!sf.show) continue
          const forceUCenter = isUCenter && sf.key === 'U'
          pushFaceQuad(quads, project, transformPoint, yaw, tip, {
            cx: x + sf.n.x * (bodyHalf + 0.02),
            cy: y + sf.n.y * (bodyHalf + 0.02),
            cz: z + sf.n.z * (bodyHalf + 0.02),
            n: sf.n,
            half: stickerHalf,
            fill: stickerColor(step, sf.key, ix, iy, iz, lit),
            round: 1,
            depthBias: 0.05,
            force: forceUCenter,
            // Keep yellow U-center visible even when tip angles the face away.
            cull: forceUCenter ? -0.95 : -0.22,
          })
        }
      }
    }
  }

  quads.sort((a, b) => a.depth - b.depth)
  for (const q of quads) {
    ctx.beginPath()
    if (q.round && q.pts.length === 4) {
      const pts = q.pts
      const mid = (a: { x: number; y: number }, b: { x: number; y: number }, t = 0.28) => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      })
      const m01 = mid(pts[0], pts[1])
      ctx.moveTo(m01.x, m01.y)
      for (let i = 0; i < 4; i++) {
        const b = pts[(i + 1) % 4]
        const c = pts[(i + 2) % 4]
        const to = mid(b, c)
        ctx.quadraticCurveTo(b.x, b.y, to.x, to.y)
      }
      ctx.closePath()
    } else {
      ctx.moveTo(q.pts[0].x, q.pts[0].y)
      for (let i = 1; i < q.pts.length; i++) ctx.lineTo(q.pts[i].x, q.pts[i].y)
      ctx.closePath()
    }
    ctx.fillStyle = q.fill
    ctx.fill()
    if (q.round) {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'
      ctx.lineWidth = Math.max(0.45, side * 0.009)
      ctx.stroke()
    }
  }
}

function pushFaceQuad(
  quads: {
    pts: { x: number; y: number }[]
    fill: string
    depth: number
    round: number
    force: boolean
  }[],
  project: (x: number, y: number, z: number) => { x: number; y: number; depth: number },
  transformPointFn: (v: Vec, yaw: number, tip: number) => Vec,
  yaw: number,
  tip: number,
  opts: {
    cx: number
    cy: number
    cz: number
    n: Vec
    half: number
    fill: string
    round: number
    depthBias: number
    force: boolean
    cull: number
  },
) {
  const nWorld = transformPointFn(opts.n, yaw, tip)
  const toward = -nWorld.z * 0.55 + nWorld.y * 0.4 + nWorld.x * 0.4
  if (!opts.force && toward < opts.cull) return
  const ux = opts.n.y === 0 && opts.n.z === 0 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }
  const u = {
    x: ux.y * opts.n.z - ux.z * opts.n.y,
    y: ux.z * opts.n.x - ux.x * opts.n.z,
    z: ux.x * opts.n.y - ux.y * opts.n.x,
  }
  const uLen = Math.hypot(u.x, u.y, u.z) || 1
  const U = { x: u.x / uLen, y: u.y / uLen, z: u.z / uLen }
  const V = {
    x: opts.n.y * U.z - opts.n.z * U.y,
    y: opts.n.z * U.x - opts.n.x * U.z,
    z: opts.n.x * U.y - opts.n.y * U.x,
  }
  const hs = opts.half
  const corners = [
    { x: opts.cx + (-U.x - V.x) * hs, y: opts.cy + (-U.y - V.y) * hs, z: opts.cz + (-U.z - V.z) * hs },
    { x: opts.cx + (U.x - V.x) * hs, y: opts.cy + (U.y - V.y) * hs, z: opts.cz + (U.z - V.z) * hs },
    { x: opts.cx + (U.x + V.x) * hs, y: opts.cy + (U.y + V.y) * hs, z: opts.cz + (U.z + V.z) * hs },
    { x: opts.cx + (-U.x + V.x) * hs, y: opts.cy + (-U.y + V.y) * hs, z: opts.cz + (-U.z + V.z) * hs },
  ]
  const P = corners.map((c) => project(c.x, c.y, c.z))
  quads.push({
    pts: P.map((p) => ({ x: p.x, y: p.y })),
    fill: opts.fill,
    depth: P.reduce((a, p) => a + p.depth, 0) / 4 + opts.depthBias,
    round: opts.round,
    force: opts.force,
  })
}

export function FormulaIcon() {
  return (
    <div className="formula-icon" aria-hidden>
      <img src={`${import.meta.env.BASE_URL}formulas-scramble.png`} alt="" width={28} height={32} />
      <div className="formula-bars">
        {/* iOS FormulaIcon accent bars: blue, red, yellow */}
        <span style={{ background: '#1a40c2', width: 14 }} />
        <span style={{ background: '#c01a16', width: 11 }} />
        <span style={{ background: '#fff200', width: 8 }} />
      </div>
    </div>
  )
}

/** Isometric mini plastic cube — 1/2/3 layers from the bottom, matching iOS LayerGlyph. */
export function LayerGlyph({ layers }: { layers: 1 | 2 | 3 }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const size = 36
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)

    // Camera-ish isometric matching restDirection (6.2, 5.2, 7.6)
    const scale = 5.4
    const ox = size / 2
    const oy = size / 2 + 1
    const project = (x: number, y: number, z: number) => {
      const X = (x - z) * 0.866 * scale
      const Y = (-y * 1.02 + (x + z) * 0.5 * 0.58) * scale
      return { x: ox + X, y: oy + Y }
    }

    const body = '#0a0a0a'
    const faceCols: Record<string, string> = {
      U: '#fff200',
      F: '#00e632',
      R: '#ff7f00',
      L: '#c01a16',
      B: '#1a40c2',
      D: '#f0f0f0',
    }

    const heights =
      layers === 1 ? [-1] : layers === 2 ? [-1, 0] : ([-1, 0, 1] as number[])

    type Quad = { pts: { x: number; y: number }[]; fill: string; depth: number }
    const quads: Quad[] = []

    for (const y of heights) {
      for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue
          const s = 0.42
          const corners = [
            [x - s, y - s, z - s],
            [x + s, y - s, z - s],
            [x + s, y + s, z - s],
            [x - s, y + s, z - s],
            [x - s, y - s, z + s],
            [x + s, y - s, z + s],
            [x + s, y + s, z + s],
            [x - s, y + s, z + s],
          ] as const
          const P = corners.map(([a, b, c]) => project(a, b, c))
          const depth = x + y + z
          // body faces (approx)
          const facesIdx = [
            [4, 5, 6, 7], // F
            [1, 0, 3, 2], // B
            [5, 1, 2, 6], // R
            [0, 4, 7, 3], // L
            [7, 6, 2, 3], // U
            [4, 5, 1, 0], // D
          ]
          const faceKeys = ['F', 'B', 'R', 'L', 'U', 'D']
          const showFace = (face: string) => {
            if (face === 'U') return y === Math.max(...heights)
            if (face === 'D') return y === Math.min(...heights)
            if (face === 'F') return z === 1
            if (face === 'B') return z === -1
            if (face === 'R') return x === 1
            if (face === 'L') return x === -1
            return false
          }
          for (let fi = 0; fi < 6; fi++) {
            const key = faceKeys[fi]
            const idx = facesIdx[fi]
            const pts = idx.map((i) => P[i])
            const fill = showFace(key) ? faceCols[key] : body
            // skip back faces mostly
            if (key === 'B' || key === 'L' || key === 'D') {
              if (!showFace(key)) continue
            }
            quads.push({ pts, fill, depth: depth + (key === 'U' ? 0.3 : key === 'F' ? 0.2 : 0) })
          }
        }
      }
    }

    quads.sort((a, b) => a.depth - b.depth)
    for (const q of quads) {
      ctx.beginPath()
      ctx.moveTo(q.pts[0].x, q.pts[0].y)
      for (let i = 1; i < q.pts.length; i++) ctx.lineTo(q.pts[i].x, q.pts[i].y)
      ctx.closePath()
      ctx.fillStyle = q.fill
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 0.4
      ctx.stroke()
    }
  }, [layers])

  return (
    <canvas
      ref={ref}
      className="layer-glyph"
      data-layers={layers}
      width={36}
      height={36}
      style={{ width: 36, height: 36 }}
      aria-hidden
    />
  )
}
