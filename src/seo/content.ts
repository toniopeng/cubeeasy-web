/** Keep the free-run count and price aligned with src/data/course.ts. */
const FREE_RUNS = 1
const LIFETIME_PRICE_LABEL = '$9.99'

/** Brand-facing title. No puzzle-trademark or speed-timer wording. */
export const HOME_TITLE = 'CubeEasy — Learn to solve a 3×3 cube'
export const HOME_DESCRIPTION =
  'CubeEasy is a beginner tutor for the classic 3×3 cube. Learn the 7-step layer method with Play and formulas. One finished course is free, then a one-time Lifetime unlock.'

export const GUIDE_TITLE = '7-step beginner method — CubeEasy'
export const GUIDE_DESCRIPTION =
  'How CubeEasy teaches a first 3×3 solve: white cross, bottom corners, middle layer, yellow cross, edges, corners, and the final twist. One finished course is free, then Lifetime.'

export type Faq = { question: string; answer: string }
export type StepInfo = { name: string; text: string }

export const STEPS: StepInfo[] = [
  {
    name: 'White cross',
    text: 'Make a daisy on top, then place each white edge so it matches the side center.',
  },
  {
    name: 'Bottom corners',
    text: 'Solve the four white corners with the corner formula until the first layer is done.',
  },
  {
    name: 'Middle layer',
    text: 'Insert the four middle edges. The coach shows whether the piece goes left or right, then a narrow arrow and the formula.',
  },
  {
    name: 'Yellow cross',
    text: 'Form a cross on the last layer from the dot, L, or line case.',
  },
  {
    name: 'Match the sides',
    text: 'Line the last-layer edges up with the side centers.',
  },
  {
    name: 'Place the corners',
    text: 'Cycle the last corners until each one sits above its home colors.',
  },
  {
    name: 'Twist the corners',
    text: 'Orient the last corners until every face is one color and the cube is solved.',
  },
]

export const FAQS: Faq[] = [
  {
    question: 'What is CubeEasy?',
    answer:
      'CubeEasy is a web tutor that teaches beginners how to solve a classic 3×3 cube. You follow a coached 7-step layer method: press Play, watch the piece and the formula, then repeat until that layer is done.',
  },
  {
    question: 'Who is CubeEasy for?',
    answer:
      'People learning a first solve, including kids and adults, on a phone or a desktop browser. It assumes you do not already know algorithms.',
  },
  {
    question: 'What are the 7 steps?',
    answer:
      'White cross, bottom corners, middle layer, yellow cross, matching the side colors, placing the last corners, and twisting those corners until the cube is solved.',
  },
  {
    question: 'How much does CubeEasy cost?',
    answer: `One full course is free in this browser, and it counts when you finish it. After that, Lifetime is a one-time ${LIFETIME_PRICE_LABEL} unlock on the web. There is no subscription. The iOS app is a separate purchase.`,
  },
  {
    question: 'Do I need an account?',
    answer:
      'No account is required. The free course is stored in this browser and counts when you finish it. A private window does not share that record. Lifetime checkout is handled by Paddle, which is the payment merchant.',
  },
  {
    question: 'Is CubeEasy affiliated with the company that owns the cube trademark?',
    answer:
      'No. CubeEasy is an independent educational tutor. Names and trademarks of the classic cube puzzle belong to their owners.',
  },
  {
    question: 'Can I use CubeEasy on my phone?',
    answer:
      'Yes. The lesson is one screen: the cube, Play, the formula strip, speed, and a move pad. After Reset you can drag to orbit the cube.',
  },
]

export function pageTitle(path: string): string {
  switch (path) {
    case '/guide':
      return GUIDE_TITLE
    case '/pricing':
      return 'Lifetime unlock — CubeEasy'
    case '/support':
      return 'Support — CubeEasy'
    case '/privacy':
      return 'Privacy — CubeEasy'
    case '/terms':
      return 'Terms — CubeEasy'
    case '/copyright':
      return 'Copyright — CubeEasy'
    default:
      return HOME_TITLE
  }
}

