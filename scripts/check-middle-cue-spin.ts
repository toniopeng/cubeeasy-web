/**
 * Middle-layer cue spin: every insert, both sides, including the 3rd and 4th
 * pieces. The old handoff eased to a quarter yaw and then snapped the cue
 * orbit. The spin must reach that same face-on pose in one monotonic slerp.
 */
import { readFileSync } from 'node:fs'
import { Quaternion, Vector3 } from 'three'
import { cuePose, lessonYawQuat } from '../src/cube/cuePose.ts'
import {
  ALGS,
  FACE_NORMAL,
  MID_HOMES,
  applyMoves,
  applyView,
  bestVisibleYaw,
  cloneState,
  midSolved,
  middlePlan,
  normalizeOrientation,
  pieceHome,
  prepared,
  v3,
  yawRight,
} from '../src/cube/model.ts'

function easeCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const cam = new Vector3(6.2, 0, 7.6).normalize()
let cube = prepared('firstLayer')
normalizeOrientation(cube)

const rows: string[] = []
let sawLeft = false
let sawRight = false
let sawThird = false
let sawFourth = false

for (let n = 0; n < 4; n++) {
  const top = MID_HOMES.find((h) => pieceHome(cube, h)?.pos.y === 1)
  if (!top) throw new Error(`piece ${n + 1}: no edge on top`)
  const plan = middlePlan(cube, top)
  if (!plan) throw new Error(`piece ${n + 1}: no plan`)
  applyMoves(cube, plan.uMoves)
  const aligned = middlePlan(cube, top)
  if (!aligned) throw new Error(`piece ${n + 1}: lost plan after align`)
  const placedAt = pieceHome(cube, top)?.pos
  if (!placedAt) throw new Error(`piece ${n + 1}: missing piece`)
  const solvedMid = MID_HOMES.filter((h) => midSolved(cube, h)).length
  const preview =
    solvedMid >= 2
      ? bestVisibleYaw([placedAt, top, FACE_NORMAL[aligned.side], FACE_NORMAL[aligned.roof]])
      : yawRight(v3(placedAt.x, 0, placedAt.z))
  const points = [placedAt, top]
  const start = lessonYawQuat(cube.yaw, false)
  const pose = cuePose(preview, false, points)
  const snapDeg = Math.abs((pose.orbitAngle * 180) / Math.PI)
  if (snapDeg < 8) throw new Error(`piece ${n + 1}: expected a real cue orbit, got ${snapDeg.toFixed(1)}°`)

  const samples = 24
  let prevRemain = Infinity
  let maxStep = 0
  let lastStep = 0
  let prev = start.clone()
  for (let i = 1; i <= samples; i++) {
    const e = easeCubic(i / samples)
    const q = start.clone().slerp(pose.visual, e)
    const step = (prev.angleTo(q) * 180) / Math.PI
    maxStep = Math.max(maxStep, step)
    lastStep = step
    const remain = (q.angleTo(pose.visual) * 180) / Math.PI
    if (remain > prevRemain + 0.05) {
      throw new Error(`piece ${n + 1}: spin moved away from the cue pose (${remain.toFixed(2)} > ${prevRemain.toFixed(2)})`)
    }
    prevRemain = remain
    prev = q
  }
  if (prev.angleTo(pose.visual) > 1e-3) throw new Error(`piece ${n + 1}: slerp missed the cue pose`)
  if (lastStep > 3) {
    throw new Error(`piece ${n + 1}: spin still jumps ${lastStep.toFixed(1)}° on the last sample`)
  }
  const composed = pose.orbitQuat.clone().multiply(pose.yawQuat)
  if (composed.angleTo(pose.visual) > 1e-6) throw new Error(`piece ${n + 1}: orbit/yaw split does not match the spin target`)
  const side = new Vector3(FACE_NORMAL[aligned.side].x, FACE_NORMAL[aligned.side].y, FACE_NORMAL[aligned.side].z)
    .applyQuaternion(pose.visual)
    .normalize()
  const facing = side.dot(cam)
  if (facing < 0.45) throw new Error(`piece ${n + 1}: side ${aligned.side} is not facing the camera (${facing.toFixed(2)})`)

  if (aligned.right) sawRight = true
  else sawLeft = true
  if (solvedMid === 2) sawThird = true
  if (solvedMid === 3) sawFourth = true
  rows.push(
    `piece ${n + 1} ${aligned.right ? 'right' : 'left'} solvedBefore=${solvedMid} oldSnap=${snapDeg.toFixed(1)}° maxStep=${maxStep.toFixed(1)}° lastStep=${lastStep.toFixed(2)}° faceDot=${facing.toFixed(2)}`,
  )

  cube.yaw = aligned.yaw
  const alg = aligned.right ? ALGS.middleRight : ALGS.middleLeft
  for (const m of alg) applyView(cube, m)
  if (!midSolved(cube, top)) throw new Error(`piece ${n + 1}: formula did not solve at teaching yaw ${aligned.yaw}`)
  normalizeOrientation(cube)
}

if (!sawLeft || !sawRight || !sawThird || !sawFourth) {
  throw new Error(`coverage left=${sawLeft} right=${sawRight} third=${sawThird} fourth=${sawFourth}`)
}

const coach = readFileSync(new URL('../src/lesson/coach.ts', import.meta.url), 'utf8')
const highlight = coach.slice(coach.indexOf('private async faceMiddleHighlight'), coach.indexOf('private ensureLeftToRightMiddle'))
if (!highlight.includes('spinToCuePose')) throw new Error('highlight does not use the continuous spin')
if (highlight.includes('frameCues') || highlight.includes('animateYaw') || highlight.includes('settleMainAngle')) {
  throw new Error('highlight still splits the spin or resets the camera')
}
const viewport = readFileSync(new URL('../src/cube/viewport.ts', import.meta.url), 'utf8')
const spin = viewport.slice(viewport.indexOf('async spinToCuePose'), viewport.indexOf('async settleProjectPose'))
if (spin.includes('this.distance') || spin.includes('camera.fov') || spin.includes('updateFit')) {
  throw new Error('cue spin touches camera distance or field of view')
}

console.log(rows.join('\n'))
console.log('middle cue spin: continuous into the same face-on pose, camera distance untouched')
