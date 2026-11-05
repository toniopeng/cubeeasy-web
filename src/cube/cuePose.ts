import { Quaternion, Vector3 } from 'three'
import type { Vec3 } from './model'

/** Horizontal teaching camera. Matches CubeViewport REST (6.2, _, 7.6). */
const TEACH_CAM_XZ = { x: 6.2, z: 7.6 }

/**
 * Extra yaw, after the lesson quarter-turn, that puts the cue points on the
 * camera side. This used to be applied instantly and cut the spin short.
 */
export function cueOrbitAngle(localPoints: Vec3[], yawQuat: Quaternion): number {
  const centroid = new Vector3()
  for (const p of localPoints) {
    centroid.add(new Vector3(p.x, p.y, p.z).applyQuaternion(yawQuat))
  }
  if (localPoints.length) centroid.multiplyScalar(1 / localPoints.length)
  const cam = new Vector3(TEACH_CAM_XZ.x, 0, TEACH_CAM_XZ.z)
  let angle = Math.atan2(cam.x, cam.z) - Math.atan2(centroid.x, centroid.z)
  while (angle > Math.PI) angle -= Math.PI * 2
  while (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

export function lessonYawQuat(yaw: number, flipped: boolean): Quaternion {
  const dest = ((yaw % 4) + 4) % 4
  const yawQ = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), dest * (Math.PI / 2))
  const flipQ = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), flipped ? Math.PI : 0)
  return flipQ.multiply(yawQ)
}

/** Final face-on pose: lesson yaw, then the cue orbit. Visual = orbit * yaw. */
export function cuePose(yaw: number, flipped: boolean, localPoints: Vec3[]) {
  const dest = ((yaw % 4) + 4) % 4
  const yawQuat = lessonYawQuat(dest, flipped)
  const orbitAngle = cueOrbitAngle(localPoints, yawQuat)
  const orbitQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), orbitAngle)
  const visual = orbitQuat.clone().multiply(yawQuat)
  return { dest, yawQuat, orbitQuat, orbitAngle, visual }
}