export function pageDescription(path: string): string {
  switch (path) {
    case '/guide':
      return GUIDE_DESCRIPTION
    case '/pricing':
      return `CubeEasy Lifetime is ${LIFETIME_PRICE_LABEL} once on the web after one finished free course. No subscription. The 7-step beginner tutor stays unlocked.`
    case '/support':
      return 'Help for CubeEasy on the web. Email taopeng46@gmail.com. One finished course is free in this browser. Lifetime is a one-time purchase sold by Paddle.'
    case '/privacy':
      return 'CubeEasy stores free-run progress in this browser only. Cloudflare Web Analytics does not use cookies. Lifetime checkout is sold by Paddle as Merchant of Record.'
    case '/terms':
      return 'Terms for CubeEasy, an independent 3×3 tutor by PENG TAO. One finished course is free, then Lifetime for US $9.99 once via Paddle. Not affiliated with Rubik’s Brand Ltd.'
    case '/copyright':
      return '© 2026 PENG TAO. Copyright in the CubeEasy website, software, and lesson text. Classic-cube trademarks belong to their owners.'
    default:
      return HOME_DESCRIPTION
  }
}

export function buildJsonLd(root: string) {
  const url = (path: string) => (path === '/' ? root : `${root}${path.slice(1)}/`)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${root}#website`,
        name: 'CubeEasy',
        url: root,
        description: HOME_DESCRIPTION,
        inLanguage: 'en',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${root}#app`,
        name: 'CubeEasy',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        url: root,
        description: HOME_DESCRIPTION,
        inLanguage: 'en',
        isAccessibleForFree: true,
        featureList: [
          '7-step beginner layer method',
          'Play button that coaches each formula',
          'On-cube piece highlights',
          `${FREE_RUNS} finished free course`,
          'One-time Lifetime unlock',
        ],
        offers: [
          {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'One finished free course in this browser',
            url: root,
          },
          {
            '@type': 'Offer',
            price: '9.99',
            priceCurrency: 'USD',
            description: 'Lifetime unlock, one-time, no subscription',
            url: url('/pricing'),
          },
        ],
      },
      {
        '@type': 'Course',
        '@id': `${root}#course`,
        name: 'CubeEasy beginner 3×3 layer method',
        description:
          'A 7-step beginner course that teaches a first solve of the classic 3×3 cube: cross, corners, middle layer, then the last layer.',
        url: url('/guide'),
        provider: { '@type': 'Organization', name: 'CubeEasy', url: root },
        educationalLevel: 'Beginner',
        inLanguage: 'en',
        teaches: 'How to solve a 3×3 cube with a layer-by-layer method',
        syllabusSections: STEPS.map((step, i) => ({
          '@type': 'Syllabus',
          name: `Step ${i + 1}: ${step.name}`,
          description: step.text,
        })),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: `One finished free course, then Lifetime for ${LIFETIME_PRICE_LABEL}`,
          url: url('/pricing'),
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${root}#faq`,
        url: url('/guide'),
        inLanguage: 'en',
        mainEntity: FAQS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  }
}

function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Static HTML for browsers and crawlers that do not run JavaScript. */
export function renderGuideHtml(root: string): string {
  const href = (path: string) => (path === '/' ? root : `${root}${path.slice(1)}/`)
  const steps = STEPS.map(
    (step, i) => `<li><strong>Step ${i + 1}: ${esc(step.name)}.</strong> ${esc(step.text)}</li>`,
  ).join('')
  const faqs = FAQS.map(
    (item) =>
      `<section><h2>${esc(item.question)}</h2><p>${esc(item.answer)}</p></section>`,
  ).join('')
  return `<article>
<h1>Learn to solve a 3×3 cube</h1>
<p>${esc(HOME_DESCRIPTION)}</p>
<p>CubeEasy is for a first solve. Press Play and the coach turns the cube, highlights the piece, and shows the formula for that step.</p>
<h2>The 7-step layer method</h2>
<ol>${steps}</ol>
<h2>Free runs, then Lifetime</h2>
<p>${esc(FAQS[3].answer)}</p>
<h2>Questions</h2>
${faqs}
<p><a href="${esc(href('/'))}">Open the tutor</a> · <a href="${esc(href('/pricing'))}">Pricing</a> · <a href="${esc(href('/support'))}">Support</a></p>
</article>`
}

export function robotsTxt(root: string): string {
  return `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${root}sitemap.xml
`
}

export function sitemapXml(root: string, lastmod: string): string {
  const pages: { path: string; priority: string }[] = [
    { path: '/', priority: '1.0' },
    { path: '/guide', priority: '0.8' },
    { path: '/pricing', priority: '0.6' },
    { path: '/support', priority: '0.4' },
    { path: '/privacy', priority: '0.2' },
    { path: '/terms', priority: '0.2' },
    { path: '/copyright', priority: '0.2' },
  ]
  const urls = pages
    .map(({ path, priority }) => {
      const loc = path === '/' ? root : `${root}${path.slice(1)}/`
      return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority></url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}
