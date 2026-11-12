import { useMemo, useState, type ReactNode } from "react";
import { useData, useResources, type Lab4Data } from "../lib/data";
import { collocates, freq, keyness, tokens } from "../lib/text";
import { Concordance } from "../components/Concordance";
import { BarList } from "../components/charts";
import { Guide, Term } from "../components/Guide";
import { LabFrame } from "../components/LabFrame";
import Lab3 from "./Lab3";
import Lab5 from "./Lab5";

const LABS = [
  { n: "1", title: "Concordance and frequency", blurb: "Read every occurrence of a word in its context, then count." },
  { n: "2", title: "Keyness and collocation", blurb: "Which words distinguish two groups, and which words keep company?" },
  { n: "3", title: "Who wrote this? Style fingerprints", blurb: "Guess whether a learner or an AI wrote an essay, then see how a computer guesses from small words." },
  { n: "4", title: "Reading an AI summary critically", blurb: "Check a model's account of Austen against the text itself." },
  { n: "5", title: "How language models see your language", blurb: "Split the same text into model tokens in 22 languages, and see who pays more." },
];

const STOP = new Set(
  "the a an and or but of to in on at for with by from as is are was were be been being it its this that these those he she they them his her their i you we my your our me him us not no so if then than there here what which who whom when where why how all any some such into out up down over under again very can could would should will shall may might must do does did have has had am".split(
    " ",
  ),
);

