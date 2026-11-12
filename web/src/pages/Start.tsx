const STEPS = [
  {
    title: "Highlight words in two essays",
    time: "2 minutes",
    href: "#",
    link: "Open the home page",
    doIt: "Two essays answer the same question: one by a learner of English, one by an AI model. Press the buttons above them to highlight one kind of word at a time.",
    notice: "The AI essay is full of less common words. Is that better writing, or just different writing?",
  },
  {
    title: "Compare one measure across 84 essays",
    time: "3 minutes",
    href: "#compare",
    link: "Open Compare",
    doIt: "Choose one measure, such as lexical diversity. Each dot is one essay. Read the sentence under the chart.",
    notice: "The groups overlap: some learners score like the model, and the effect size says how big the difference really is.",
  },
  {
    title: "Try to catch the AI essays",
    time: "3 minutes",
    href: "#detection",
    link: "Open Why detection fails",
    doIt: "A simple detector scores every essay. Move the threshold slider and watch who gets flagged.",
    notice: "Once the AI is asked to write like a student, catching its essays means flagging real learners too.",
  },
  {
    title: "Guess who wrote it",
    time: "5 minutes",
    href: "#lab-3",
    link: "Open Lab 3",
    doIt: "Play five rounds: read an excerpt, guess learner or AI, then see what the computer guessed from small words like I and the.",
    notice: "Both you and the computer get some wrong. Ask what level of accuracy would justify accusing a student.",
  },
  {
    title: "See how AI reads your language",
    time: "2 minutes",
    href: "#lab-5",
    link: "Open Lab 5",
    doIt: "Choose a language and see the same text cut into the pieces (tokens) an AI model reads.",
    notice: "The same message takes more tokens, and so costs more, in many languages than in English: about 1.5 to 5 times more in Vietnamese depending on the model, and more still in Burmese or Amharic.",
  },
];

export default function Start() {
  return (
    <article>
      <h1>Start here: a 15-minute tour</h1>
      <p className="lede">
        No background in linguistics, statistics or programming is needed. Follow the five steps in order; each opens a page of the site and
        tells you what to look for. Turn on <strong>Guidance</strong> (top right) for explanations next to every chart.
      </p>
      <ol className="tour">
        {STEPS.map((s) => (
          <li key={s.title}>
            <h2>
              {s.title} <span className="tour-time">{s.time}</span>
            </h2>
            <p>
              <strong>Do:</strong> {s.doIt}
            </p>
            <p>
              <strong>Notice:</strong> {s.notice}
            </p>
            <a className="button" href={s.href}>
              {s.link}
            </a>
          </li>
        ))}
      </ol>
      <h2>After the tour</h2>
      <ul className="lab-steps">
        <li>
          Unfamiliar word? Every underlined term links to the <a href="#glossary">glossary</a>, with plain definitions.
        </li>
        <li>
          Teaching? <a href="#teach">Teach with it</a> has ready-made session plans with timings and discussion questions.
        </li>
        <li>
          Your own texts: <a href="#compare-own">Compare</a> accepts two sets of your own writing. Nothing you paste leaves your browser.
        </li>
      </ul>
    </article>
  );
}
