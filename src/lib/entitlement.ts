/**
 * One finished free course, then the paywall.
 * Starting or Reset does not consume it. Lifetime bypasses the limit.
 * Stored only in this browser (localStorage). A private window is a new store.
 */

const KEY = 'cubeeasy.web.v2'

export type EntitlementState = {
  /** Finished free courses. Start and Reset do not change this. */
  completedRuns: number
  /**
   * Legacy start counter from the two-start build.
   * Kept so a later reload still migrates used >= 1 as exhausted.
   * New sessions do not increment it.
   */
  startedRuns: number
  runInProgress: boolean
  isLifetime: boolean
  updatedAt: string
}

function empty(): EntitlementState {
  return {
    completedRuns: 0,
    startedRuns: 0,
    runInProgress: false,
    isLifetime: false,
    updatedAt: new Date().toISOString(),
  }
}

function migrate(parsed: Partial<EntitlementState> & { completedRuns?: number }): EntitlementState {
  const started = Number(parsed.startedRuns) || 0
  const explicit = parsed.completedRuns
  let completed = Number(explicit)
  if (!Number.isFinite(completed)) {
    completed = started >= 1 ? 1 : 0
  } else if (started >= 1) {
    completed = Math.max(completed, 1)
  } else {
    completed = Math.max(0, completed)
  }
  return {
    completedRuns: completed,
    startedRuns: started,
    runInProgress: false,
    isLifetime: Boolean(parsed.isLifetime),
    updatedAt: parsed.updatedAt || new Date().toISOString(),
  }
}

export function loadEntitlement(): EntitlementState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const v1 = localStorage.getItem('cubeeasy.web.v1')
      if (v1) {
        const p = JSON.parse(v1) as { completedRuns?: number; isLifetime?: boolean }
        const used = Number(p.completedRuns) || 0
        const next = migrate({
          completedRuns: used >= 1 ? 1 : 0,
          startedRuns: used,
          isLifetime: Boolean(p.isLifetime),
        })
        saveEntitlement(next)
        return next
      }
      return empty()
    }
    return migrate(JSON.parse(raw) as Partial<EntitlementState>)
  } catch {
    return empty()
  }
}

export function saveEntitlement(state: EntitlementState): void {
  localStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }))
}

/** Lifetime, or the one free course is not finished yet. */
export function canStartCourse(state: EntitlementState): boolean {
  return state.isLifetime || state.completedRuns < 1
}

/**
 * A start does not use up the free course. Kept so callers cannot
 * accidentally increment the old start counter.
 */
export function noteCourseStart(state: EntitlementState): EntitlementState {
  return state
}

/** Reset does not use up the free course and does not clear a finished one. */
export function noteReset(state: EntitlementState): EntitlementState {
  return state
}

/** Count one finished free course. A second call does not count again. */
export function completeFreeCourse(state: EntitlementState): EntitlementState {
  if (state.isLifetime) return state
  if (state.completedRuns >= 1) return state
  const next = { ...state, completedRuns: 1, runInProgress: false }
  saveEntitlement(next)
  return next
}

export function unlockLifetime(state: EntitlementState): EntitlementState {
  const next = { ...state, isLifetime: true }
  saveEntitlement(next)
  return next
}

export function freeCoursesRemaining(state: EntitlementState): number {
  if (state.isLifetime) return Infinity
  return state.completedRuns >= 1 ? 0 : 1
}
