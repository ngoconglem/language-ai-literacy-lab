import { useMemo, useState } from "react";
import { useData, useResources, type Essay, type LiteraryData } from "../lib/data";
import { burrowsDelta, deltaToText, freq, tokens } from "../lib/text";
import { BarList, Heatmap } from "../components/charts";
import { Guide, Term } from "../components/Guide";
import { LabFrame } from "../components/LabFrame";

const LEARNER = "#008f86";
const MODEL = "#b07d12";
const FINGERPRINT_WORDS = ["i", "you", "the", "and", "because", "can", "however", "this"];

/** Which writer an essay belongs to. Model essays carry a model_label once the multi-model corpus is loaded. */
function writerOf(e: Essay & { model_label?: string }): string {
  if (e.source === "human") return "Learner";
  return e.model_label ? `AI: ${e.model_label}` : "AI model";
}

const colorOf = (w: string) => (w === "Learner" ? LEARNER : MODEL);

function cleanTokens(text: string) {
  return tokens(text).filter((w) => !w.startsWith("generic"));
}

/** Nearest-centroid Burrows' Delta over essays, leaving each essay out of its own writer's centroid. */
function essayDelta(essays: Essay[], nMfw: number) {
  const toks = essays.map((e) => cleanTokens(e.text));
  const all = freq(toks.flat());
  const vocab = [...all.entries()].sort((a, b) => b[1] - a[1]).slice(0, nMfw).map(([w]) => w);
  const rel = toks.map((t) => {
    const f = freq(t);
    return vocab.map((w) => (1000 * (f.get(w) ?? 0)) / Math.max(1, t.length));
  });
  const means = vocab.map((_, k) => rel.reduce((s, r) => s + r[k], 0) / rel.length);
  const sds = vocab.map((_, k) => Math.sqrt(rel.reduce((s, r) => s + (r[k] - means[k]) ** 2, 0) / rel.length) || 1e-9);
  const z = rel.map((r) => r.map((x, k) => (x - means[k]) / sds[k]));
  const writers = [...new Set(essays.map(writerOf))].sort((a, b) => (a === "Learner" ? -1 : b === "Learner" ? 1 : a.localeCompare(b)));
  const sums = new Map(writers.map((w) => [w, vocab.map(() => 0)]));
  const counts = new Map(writers.map((w) => [w, 0]));
  essays.forEach((e, i) => {
    const w = writerOf(e);
    counts.set(w, counts.get(w)! + 1);
    z[i].forEach((v, k) => (sums.get(w)![k] += v));
  });
  const guess = essays.map((e, i) => {
    const own = writerOf(e);
    const scores = writers.map((w) => {
      const n = counts.get(w)! - (w === own ? 1 : 0);
      const c = sums.get(w)!.map((s, k) => (s - (w === own ? z[i][k] : 0)) / Math.max(1, n));
      return { writer: w, delta: c.reduce((s, ck, k) => s + Math.abs(z[i][k] - ck), 0) / vocab.length };
    });
    scores.sort((a, b) => a.delta - b.delta);
    return scores;
  });
  return { vocab, rel, writers, guess };
}

function excerpt(text: string, words = 140) {
  const parts = text.trim().split(/\s+/);
  return parts.length <= words ? text.trim() : parts.slice(0, words).join(" ") + " …";
}

function rate(text: string, w: string) {
  const t = cleanTokens(text);
  return (1000 * t.filter((x) => x === w).length) / Math.max(1, t.length);
}

