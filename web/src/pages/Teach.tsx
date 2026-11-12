import { REPO_URL } from "../config";

interface Plan {
  id: string;
  title: string;
  who: string;
  length: string;
  outcome: string;
  steps: { time: string; what: React.ReactNode }[];
  after?: React.ReactNode;
}

const PLANS: Plan[] = [
  {
    id: "integrity-workshop",
    title: "Can a machine spot the machine?",
    who: "Academic staff, integrity officers, teacher professional development",
    length: "60 minutes",
    outcome: "Participants can explain why automated AI-writing detection misjudges learners, and draft a fairer response to suspected AI use.",
    steps: [
      {
        time: "0–10 min",
        what: (
          <>
            Put the two opening passages from the <a href="#">home page</a> on a slide without their labels. Ask the room which was written by a
            learner and which by a model, and what made them decide. Then open the home page and switch between the highlights to compare their
            reasons with the counts.
          </>
        ),
      },
      {
        time: "10–30 min",
        what: (
          <>
            Open <a href="#detection">Why detection fails</a>. Start at “Best overall accuracy”, then press “Catch every model essay”. Ask:
            who pays for the errors at each setting? Pairs then choose a threshold they would defend to a student, and explain it.
          </>
        ),
      },
      {
        time: "30–45 min",
        what: (
          <>
            On <a href="#compare">Compare</a>, set the first group to “Learners, higher proficiency” and the second to “Model, write as a
            10th-grade student”. Which measures still separate them? Which do not?
          </>
        ),
      },
      {
        time: "45–60 min",
        what: <>Discuss: if not detection, what evidence of authorship would be fair? Groups draft three principles for their own unit or course.</>,
      },
    ],
    after: (
      <>
        Pairs well with teacher-led conversations about how a piece of work was produced, which ask students to explain their choices rather than
        relying on a score.
      </>
    ),
  },
  {
    id: "tokens-equity",
    title: "Who pays for language models? Tokenisation and equity",
    who: "Linguistics, language technology, TESOL or digital humanities classes; also staff development on AI",
    length: "One 50-minute session",
    outcome: "Students can explain what a model token is, measure the token premium for a language they know, and argue how it affects cost, access and fairness.",
    steps: [
      { time: "0–10 min", what: <>Ask: “Does a language model treat every language the same?” Collect quick predictions. Show Article 1 in English and Vietnamese in <a href="#lab-5">Lab 5</a> and count the tokens together.</> },
      { time: "10–25 min", what: <>Pairs paste a paragraph in a language they know and record characters per token with each tokeniser. Those who know only English try a passage of their own writing and a passage of Shakespeare.</> },
      { time: "25–40 min", what: <>Use the chart: which languages gained most from newer tokenisers, and which still pay most? Groups estimate how many pages of Burmese fit where 100 pages of English do.</> },
      { time: "40–50 min", what: <>Discussion with the reflection questions. Exit task: one paragraph on who bears the cost of the token premium in a context they know.</> },
    ],
    after: (
      <>
        Readings: Petrov et al. (2023) and Ahia et al. (2023), cited at the end of Lab 5. Coding follow-up: the notebook{" "}
        <a href={`${REPO_URL}/blob/main/notebooks/lab5_tokenisation.ipynb`}>lab5_tokenisation.ipynb</a>.
      </>
    ),
  },
  {
    id: "dh-methods",
    title: "First steps in text as data",
    who: "Undergraduate or postgraduate digital humanities, linguistics or literary studies",
    length: "Two 50-minute tutorials",
    outcome: "Students can run a concordance, read frequency and keyness results critically, and explain what Burrows' Delta measures.",
    steps: [
      { time: "Week 1, 0–25 min", what: <><a href="#lab-1">Lab 1</a>: concordance and frequency on Persuasion. Students record one pattern they found by reading lines that the count alone did not show.</> },
      { time: "Week 1, 25–50 min", what: <><a href="#lab-2">Lab 2</a>: keyness and collocation. Small groups sort the key words into topic, function, error and stance words, then report back.</> },
      { time: "Week 2, 0–30 min", what: <><a href="#lab-3">Lab 3</a>: style fingerprints. Students play five rounds of “Who wrote it?”, then predict what happens with 10 and with 200 most frequent words before they move the slider. Literary groups continue with the novels extension.</> },
      { time: "Week 2, 30–50 min", what: <><a href="#lab-4">Lab 4</a>: critical reading of an AI summary. Close with the reflection questions as a short written exit task.</> },
    ],
    after: (
      <>
        For a coding follow-up, students open the matching Python notebook in the <a href={`${REPO_URL}/tree/main/notebooks`}>notebooks folder</a> and
        reproduce one result.
      </>
    ),
  },
  {
    id: "writing-class",
    title: "Seeing your own writing",
    who: "Academic writing, EAP and TESOL classes",
    length: "50 minutes",
    outcome: "Students notice how they hedge, signpost and vary sentences, and revise one paragraph on purpose.",
    steps: [
      { time: "0–10 min", what: <>On the home page, switch between “Hedges” and “Connectives” to show what each highlights. Agree on what a hedge is for.</> },
      {
        time: "10–25 min",
        what: (
          <>
            Each student pastes a paragraph of their own into “Add a single text” on <a href="#compare">Compare</a> and notes where their ink dot falls on
            hedges, connectives and sentence-length variation.
          </>
        ),
      },
      { time: "25–45 min", what: <>Students revise the paragraph for one deliberate change, for example softening one overstated claim, then paste it again.</> },
      { time: "45–50 min", what: <>Share one before-and-after pair. Discuss: did the number change for a good reason?</> },
    ],
    after: <>Frame the measures as descriptions, not grades. A lower or higher value is not better in itself; purpose and audience decide.</>,
  },
  {
    id: "research-methods",
    title: "Comparing your own corpora",
    who: "Research methods seminars, honours and HDR students, researchers",
    length: "50 minutes",
    outcome: "Participants compare two text collections of their own and judge which differences are worth investigating further.",
    steps: [
      {
        time: "Before class",
        what: (
          <>
            Prepare two folders of .txt files or two CSV files with a <code>text</code> column, for example student responses and AI responses to the same task,
            with names removed.
          </>
        ),
      },
      { time: "0–20 min", what: <>Load both sets with <a href="#compare-own">Compare your own texts</a>. Note which measures differ and which do not.</> },
      { time: "20–35 min", what: <>Use keyness to find the words behind the difference, then read them in context. Is the difference topic, genre, proficiency or source?</> },
      { time: "35–50 min", what: <>Download the measures as CSV and plan one follow-up analysis, such as a regression in R or Python, or a qualitative coding of the key passages.</> },
    ],
  },
];

