/**
 * Free-course entitlement: one finished course, then the paywall.
 * Start, Reset, and a cancelled purchase do not consume it.
 */
const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
  },
})

const {
  canStartCourse,
  completeFreeCourse,
  freeCoursesRemaining,
  loadEntitlement,
  noteCourseStart,
  noteReset,
  saveEntitlement,
  unlockLifetime,
} = await import('../src/lib/entitlement.ts')

function resetStore() {
  store.clear()
}

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message)
}

resetStore()
{
  let state = loadEntitlement()
  assert(canStartCourse(state), 'new browser can start')
  state = noteCourseStart(state)
  state = noteReset(state)
  assert(state.completedRuns === 0, 'start and reset do not consume')
  assert(canStartCourse(state), 'still allowed after start and reset')
  state = completeFreeCourse(state)
  assert(state.completedRuns === 1, 'finish counts once')
  assert(!canStartCourse(state), 'second course is blocked')
  const again = completeFreeCourse(state)
  assert(again.completedRuns === 1, 'a second finish does not double count')
  assert(freeCoursesRemaining(again) === 0, 'no free course left')
}

resetStore()
{
  const finished = completeFreeCourse(loadEntitlement())
  saveEntitlement(finished)
  const reloaded = loadEntitlement()
  assert(reloaded.completedRuns === 1 && !canStartCourse(reloaded), 'reload stays blocked')
}

resetStore()
{
  store.set(
    'cubeeasy.web.v2',
    JSON.stringify({ startedRuns: 1, runInProgress: true, isLifetime: false, updatedAt: '2026-01-01' }),
  )
  const legacy = loadEntitlement()
  assert(legacy.completedRuns >= 1 && !canStartCourse(legacy), 'legacy startedRuns >= 1 is exhausted')
}

resetStore()
{
  store.set(
    'cubeeasy.web.v2',
    JSON.stringify({ startedRuns: 2, runInProgress: false, isLifetime: false, updatedAt: '2026-01-01' }),
  )
  const legacy = loadEntitlement()
  assert(!canStartCourse(legacy), 'legacy two starts stay exhausted')
}

resetStore()
{
  store.set(
    'cubeeasy.web.v1',
    JSON.stringify({ completedRuns: 1, isLifetime: false }),
  )
  const legacy = loadEntitlement()
  assert(!canStartCourse(legacy), 'v1 completed course is exhausted')
}

resetStore()
{
  store.set(
    'cubeeasy.web.v2',
    JSON.stringify({
      completedRuns: 1,
      startedRuns: 0,
      runInProgress: false,
      isLifetime: true,
      updatedAt: '2026-01-01',
    }),
  )
  const pro = loadEntitlement()
  assert(pro.isLifetime && canStartCourse(pro), 'existing Lifetime can keep going')
}

resetStore()
{
  let state = completeFreeCourse(loadEntitlement())
  assert(!state.isLifetime && !canStartCourse(state), 'closing checkout does not unlock')
  state = unlockLifetime(state)
  assert(state.isLifetime && canStartCourse(state), 'completed checkout unlocks Lifetime')
}

resetStore()
{
  const fresh = loadEntitlement()
  assert(canStartCourse(fresh) && !fresh.isLifetime, 'cancelled checkout before finish still has the free course')
}

console.log('free-course entitlement: completion, blocked second, reload, legacy, lifetime, cancel')
