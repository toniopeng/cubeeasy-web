import { FREE_RUNS } from '../data/course'

const KEY = 'cubeeasy.web.v1'

export type EntitlementState = {
  completedRuns: number
  isLifetime: boolean
  updatedAt: string
}

function empty(): EntitlementState {
  return { completedRuns: 0, isLifetime: false, updatedAt: new Date().toISOString() }
}

export function loadEntitlement(): EntitlementState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<EntitlementState>
    return {
      completedRuns: Number(parsed.completedRuns) || 0,
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

export function freeRunsRemaining(state: EntitlementState): number {
  if (state.isLifetime) return Infinity
  return Math.max(0, FREE_RUNS - state.completedRuns)
}

export function canStartRun(state: EntitlementState): boolean {
  return state.isLifetime || state.completedRuns < FREE_RUNS
}

export function markRunCompleted(state: EntitlementState): EntitlementState {
  if (state.isLifetime) return state
  const next = {
    ...state,
    completedRuns: Math.min(FREE_RUNS, state.completedRuns + 1),
  }
  saveEntitlement(next)
  return next
}

export function unlockLifetime(state: EntitlementState): EntitlementState {
  const next = { ...state, isLifetime: true }
  saveEntitlement(next)
  return next
}

export function resetEntitlement(): EntitlementState {
  const next = empty()
  saveEntitlement(next)
  return next
}