function Lab1() {
  const res = useResources();
  const persuasion = useData<string>("persuasion.txt", "text");
  const [corpus, setCorpus] = useState<"persuasion" | "learners" | "model">("persuasion");
  const [node, setNode] = useState("persuaded");
  const [hideStop, setHideStop] = useState(true);

  const docs = useMemo(() => {
    if (corpus === "persuasion") return persuasion.data ? [{ id: "Persuasion", text: persuasion.data }] : [];
    if (!res.data) return [];
    return res.data.essays.essays.filter((e) => (corpus === "learners" ? e.source === "human" : e.source === "llm")).map((e) => ({ id: e.id, text: e.text }));
  }, [corpus, persuasion.data, res.data]);

  const toks = useMemo(() => docs.flatMap((d) => tokens(d.text)), [docs]);
  const top = useMemo(() => {
    const f = freq(toks);
    return [...f.entries()]
      .filter(([w]) => !hideStop || !STOP.has(w))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [toks, hideStop]);
  const nodeCount = useMemo(() => {
    const parts = node.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 0;
    let c = 0;
    for (let i = 0; i + parts.length <= toks.length; i++) if (parts.every((p, k) => toks[i + k] === p)) c++;
    return c;
  }, [toks, node]);

  return (
    <LabFrame
      title="Lab 1. Concordance and frequency"
      goal="Distant reading starts with counting, but counts mean little until you read the lines behind them. This lab moves between the two."
      notebook="lab1_concordance_frequency.ipynb"
      time="30 minutes"
      ideas={
        <>
          <p>You need no prior experience. Three ideas are enough:</p>
          <ul>
            <li>
              A <Term id="corpus">corpus</Term> is the collection of texts you are studying. Here you can choose Jane Austen's novel{" "}
              <em>Persuasion</em>, 60 learner essays or 24 AI essays.
            </li>
            <li>
              A <Term id="concordance">concordance</Term> shows every occurrence of a word (the <Term id="node">node word</Term>) in the middle
              of a line, with its context either side.
            </li>
            <li>
              Counts are given <Term id="per-1000">per 1,000 words</Term>, so corpora of different sizes can be compared.
            </li>
          </ul>
          <p>Type a word in the search box, then use the sort buttons above the concordance to group similar lines together.</p>
        </>
      }
      steps={[
        <>Start with Austen's <em>Persuasion</em> and the word “persuaded”. Sort by the word after it. Who is persuaded, and to do what?</>,
        <>Search for “felt”, then for “thought”. Read twenty lines of each. What does the novel let us know about characters' minds, and how?</>,
        <>Switch to the learner essays and search “because”, then do the same for the model essays. Compare how often, and how, each group gives reasons.</>,
        <>Look at the frequency list with and without common function words. Which list tells you more about the text, and which about English?</>,
      ]}
      reflect={[
        "What did reading the concordance lines show you that the count alone did not?",
        "Where did your own interpretation enter? Which decisions (the search term, the sorting, which lines you read) shaped what you saw?",
      ]}
    >
      <div className="controls">
        <label className="field">
          Corpus
          <select value={corpus} onChange={(e) => setCorpus(e.target.value as typeof corpus)}>
            <option value="persuasion">Austen, Persuasion (1817)</option>
            <option value="learners">Learner essays (60)</option>
            <option value="model">Model essays (24)</option>
          </select>
        </label>
        <label className="field">
          Word or phrase
          <input type="search" value={node} onChange={(e) => setNode(e.target.value)} />
        </label>
      </div>
      {(persuasion.error || res.error) && <p className="error">{persuasion.error ?? res.error}</p>}
      {toks.length > 0 && (
        <p className="small muted">
          “{node}” occurs {nodeCount} times in {toks.length.toLocaleString()} words ({((1000 * nodeCount) / toks.length).toFixed(2)} per 1,000 words).
        </p>
      )}
      <Concordance docs={docs} node={node} showDoc={corpus !== "persuasion"} />
      <h3>Most frequent words</h3>
      <Guide>
        <p>
          The bars rank the 20 most frequent words. With “Hide common function words” ticked, small grammatical words (
          <Term id="function-words">function words</Term> such as the, and, of) are removed, leaving words that say more about the topic. Untick
          it: the list then looks much the same for almost any English text.
        </p>
      </Guide>
      <label className="small" style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="checkbox" checked={hideStop} onChange={(e) => setHideStop(e.target.checked)} /> Hide common function words
      </label>
      <BarList rows={top.map(([w, c]) => ({ label: w, value: (1000 * c) / Math.max(1, toks.length), color: "#475867" }))} digits={1} suffix="" />
      <p className="small muted">Values are occurrences per 1,000 words.</p>
    </LabFrame>
  );
}

// ---------------- Lab 2 ----------------

function Lab2() {
  const { data, error } = useResources();
  const [node, setNode] = useState("technology");
  const [win, setWin] = useState(4);

  const out = useMemo(() => {
    if (!data) return null;
    const tH = data.essays.essays.filter((e) => e.source === "human").flatMap((e) => tokens(e.text));
    const tM = data.essays.essays.filter((e) => e.source === "llm").flatMap((e) => tokens(e.text));
    const n = node.toLowerCase().trim();
    return {
      key: keyness(tH, tM, 5).filter((r) => r.ll >= 6.63),
      colH: collocates(tH, n, win, 3).slice(0, 12),
      colM: collocates(tM, n, win, 2).slice(0, 12),
    };
  }, [data, node, win]);

  return (
    <LabFrame
      title="Lab 2. Keyness and collocation"
      goal="Keyness finds the words that most distinguish one corpus from another. Collocation finds the words that habitually travel with a word. Together they sketch a group's characteristic phrasing."
      notebook="lab2_keyness_collocation.ipynb"
      time="40 minutes"
      ideas={
        <ul>
          <li>
            <Term id="keyness">Keyness</Term> lists the words that are unusually frequent in one group compared with the other. Here the
            groups are the learner essays and the AI essays.
          </li>
          <li>
            <Term id="collocation">Collocates</Term> are words that keep appearing near a given word, within a <Term id="window">window</Term>{" "}
            of a few words either side.
          </li>
          <li>
            Collocates are ranked by <Term id="logdice">logDice</Term>, a score of how strongly two words are attached (maximum 14). The table
            also shows <Term id="mi">MI</Term>, an older score that favours rare words.
          </li>
        </ul>
      }
      steps={[
        <>Scan the keyness lists. Sort the words into rough groups: topic words, function words, misspellings, stance and evaluation. Which group dominates each side?</>,
        <>Look up two key words from each side on the Compare page to read them in context.</>,
        <>Enter “technology” and compare its collocates in learner and model essays. Then try “students”, “home” and “online”.</>,
        <>Change the window from 4 to 2 words, then to 8. Which collocates are stable, and which come and go?</>,
      ]}
      reflect={[
        "Keyness is relative: these words are key only against this comparison corpus. What would change with a different reference corpus?",
        "Misspellings appear as key learner words. Is that a finding about learners, or a limitation of the method?",
      ]}
    >
      {error && <p className="error">{error}</p>}
      {out && (
        <>
          <h3>Key words: learners against the model</h3>
          <div className="two-col">
            {(
              [
                ["More typical of learners", out.key.filter((r) => r.logRatio > 0).slice(0, 25), "#008f86"],
                ["More typical of the model", out.key.filter((r) => r.logRatio < 0).slice(0, 25), "#b07d12"],
              ] as const
            ).map(([title, rows, c]) => (
              <div key={title}>
                <p style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="swatch" style={{ background: c }} />
                  {title}
                </p>
                <p className="reading" style={{ fontSize: "1.1rem" }}>
                  {rows.map((r) => r.word).join(", ")}
                </p>
              </div>
            ))}
          </div>
          <h3>Collocates</h3>
          <Guide>
            <p>
              Type a node word and compare the two tables. “Together” is how many times the collocate appears within the window around the
              node word. A word near the top of both tables is a shared habit; a word in only one table is distinctive of that group. Start
              with “technology”, which both groups write about, and compare what they say about it.
            </p>
          </Guide>
          <div className="controls">
            <label className="field">
              Node word
              <input type="search" value={node} onChange={(e) => setNode(e.target.value)} />
            </label>
            <label className="field">
              Window: {win} words either side
              <input type="range" min={1} max={8} value={win} onChange={(e) => setWin(Number(e.target.value))} style={{ width: 200 }} />
            </label>
          </div>
          <p className="small muted">
            Ranked by logDice (Rychlý, 2008), which rewards words that occur mostly near the node. Its maximum is 14. MI is shown for
            comparison: it favours rare words.
          </p>
          <div className="two-col">
            {(
              [
                ["Learner essays (at least 3 co-occurrences)", out.colH, "#008f86"],
                ["Model essays (at least 2 co-occurrences)", out.colM, "#b07d12"],
              ] as const
            ).map(([title, rows, c]) => (
              <div key={title} className="table-wrap">
                <p style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="swatch" style={{ background: c }} />
                  {title}
                </p>
                {rows.length === 0 ? (
                  <p className="muted">No collocates meet the minimum. Try a more frequent word or a wider window.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Collocate</th>
                        <th className="num">Together</th>
                        <th className="num">logDice</th>
                        <th className="num">MI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.word}>
                          <td>{r.word}</td>
                          <td className="num">{r.joint}</td>
                          <td className="num">{r.logDice.toFixed(2)}</td>
                          <td className="num">{r.mi.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </LabFrame>
  );
}

// ---------------- Lab 4 ----------------

type Verdict = "text" | "context" | "interpretation";

function Lab4() {
  const { data, error } = useData<Lab4Data>("lab4.json");
  const [sel, setSel] = useState<number | null>(null);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({});

  const parts = useMemo(() => {
    if (!data) return null;
    const sents = data.model.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
    const passageToks = new Set(tokens(data.passage).filter((w) => !STOP.has(w)));
    const info = sents.map((s) => {
      const content = tokens(s).filter((w) => !STOP.has(w));
      const shared = content.filter((w) => passageToks.has(w));
      return { s, content, shared: new Set(shared), overlap: content.length ? shared.length / content.length : 0 };
    });
    return { info };
  }, [data]);

  const highlightPassage = (text: string, words: Set<string>) => {
    const out: ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)) {
      const w = m[0].toLowerCase().replace("’", "'");
      if (words.has(w)) {
        out.push(text.slice(last, m.index));
        out.push(<mark key={m.index}>{m[0]}</mark>);
        last = (m.index ?? 0) + m[0].length;
      }
    }
    out.push(text.slice(last));
    return out;
  };

  return (
    <LabFrame
      title="Lab 4. Reading an AI summary critically"
      goal="Language models summarise fluently, mixing what a text says with what is commonly said about it. This lab separates the two, using word overlap as a starting point, not a verdict."
      notebook="lab4_critical_ai_reading.ipynb"
      time="30 minutes"
      ideas={
        <>
          <p>
            You will compare a passage from Austen's <em>Persuasion</em> (Captain Wentworth's letter to Anne Elliot) with a summary written by
            an AI <Term id="llm">large language model</Term>.
          </p>
          <p>
            For each sentence of the summary, the lab measures <Term id="overlap">content-word overlap</Term>: how many of its meaningful
            words also appear in the letter. Overlap is a clue, not a verdict. A sentence can share many words with the letter and still add
            something it never says, and a faithful paraphrase can share very few.
          </p>
        </>
      }
      steps={[
        <>Read Captain Wentworth's letter, then the model's summary.</>,
        <>Select each sentence of the summary. The words it shares with the letter are highlighted in the letter, with an overlap score.</>,
        <>Decide what each sentence rests on: the letter itself, knowledge of the wider novel, or interpretation. Record your judgement with the buttons.</>,
        <>Find a sentence with high overlap that still says something the letter does not. Find one with low overlap that is nonetheless accurate.</>,
      ]}
      reflect={[
        "Which claims would a reader who had not read Persuasion be unable to check? Why does that matter for students using AI summaries?",
        "Word overlap rewards copying and penalises paraphrase. When is a low-overlap sentence the better reading?",
        "Where is the model's interpretation confident in a way a literary critic would hedge?",
      ]}
    >
      {error && <p className="error">{error}</p>}
      {data && parts && (
        <div className="two-col">
          <div>
            <h3 style={{ marginTop: 0 }}>The letter</h3>
            <p className="small muted">{data.passageSource}</p>
            <div className="reading" style={{ whiteSpace: "pre-wrap" }}>
              {sel === null ? data.passage : highlightPassage(data.passage, parts.info[sel].shared)}
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>The model's summary</h3>
            <p className="small muted">{data.modelSource}</p>
            <p className="reading">
              {parts.info.map((p, i) => (
                <span key={i}>
                  <span
                    className="sentence-btn"
                    role="button"
                    tabIndex={0}
                    aria-pressed={sel === i}
                    onClick={() => setSel(sel === i ? null : i)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(sel === i ? null : i))}
                  >
                    {p.s}
                  </span>{" "}
                </span>
              ))}
            </p>
            {sel !== null && (
              <div className="panel" aria-live="polite">
                <p style={{ marginBottom: 6 }}>
                  <strong>{Math.round(parts.info[sel].overlap * 100)}%</strong> of this sentence's content words also appear in the letter
                  {parts.info[sel].shared.size > 0 ? `: ${[...parts.info[sel].shared].join(", ")}.` : "."}
                </p>
                <p className="small" style={{ marginBottom: 8 }}>
                  This claim rests on:
                </p>
                <div className="chips" role="group" aria-label="What does this claim rest on?">
                  {(
                    [
                      ["text", "The letter itself"],
                      ["context", "The wider novel"],
                      ["interpretation", "Interpretation"],
                    ] as [Verdict, string][]
                  ).map(([k, l]) => (
                    <button key={k} className="chip" aria-pressed={verdicts[sel] === k} onClick={() => setVerdicts({ ...verdicts, [sel]: k })}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(verdicts).length > 0 && (
              <p className="small muted">
                Your judgements so far: {Object.values(verdicts).filter((v) => v === "text").length} from the letter,{" "}
                {Object.values(verdicts).filter((v) => v === "context").length} from the wider novel,{" "}
                {Object.values(verdicts).filter((v) => v === "interpretation").length} interpretation, out of {parts.info.length} sentences.
              </p>
            )}
          </div>
        </div>
      )}
    </LabFrame>
  );
}

export default function Labs({ lab }: { lab?: string }) {
  const current = LABS.find((l) => l.n === lab);
  return (
    <>
      <h1>Labs</h1>
      <p className="lede">
        Five short, self-contained labs for a first course in digital humanities methods. Each pairs a computational step with close reading
        and ends with questions for discussion.
      </p>
      {current && (
        <nav aria-label="Labs" className="chips" style={{ margin: "8px 0 24px" }}>
          {LABS.map((l) => (
            <a key={l.n} className="chip" href={`#lab-${l.n}`} aria-current={current.n === l.n ? "page" : undefined} style={{ textDecoration: "none" }}>
              Lab {l.n}. {l.title}
            </a>
          ))}
        </nav>
      )}
      <nav aria-label="Labs" hidden={!!current}>
        <ul className="index">
          {LABS.map((l) => (
            <li key={l.n}>
              <a href={`#lab-${l.n}`} aria-current={current?.n === l.n ? "page" : undefined}>
                <span className="index-title" style={current?.n === l.n ? { textDecoration: "underline", textDecorationColor: "var(--model)" } : undefined}>
                  Lab {l.n}. {l.title}
                </span>
                <span className="index-desc">{l.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {current?.n === "1" && <Lab1 />}
      {current?.n === "2" && <Lab2 />}
      {current?.n === "3" && <Lab3 />}
      {current?.n === "4" && <Lab4 />}
      {current?.n === "5" && <Lab5 />}
    </>
  );
}
