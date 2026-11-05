import { useEffect, useRef } from 'react'
import { COLORS } from '../cube/model'
import { MiniTeachingCube } from '../cube/miniCube'

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
export function PlaceCornersPattern({ side = 50.4, active = true }: { side?: number; active?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !active) return
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
      ctx.strokeStyle = 'rgba(122, 34, 245, 0.28)'
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
  }, [side, active])

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

/** Real three.js plastic cube — same TeachingCubeStyle as iOS StepPreview. */
export function StepPreviewMini({
  step,
  side = 92,
  active = true,
  blit = false,
}: {
  step: number
  side?: number
  active?: boolean
  blit?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cube = useRef<MiniTeachingCube | null>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const mini = new MiniTeachingCube(canvas, side, blit)
    cube.current = mini
    mini.show({ kind: 'step', step })
    if (!active) mini.setSpinning(false)
    return () => {
      mini.dispose()
      cube.current = null
    }
  }, [step, side, blit])
  useEffect(() => {
    cube.current?.setSpinning(active)
  }, [active])
  return (
    <canvas
      ref={ref}
      className="step-preview"
      width={side}
      height={side}
      style={{ width: side, height: side, display: 'block' }}
      aria-label={`Step ${step}`}
    />
  )
}

/** Twist-row cube: yellow top, red upper front, green upper right — iOS LastFormulaCube. */
export function LastFormulaCube({ side = 68, blit = false }: { side?: number; blit?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const mini = new MiniTeachingCube(canvas, side, blit)
    mini.show({ kind: 'twist' })
    return () => mini.dispose()
  }, [side, blit])
  return (
    <canvas
      ref={ref}
      className="step-preview"
      width={side}
      height={side}
      style={{ width: side, height: side, display: 'block' }}
      aria-label="Twist formula"
    />
  )
}

export function FormulaIcon() {
  return (
    <div className="formula-icon" aria-hidden>
      <img src={`${import.meta.env.BASE_URL}formulas-scramble.png`} alt="" width={28} height={32} />
      <div className="formula-bars">
        {/* iOS FormulaIcon accent bars: blue, red, yellow */}
        <span style={{ background: COLORS.B, width: 14 }} />
        <span style={{ background: COLORS.L, width: 11 }} />
        <span style={{ background: COLORS.U, width: 8 }} />
      </div>
    </div>
  )
}

/** Plastic 1/2/3-layer glyph — iOS LayerGlyph SCN materials. */
export function LayerGlyph({ layers }: { layers: 1 | 2 | 3 }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const mini = new MiniTeachingCube(canvas, 36)
    mini.show({ kind: 'layers', layers })
    return () => mini.dispose()
  }, [layers])
  return (
    <canvas
      ref={ref}
      className="layer-glyph"
      data-layers={layers}
      width={36}
      height={36}
      style={{ width: 36, height: 36, display: 'block' }}
      aria-hidden
    />
  )
}
