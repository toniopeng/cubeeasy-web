/** Two full course starts are free. The third start waits for lifetime unlock. (matches CourseStore) */

const KEY = 'cubeeasy.web.v2'

export type EntitlementState = {
  startedRuns: number
  runInProgress: boolean
  isLifetime: boolean
  updatedAt: string
}

function empty(): EntitlementState {
  return {
    startedRuns: 0,
    runInProgress: false,
    isLifetime: false,
    updatedAt: new Date().toISOString(),
  }
}

export function loadEntitlement(): EntitlementState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      // migrate v1 completedRuns → startedRuns
      const v1 = localStorage.getItem('cubeeasy.web.v1')
      if (v1) {
        const p = JSON.parse(v1) as { completedRuns?: number; isLifetime?: boolean }
        const next: EntitlementState = {
          startedRuns: Number(p.completedRuns) || 0,
          runInProgress: false,
          isLifetime: Boolean(p.isLifetime),
          updatedAt: new Date().toISOString(),
        }
        saveEntitlement(next)
        return next
      }
      return empty()
    }
    const parsed = JSON.parse(raw) as Partial<EntitlementState>
    return {
      startedRuns: Number(parsed.startedRuns) || 0,
      runInProgress: Boolean(parsed.runInProgress),
      isLifetime: Boolean(parsed.isLifetime),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return empty()
  }
}

export function saveEntitlement(state: EntitlementState): void {
  localStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }))
}

export function canStartRun(state: EntitlementState): boolean {
  return state.isLifetime || state.startedRuns < 2 || state.runInProgress
}

export function beginRun(state: EntitlementState): EntitlementState {
  const next = { ...state, startedRuns: state.startedRuns + 1, runInProgress: true }
  saveEntitlement(next)
  return next
}

export function abandonRun(state: EntitlementState): EntitlementState {
  const next = { ...state, runInProgress: false }
  saveEntitlement(next)
  return next
}

export function finishRun(state: EntitlementState): EntitlementState {
  if (!state.runInProgress) return state
  const next = { ...state, runInProgress: false }
  saveEntitlement(next)
  return next
}

export function unlockLifetime(state: EntitlementState): EntitlementState {
  const next = { ...state, isLifetime: true }
  saveEntitlement(next)
  return next
}

export function freeRunsRemaining(state: EntitlementState): number {
  if (state.isLifetime) return Infinity
  return Math.max(0, 2 - state.startedRuns)
}
