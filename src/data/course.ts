export type CourseStep = {
  id: number
  title: string
  goal: string
  tip: string
  algorithm: string
  playHint: string
  color: string
}

/** Beginner 7-step course — brand-safe copy (no Rubik trademarks). */
export const COURSE_STEPS: CourseStep[] = [
  {
    id: 1,
    title: 'White cross',
    goal: 'Make a white plus on the bottom, with side colors matching the centers.',
    tip: 'Hold white as the bottom. Match each white edge to its center color before inserting.',
    algorithm: 'F · R · U · R′ · F′',
    playHint: 'Play runs one short insert cycle. Repeat until the white cross is done.',
    color: '#f8fafc',
  },
  {
    id: 2,
    title: 'White corners',
    goal: 'Finish the white face and the first layer around it.',
    tip: 'Bring a white corner above its slot, then cycle the formula until it drops in.',
    algorithm: 'R′ · D′ · R · D',
    playHint: 'Play = one corner cycle. Keep going until all four white corners are placed.',
    color: '#f8fafc',
  },
  {
    id: 3,
    title: 'Middle layer',
    goal: 'Insert the four middle edges without breaking the white layer.',
    tip: 'Find an edge in the top that belongs in the middle. Match its front color, then go left or right.',
    algorithm: 'U · R · U′ · R′ · U′ · F′ · U · F',
    playHint: 'Play shows one middle-edge insert. Flip the cube orientation for left inserts.',
    color: '#f59e0b',
  },
  {
    id: 4,
    title: 'Yellow cross',
    goal: 'Build a yellow plus on the top face (edges only).',
    tip: 'Dot → L-shape → line → cross. Orient the L or line as shown before you Play.',
    algorithm: 'F · R · U · R′ · U′ · F′',
    playHint: 'Play advances one yellow-cross pattern. You may need 1–3 Plays.',
    color: '#facc15',
  },
  {
    id: 5,
    title: 'Yellow edges',
    goal: 'Swap yellow edges until every top edge matches its center.',
    tip: 'Hold a solved edge at the back when possible. Repeat until all four match.',
    algorithm: 'R · U · R′ · U · R · U2 · R′',
    playHint: 'Play = one edge permutation cycle (Sune-style).',
    color: '#facc15',
  },
  {
    id: 6,
    title: 'Place yellow corners',
    goal: 'Move yellow corners into the correct slots (orientation can be wrong).',
    tip: 'Keep one correct corner as a “headlight” in front-right when you can.',
    algorithm: 'U · R · U′ · L′ · U · R′ · U′ · L',
    playHint: 'Play permutes corners. Check after each Play which corners are in place.',
    color: '#facc15',
  },
  {
    id: 7,
    title: 'Orient yellow corners',
    goal: 'Twist the last corners so the whole cube is solved.',
    tip: 'Hold an unsolved corner in the front-right. After it orients, turn only the top (U) to bring the next corner in.',
    algorithm: 'R′ · D′ · R · D',
    playHint: 'Play = one twist cycle. Finish all corners, then align the last layer.',
    color: '#facc15',
  },
]

export const FREE_RUNS = 2
export const LIFETIME_PRICE_LABEL = '$9.99'
export const PRODUCT_NAME = 'CubeEasy Lifetime'
