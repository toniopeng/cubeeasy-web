import { Link } from 'react-router-dom'
import { FAQS, HOME_DESCRIPTION, STEPS } from './content'

type Level = 'page' | 'embed'

/**
 * Factual guide: what CubeEasy is, who it is for, the 7 steps, price, and FAQ.
 * `page` is the /guide document (one h1). `embed` sits under the lesson h1.
 */
export function GuideArticle({ level }: { level: Level }) {
  const Title = level === 'page' ? 'h1' : 'h2'
  const Section = level === 'page' ? 'h2' : 'h3'
  const Question = level === 'page' ? 'h3' : 'h4'
  return (
    <article className="guide-article">
      <Title>Learn to solve a 3×3 cube</Title>
      <p>{HOME_DESCRIPTION}</p>
      <p>
        CubeEasy is for a first solve. Press Play and the coach turns the cube, highlights the
        piece, and shows the formula for that step. You do not need to know algorithms before you
        start.
      </p>
      <section>
        <Section>Who it is for</Section>
        <p>
          Beginners on a phone or a desktop browser, including kids and adults learning a first
          solve. The lesson is the layer method: one layer at a time, with the piece you need lit
          on the cube.
        </p>
      </section>
      <section>
        <Section>The 7-step layer method</Section>
        <ol>
          {STEPS.map((step, i) => (
            <li key={step.name}>
              <strong>
                Step {i + 1}: {step.name}.
              </strong>{' '}
              {step.text}
            </li>
          ))}
        </ol>
      </section>
      <section>
        <Section>Free runs, then Lifetime</Section>
        <p>{FAQS[3].answer}</p>
        <p>
          <Link to="/">Open the tutor</Link>
          {' · '}
          <Link to="/pricing">Pricing</Link>
          {' · '}
          <Link to="/support">Support</Link>
        </p>
      </section>
      <section>
        <Section>Questions</Section>
        {FAQS.map((item) => (
          <section key={item.question}>
            <Question>{item.question}</Question>
            <p>{item.answer}</p>
          </section>
        ))}
      </section>
    </article>
  )
}