function shuffle<T>(xs: T[], seed: number) {
  const a = [...xs];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Lab3() {
  const res = useResources();
  const essays = res.data?.essays.essays ?? [];
  const [nMfw, setNMfw] = useState(50);
  const [seed, setSeed] = useState(7);
  const [round, setRound] = useState(0);
  const [guesses, setGuesses] = useState<Record<number, string>>({});

  const model = useMemo(() => (essays.length ? essayDelta(essays, nMfw) : null), [essays, nMfw]);
  const order = useMemo(() => shuffle(essays.map((_, i) => i), seed).slice(0, 5), [essays, seed]);

  const fingerprint = useMemo(() => {
    if (!essays.length) return null;
    const groupRate = (pred: (e: Essay) => boolean, w: string) => {
      const t = essays.filter(pred).flatMap((e) => cleanTokens(e.text));
      return (1000 * t.filter((x) => x === w).length) / Math.max(1, t.length);
    };
    const m = essays[(seed * 37) % essays.length];
    const rows = FINGERPRINT_WORDS.map((w) => {
      const a = groupRate((e) => e.source === "human" && e.id !== m.id, w);
      const b = groupRate((e) => e.source === "llm" && e.id !== m.id, w);
      const x = rate(m.text, w);
      return { w, a, b, x, closer: Math.abs(x - a) <= Math.abs(x - b) ? "Learner" : "AI model" };
    });
    return { m, rows };
  }, [essays, seed]);

  const accuracy = useMemo(() => {
    if (!model) return null;
    const byWriter = new Map<string, { n: number; ok: number }>();
    essays.forEach((e, i) => {
      const w = writerOf(e);
      const r = byWriter.get(w) ?? { n: 0, ok: 0 };
      r.n++;
      if (model.guess[i][0].writer === w) r.ok++;
      byWriter.set(w, r);
    });
    const total = [...byWriter.values()].reduce((s, r) => ({ n: s.n + r.n, ok: s.ok + r.ok }), { n: 0, ok: 0 });
    return { byWriter, total };
  }, [model, essays]);

  const current = order[round];
  const yourScore = order.filter((i, k) => guesses[k] && guesses[k] === writerOf(essays[i])).length;
  const compScore = model ? order.filter((i, k) => guesses[k] && model.guess[i][0].writer === writerOf(essays[i])).length : 0;
  const answered = Object.keys(guesses).length;

  return (
    <LabFrame
      title="Lab 3. Who wrote this? Style fingerprints"
      goal="Every writer uses small, everyday words such as I, the, and and because at their own rates. Counting those rates can suggest who wrote a text, here a language learner or an AI model, and shows where such guesses go wrong."
      notebook="lab3_burrows_delta.ipynb"
      notebookLabel="Reproduce the novels extension in Python"
      time="25 minutes"
      ideas={
        <>
          <ul>
            <li>
              <Term id="stylometry">Stylometry</Term> means measuring writing style with numbers.
            </li>
            <li>
              It relies on <Term id="mfw">the most frequent words</Term>: small words like <em>the</em>, <em>and</em> and <em>I</em>. Writers use
              them without thinking, so their rates work like a fingerprint.
            </li>
            <li>
              <Term id="delta">Burrows' Delta</Term> turns those rates into one number: how different two texts are. Lower means more similar.
            </li>
          </ul>
          <p>
            You will use 84 short essays on the same two topics: 60 by English language learners (ELLIPSE corpus) and 24 by an AI model. No
            reading of long texts is needed; each essay is shown as a short excerpt.
          </p>
        </>
      }
      steps={[
        <>Warm-up: compare the word rates of learners, the AI model and one mystery essay. Who does the mystery essay look like?</>,
        <>Play five rounds of “Who wrote it?”. Guess first, then see what the computer guessed.</>,
        <>Move the slider to give the computer more or fewer words to look at. Does it get better?</>,
        <>Optional: try the same method on nineteenth-century novels, where it was first developed.</>,
      ]}
      reflect={[
        "Which small words gave the AI essays away? Why might a model use them differently from a learner?",
        "The computer is right most of the time but not always. Would that be good enough to accuse a student of using AI? Why not?",
        "The AI essays here come from one model on two topics. What might change with other models, topics or longer texts?",
      ]}
    >
      {res.error && <p className="error">{res.error}</p>}
      {fingerprint && (
        <section>
          <h3>Warm-up: one mystery essay</h3>
          <div className="controls">
            <button className="chip" onClick={() => setSeed((s) => s + 1)}>
              Another mystery essay
            </button>
          </div>
          <blockquote className="essay-excerpt">{excerpt(fingerprint.m.text, 90)}</blockquote>
          <Guide title="How to read the table">
            <p>
              Each row is one everyday word. The numbers are how often it appears per 1,000 words: in all the learner essays, in all the AI
              essays, and in the mystery essay. The last column says which group the mystery essay is closer to on that word. Count the
              rows: which writer wins?
            </p>
          </Guide>
          <div className="table-wrap">
            <table className="fingerprint" style={{ maxWidth: 640 }}>
              <thead>
                <tr>
                  <th>Word</th>
                  <th className="num">Learners</th>
                  <th className="num">AI model</th>
                  <th className="num">Mystery essay</th>
                  <th>Closer to</th>
                </tr>
              </thead>
              <tbody>
                {fingerprint.rows.map((r) => (
                  <tr key={r.w}>
                    <td>
                      <strong>{r.w === "i" ? "I" : r.w}</strong>
                    </td>
                    <td className="num">{r.a.toFixed(1)}</td>
                    <td className="num">{r.b.toFixed(1)}</td>
                    <td className="num">{r.x.toFixed(1)}</td>
                    <td>
                      <span className="swatch" style={{ background: r.closer === "Learner" ? LEARNER : MODEL }} /> {r.closer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="reveal">
            <summary>Reveal who wrote it</summary>
            <p>
              {fingerprint.m.source === "human"
                ? `A learner (grade ${fingerprint.m.grade}, proficiency ${fingerprint.m.proficiency?.toFixed(1)} of 5).`
                : "The AI model."}{" "}
              The table's majority says{" "}
              {fingerprint.rows.filter((r) => r.closer === "Learner").length >= fingerprint.rows.length / 2 ? "learner" : "AI model"}.
              Eight words is a small fingerprint; the computer below uses many more.
            </p>
          </details>
        </section>
      )}

      {model && current !== undefined && (
        <section>
          <h3>Who wrote it? Five rounds</h3>
          <p className="small muted">
            Round {Math.min(round + 1, 5)} of 5. Read the excerpt and choose a writer. The computer guesses from the {nMfw} most frequent words,
            without seeing the answer.
          </p>
          <blockquote className="essay-excerpt">{excerpt(essays[current].text)}</blockquote>
          <div className="controls">
            {model.writers.map((w) => (
              <button
                key={w}
                className="chip" aria-pressed={guesses[round] === w}
                disabled={!!guesses[round]}
                onClick={() => setGuesses((g) => ({ ...g, [round]: w }))}
              >
                {w}
              </button>
            ))}
          </div>
          {guesses[round] && (
            <div className="verdict">
              <p>
                <strong>{guesses[round] === writerOf(essays[current]) ? "You were right." : "Not this time."}</strong> It was written by{" "}
                <strong>{writerOf(essays[current]) === "Learner" ? `a learner (proficiency ${essays[current].proficiency?.toFixed(1)} of 5)` : "the AI model"}</strong>.
                The computer guessed <strong>{model.guess[current][0].writer}</strong> (Delta {model.guess[current][0].delta.toFixed(2)} vs{" "}
                {model.guess[current][1].delta.toFixed(2)} for {model.guess[current][1].writer}; lower is closer)
                {model.guess[current][0].writer === writerOf(essays[current]) ? ", which is correct." : ", which is wrong."}
              </p>
              {round < 4 ? (
                <button className="chip" onClick={() => setRound((r) => r + 1)}>
                  Next essay
                </button>
              ) : (
                <p>
                  Final score: you {yourScore} of 5, the computer {compScore} of 5.{" "}
                  <button
                    className="chip"
                    onClick={() => {
                      setSeed((s) => s + 11);
                      setRound(0);
                      setGuesses({});
                    }}
                  >
                    Play again with new essays
                  </button>
                </p>
              )}
            </div>
          )}
          {answered > 0 && answered < 5 && (
            <p className="small muted">
              So far: you {yourScore} of {answered}, the computer {compScore} of {answered}.
            </p>
          )}
        </section>
      )}

      {model && accuracy && (
        <section>
          <h3>How many words should the computer look at?</h3>
          <div className="controls">
            <label className="field" style={{ minWidth: 280 }}>
              Most frequent words used: {nMfw}
              <input type="range" min={5} max={200} step={5} value={nMfw} onChange={(e) => setNMfw(Number(e.target.value))} />
            </label>
            <div className="metric">
              <div className="value" style={{ fontSize: "2.2rem" }}>
                {Math.round((100 * accuracy.total.ok) / accuracy.total.n)}%
              </div>
              <div className="label">
                of all {accuracy.total.n} essays attributed to the right writer
              </div>
            </div>
          </div>
          <Guide title="What the computer does">
            <p>
              For every essay, it compares the rates of the {nMfw} most common words with the average rates of each writer's other essays,
              and picks the writer with the lowest Delta. The essay itself is left out of its writer's average, so the computer never sees the
              answer. The bars show how often it is right for each writer.
            </p>
          </Guide>
          <BarList
            rows={[...accuracy.byWriter.entries()].map(([w, r]) => ({
              label: `${w} (${r.n} essays)`,
              value: (100 * r.ok) / r.n,
              color: colorOf(w),
            }))}
            max={100}
            suffix="%"
          />
          <p className="small muted">
            Words currently used: {model.vocab.slice(0, Math.min(nMfw, 30)).map((w) => (w === "i" ? "I" : w)).join(", ")}
            {nMfw > 30 ? ", …" : ""}. Some are topic words (school, online, technology) because every essay answers one of the same two
            prompts; with more varied topics, the list would hold mostly small grammatical words.
          </p>
        </section>
      )}

      <details className="extension">
        <summary>
          <strong>Going further: nineteenth-century novels</strong> (computational literary studies, about 20 minutes)
        </summary>
        <NovelsExtension />
      </details>
    </LabFrame>
  );
}

function NovelsExtension() {
  const { data, error } = useData<LiteraryData>("literary.json");
  const [nMfw, setNMfw] = useState(100);
  const [target, setTarget] = useState(0);
  const [own, setOwn] = useState("");

  const res = useMemo(() => {
    if (!data) return null;
    const model = burrowsDelta(data.chunks, nMfw);
    let correct = 0;
    data.chunks.forEach((c, i) => {
      let best = -1;
      model.delta[i].forEach((d, j) => {
        if (j !== i && (best < 0 || d < model.delta[i][best])) best = j;
      });
      if (data.chunks[best].author === c.author) correct++;
    });
    return { model, correct };
  }, [data, nMfw]);

  const ranking = useMemo(() => {
    if (!data || !res) return [];
    return res.model.delta[target]
      .map((d, j) => ({ j, d }))
      .filter((x) => x.j !== target)
      .sort((a, b) => a.d - b.d)
      .slice(0, 6);
  }, [data, res, target]);

  const ownRank = useMemo(() => {
    if (!data || !res || own.trim().split(/\s+/).length < 300) return null;
    const ds = deltaToText(own, data.vocab, nMfw, res.model);
    const byAuthor = new Map<string, number[]>();
    data.chunks.forEach((c, i) => byAuthor.set(c.author, [...(byAuthor.get(c.author) ?? []), ds[i]]));
    return [...byAuthor.entries()]
      .map(([a, xs]) => ({ author: a, d: xs.reduce((s, x) => s + x, 0) / xs.length }))
      .sort((a, b) => a.d - b.d);
  }, [data, res, own, nMfw]);

  if (error) return <p className="error">{error}</p>;
  if (!data || !res) return <p className="small muted">Loading the novels…</p>;
  return (
    <div>
      <p>
        Burrows (2002) designed Delta to attribute literary texts. Here the same method compares 5,000-word passages from nine novels by five
        nineteenth-century authors (Project Gutenberg). You don't need to read the novels: the computer counts the words for you.
      </p>
      <div className="controls">
        <label className="field" style={{ minWidth: 280 }}>
          Most frequent words used: {nMfw}
          <input type="range" min={10} max={300} step={10} value={nMfw} onChange={(e) => setNMfw(Number(e.target.value))} />
        </label>
        <div className="metric">
          <div className="value" style={{ fontSize: "2.2rem" }}>
            {res.correct} of {data.chunks.length}
          </div>
          <div className="label">passages whose closest passage is by the same author</div>
        </div>
      </div>
      <Guide title="How to read the grid">
        <p>
          Every passage has one row and one column, grouped by author. <strong>Darker squares mean more similar style.</strong> If style tracks
          authorship, you will see one dark block per author along the diagonal. Click a square to choose a passage for the table below.
        </p>
      </Guide>
      <Heatmap
        labels={data.chunks.map((c) => c.id)}
        groups={data.chunks.map((c) => c.author)}
        matrix={res.model.delta}
        highlight={target}
        onPick={setTarget}
      />
      <label className="field" style={{ maxWidth: 420 }}>
        Passage
        <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
          {data.chunks.map((c, i) => (
            <option key={c.id} value={i}>
              {c.id}
            </option>
          ))}
        </select>
      </label>
      <table style={{ maxWidth: 620, marginTop: 12 }}>
        <thead>
          <tr>
            <th>Closest passages</th>
            <th className="num">Delta</th>
            <th>Same author?</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r) => (
            <tr key={r.j}>
              <td>{data.chunks[r.j].id}</td>
              <td className="num">{r.d.toFixed(3)}</td>
              <td>{data.chunks[r.j].author === data.chunks[target].author ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Test a text of your own</h4>
      <textarea value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Paste at least 300 words." aria-label="Text to attribute" />
      {own.trim() && !ownRank && <p className="small muted">At least 300 words are needed; Delta is unreliable on short texts.</p>}
      {ownRank && <BarList rows={ownRank.map((r) => ({ label: r.author, value: r.d, color: "#178c84" }))} digits={3} />}
    </div>
  );
}