export default function Teach() {
  return (
    <>
      <h1>Teach with it</h1>
      <p className="lede">
        The Language &amp; AI Literacy Lab is free, needs no login and works on a projector or students' own laptops. Below are ready-to-run session plans you
        can adapt, and notes on using your own texts.
      </p>

      <div className="panel prose">
        <p>
          <strong>Before you start.</strong> Everything runs in the browser: texts typed, pasted or loaded from files are never sent anywhere. The
          site is a teaching and research aid. It does not detect AI writing, and its measures should never be used to judge whether a particular
          student wrote a particular text.
        </p>
      </div>

      <section className="prose">
        <h2>First time teaching with it?</h2>
        <p>
          You do not need a background in corpus linguistics or statistics. Allow about 45 minutes to prepare a session for the first time:
        </p>
        <ol>
          <li>
            <strong>Walk the ten-minute route</strong> on the <a href="#">home page</a> yourself, with the Guidance switch on. The shaded boxes
            explain every chart in the order students will meet it.
          </li>
          <li>
            <strong>Read the glossary entries</strong> for the terms your session uses. For most sessions these are{" "}
            <a href="#glossary/per-1000">per 1,000 words</a>, <a href="#glossary/strip-plot">strip plot</a>,{" "}
            <a href="#glossary/keyness">keyness</a> and <a href="#glossary/concordance">concordance</a>; for the integrity workshop add{" "}
            <a href="#glossary/threshold">threshold</a> and <a href="#glossary/false-positive">false positive</a>.
          </li>
          <li>
            <strong>Do the lab you will set</strong>, all steps, and note your own answers to the reflection questions. There are no single
            right answers; the questions are designed for discussion.
          </li>
          <li>
            <strong>Check the room.</strong> The site works on any recent browser, needs no login and nothing to install. Test it once on the
            classroom computer and on a phone.
          </li>
        </ol>
        <h3>Explaining the big idea in two sentences</h3>
        <p>
          “Computers can count features of writing, such as word length or how often we hedge, much faster than we can. But a count only
          describes a text; deciding what it means, and whether it says anything about the writer, is still our job.”
        </p>
        <h3>If students ask what a number means</h3>
        <p>
          Every measure has a plain-language definition: select its name on the Compare page or look it up in the{" "}
          <a href="#glossary">glossary</a>. If a number seems surprising, the best move is always to open the text behind the dot and read it
          together.
        </p>
      </section>

      <nav aria-label="Session plans">
        <ul className="index">
          {PLANS.map((p) => (
            <li key={p.id}>
              <a href={`#teach`} onClick={(e) => (e.preventDefault(), document.getElementById(p.id)?.scrollIntoView({ behavior: "smooth" }))}>
                <span className="index-title">{p.title}</span>
                <span className="index-desc">
                  {p.who}. {p.length}.
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {PLANS.map((p) => (
        <section key={p.id} id={p.id} className="prose" style={{ scrollMarginTop: 80 }}>
          <h2>{p.title}</h2>
          <p className="muted">
            {p.who}. {p.length}.
          </p>
          <p>
            <strong>By the end:</strong> {p.outcome}
          </p>
          <div className="table-wrap">
            <table>
              <tbody>
                {p.steps.map((s) => (
                  <tr key={s.time}>
                    <td style={{ width: "9.5em", color: "var(--ink-2)", whiteSpace: "nowrap" }}>{s.time}</td>
                    <td>{s.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {p.after && <p style={{ marginTop: 14 }}>{p.after}</p>}
        </section>
      ))}

      <section className="prose">
        <h2>Using your own texts</h2>
        <ul>
          <li>
            <strong>Formats.</strong> Plain-text files (.txt or .md, one text per file), a CSV file with one text per row in a column called{" "}
            <code>text</code>, or texts pasted into the box with a line containing only <code>---</code> between them. An optional <code>id</code>{" "}
            column in a CSV labels each text.
          </li>
          <li>
            <strong>Size.</strong> Measures are unstable under about 100 words. Ten or more texts per set make averages worth comparing.
          </li>
          <li>
            <strong>Ethics.</strong> Remove names and identifying details from student work, and follow your institution's rules on using student
            texts, even for classroom demonstrations.
          </li>
          <li>
            <strong>Language.</strong> The measures are built for English. Texts in other languages, or texts that switch languages, will have
            inflated “beyond the 2,000 most common words” values.
          </li>
        </ul>

        <h2>Questions</h2>
        <h3>Is this an AI detector?</h3>
        <p>No. It shows why style-based detection is unreliable and unfair to language learners. No page on the site gives a verdict on authorship.</p>
        <h3>Can I change the built-in essays or add my own?</h3>
        <p>
          Use “Compare your own texts” for quick comparisons. To change the built-in corpus for a course, fork the{" "}
          <a href={REPO_URL}>repository</a> and edit <code>scripts/prepare_data.py</code>; the README explains the steps.
        </p>
        <h3>How do I cite it?</h3>
        <p className="small">Ngo, C. (2026). Language &amp; AI Literacy Lab: Linguistic analysis of human and AI writing [Computer software]. {REPO_URL}</p>
        <h3>Found a problem or have an idea?</h3>
        <p>
          Open an issue on <a href={`${REPO_URL}/issues`}>GitHub</a>.
        </p>
      </section>
    </>
  );
}
