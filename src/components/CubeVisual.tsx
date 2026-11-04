type Props = { accent?: string; pulse?: boolean }

/** Simple CSS cube illustration — product feel without a heavy 3D engine. */
export function CubeVisual({ accent = '#3b82f6', pulse }: Props) {
  const faces = [
    ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#ffffff', '#ef4444', '#3b82f6', '#f59e0b', '#22c55e'],
    ['#22c55e', '#ffffff', '#ef4444', '#3b82f6', accent, '#f59e0b', '#ffffff', '#22c55e', '#3b82f6'],
  ]
  return (
    <div className={`cube-visual ${pulse ? 'pulse' : ''}`} aria-hidden>
      {faces.map((face, fi) => (
        <div key={fi} className={`cube-face face-${fi}`}>
          {face.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
      ))}
    </div>
  )
}
