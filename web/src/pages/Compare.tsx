import { useMemo, useState } from "react";
import { useResources, FEATURES } from "../lib/data";
import { GROUPS, GROUP_BY_KEY, PROMPT_FILTERS, essayDetail, select } from "../lib/groups";
import { keyness, profile, tokens, type Profile } from "../lib/text";
import { StripPlot } from "../components/charts";
import { Concordance } from "../components/Concordance";
import { Highlight } from "../components/Highlight";
import { CorpusInput, type UserCorpus } from "../components/CorpusInput";
import { Guide, Term } from "../components/Guide";

const TERM_FOR: Record<string, string> = {
  meanWordLength: "word-length",
  mattr: "mattr",
  offListPct: "off-list",
  meanSentenceLength: "sentence-length",
  sentenceLengthCV: "cv",
  hedges: "hedge",
  boosters: "booster",
  connectives: "connective",
  selfMention: "self-mention",
};

function describe(a: number[], b: number[]) {
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  const ma = mean(a);
  const mb = mean(b);
  const v = (xs: number[], m: number) => xs.reduce((s, x) => s + (x - m) ** 2, 0);
  const pooled = a.length + b.length > 2 ? Math.sqrt((v(a, ma) + v(b, mb)) / (a.length + b.length - 2)) : 0;
  const d = pooled > 0 ? Math.abs(ma - mb) / pooled : 0;
  // Size labels: Cohen (1988) for small/medium/large; Sawilowsky (2009) for very large/huge.
  const overlap =
    a.length < 2 || b.length < 2
      ? null
      : d < 0.2
        ? "negligible difference: the groups overlap almost completely"
        : d < 0.5
          ? "small difference: the groups overlap heavily"
          : d < 0.8
            ? "medium difference: the groups still overlap a lot"
            : d < 1.2
              ? "large difference, though the groups still overlap"
              : d < 2
                ? "very large difference: the groups overlap only partly"
                : "huge difference: the groups overlap little";
  return { ma, mb, d, overlap };
}

const A_COLOR = "#008f86";
const B_COLOR = "#b07d12";
const YOU_COLOR = "#1c2b3a";

interface Doc {
  id: string;
  text: string;
  detail: string;
}

type Mode = "builtin" | "own";

function csvCell(v: string | number) {
  const s = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Compare({ initialMode = "builtin" }: { initialMode?: Mode }) {
  const { data, error } = useResources();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [a, setA] = useState("learners");
  const [b, setB] = useState("model");
  const [prompt, setPrompt] = useState("both");
  const [ownA, setOwnA] = useState<UserCorpus>({ name: "", docs: [] });
  const [ownB, setOwnB] = useState<UserCorpus>({ name: "", docs: [] });
  const [own, setOwn] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [node, setNode] = useState("");
  const [copied, setCopied] = useState(false);

  const sets = useMemo(() => {
    if (!data) return null;
    if (mode === "own") {
      // Prefix ids with the set letter so a file name used in both sets stays distinct.
      const toDocs = (c: UserCorpus, fallback: string, tag: string): Doc[] =>
        c.docs.map((d) => ({ id: `${tag}: ${d.id}`, text: d.text, detail: c.name || fallback }));
      return {
        A: toDocs(ownA, "Set A", "A"),
        B: toDocs(ownB, "Set B", "B"),
        labelA: ownA.name || "Set A",
        labelB: ownB.name || "Set B",
      };
    }
    const toDocs = (key: string): Doc[] => select(data.essays.essays, key, prompt).map((e) => ({ id: e.id, text: e.text, detail: essayDetail(e) }));
    return { A: toDocs(a), B: toDocs(b), labelA: GROUP_BY_KEY[a].label, labelB: GROUP_BY_KEY[b].label };
  }, [data, mode, a, b, prompt, ownA, ownB]);

  const profiles = useMemo(() => {
    const m = new Map<string, Profile>();
    if (!data || !sets) return m;
    for (const d of [...sets.A, ...sets.B]) {
      m.set(d.id, data.profiles.get(d.id) ?? profile(d.text, data.wordlist, data.markers));
    }
    return m;
  }, [data, sets]);

  const ownProfile = useMemo(() => (data && own.trim().split(/\s+/).length >= 30 ? profile(own, data.wordlist, data.markers) : null), [own, data]);

  const keys = useMemo(() => {
    if (!sets) return null;
    const tA = sets.A.flatMap((e) => tokens(e.text));
    const tB = sets.B.flatMap((e) => tokens(e.text));
    const rows = tA.length && tB.length ? keyness(tA, tB, 5).filter((r) => r.ll >= 6.63) : [];
    return {
      nA: tA.length,
      nB: tB.length,
      forA: rows.filter((r) => r.logRatio > 0).slice(0, 15),
      forB: rows.filter((r) => r.logRatio < 0).slice(0, 15),
    };
  }, [sets]);

  if (error) return <p className="error">{error}</p>;
  if (!data || !sets || !keys) return <p className="muted">Loading the essays…</p>;

  const { labelA, labelB } = sets;
  const pickedDoc = picked ? [...sets.A, ...sets.B].find((d) => d.id === picked) : undefined;
  const ready = sets.A.length >= 1 && sets.B.length >= 1;

  const csv = () => {
    const head = ["set", "text_id", "words", ...FEATURES.map((f) => f.key)];
    const rows = [
      ...sets.A.map((d) => [labelA, d.id, profiles.get(d.id)!.tokens, ...FEATURES.map((f) => profiles.get(d.id)![f.key])]),
      ...sets.B.map((d) => [labelB, d.id, profiles.get(d.id)!.tokens, ...FEATURES.map((f) => profiles.get(d.id)![f.key])]),
    ];
    return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([csv()], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "language-ai-literacy-lab-measures.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <h1>Compare two sets of texts</h1>
      <p className="lede">
        Each dot is one text. The ink tick marks the group average. Every measure is simple enough to check by hand. That transparency is the
        point: you can see exactly why two texts differ, and decide whether the difference means anything.
      </p>

      <Guide title="How to use this page">
        <ol>
          <li>
            <strong>Choose two groups of texts.</strong> Start with the built-in essays (learners against the AI model), or load two sets of
            your own.
          </li>
          <li>
            <strong>Scan the nine measures.</strong> Each row measures one feature of style, such as word length or how often writers hedge.
            The plain-language sentence under each heading tells you which group scores higher and how much the groups overlap.
          </li>
          <li>
            <strong>Read the texts behind the dots.</strong> Select any dot, especially one far from its group, to read that text with its
            connectives highlighted.
          </li>
          <li>
            <strong>Check the words.</strong> Further down, the key-word tables list the words that most distinguish each group. Select a
            word to see every line it appears in.
          </li>
        </ol>
        <p>
          A difference on this page describes these texts, not all learners or all AI writing. Ask what else differs between the groups:
          the task, the topic, the writers' age, the instructions given to the model.
        </p>
      </Guide>

      <div className="chips" role="group" aria-label="Which texts to compare" style={{ marginTop: 8 }}>
        <button className="chip" aria-pressed={mode === "builtin"} onClick={() => setMode("builtin")}>
          Use the built-in essays
        </button>
        <button className="chip" aria-pressed={mode === "own"} onClick={() => setMode("own")}>
          Compare your own texts
        </button>
      </div>

      {mode === "builtin" ? (
        <div className="panel">
          <div className="controls" style={{ margin: 0 }}>
            <label className="field">
              First group
              <select value={a} onChange={(e) => setA(e.target.value)}>
                {GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Second group
              <select value={b} onChange={(e) => setB(e.target.value)}>
                {GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Prompt
              <select value={prompt} onChange={(e) => setPrompt(e.target.value)}>
                {PROMPT_FILTERS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            {sets.A.length} essays ({keys.nA.toLocaleString()} words) against {sets.B.length} essays ({keys.nB.toLocaleString()} words).
            {a === b && " Both groups are the same, so pick two different groups to see a contrast."}
          </p>
        </div>
      ) : (
        <div className="panel">
          <p style={{ maxWidth: "var(--measure)" }}>
            Load two sets of texts, for example your students' essays and AI responses to the same task, or two authors, or drafts before and
            after feedback. <strong>Everything stays in your browser:</strong> files are read on this page and never uploaded.
          </p>
          <div className="two-col">
            <CorpusInput side="Set A" color={A_COLOR} value={ownA} onChange={setOwnA} />
            <CorpusInput side="Set B" color={B_COLOR} value={ownB} onChange={setOwnB} />
          </div>
          <Guide title="Preparing your texts">
            <ul>
              <li>
                <strong>Files:</strong> plain text files (.txt), one text per file, or a spreadsheet saved as .csv with one text per row and a
                column called “text”. You can select many files at once.
              </li>
              <li>
                <strong>Pasting:</strong> paste several texts into the box, with a line containing only <code>---</code> between them.
              </li>
              <li>
                <strong>Names:</strong> give each set a short name (for example “Week 2 drafts” and “ChatGPT”); it labels the charts.
              </li>
              <li>
                <strong>Saving results:</strong> “Download measures (CSV)” saves every number on the page for each text, for use in Excel, R
                or SPSS.
              </li>
            </ul>
          </Guide>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Tips: texts under 100 words give unstable values; at least ten texts per set make the averages worth comparing. Remove names and
            other identifying details from student work before you use it.
          </p>
        </div>
      )}

      {!ready ? (
        <p className="muted">Add at least one text to each set to see the comparison.</p>
      ) : (
        <>
          <div className="legend" style={{ justifyContent: "space-between" }}>
            <div className="legend">
              <span>
                <span className="swatch" style={{ background: A_COLOR }} /> {labelA}
              </span>
              <span>
                <span className="swatch" style={{ background: B_COLOR }} /> {labelB}
              </span>
              {ownProfile && (
                <span>
                  <span className="swatch" style={{ background: YOU_COLOR }} /> Your text
                </span>
              )}
              <span className="muted">Select a dot to read that text.</span>
            </div>
            <div className="chips">
              <button className="chip" onClick={download}>
                Download measures (CSV)
              </button>
              <button className="chip" onClick={copy}>
                {copied ? "Copied" : "Copy as CSV"}
              </button>
            </div>
          </div>

          <Guide title="How to read the dot charts">
            <ul>
              <li>
                Each row is a <Term id="strip-plot">strip plot</Term>: one dot per text, placed along the line by its value. Further right
                means a higher value.
              </li>
              <li>
                The short dark tick across each group is the <Term id="group-average">group average</Term>. Hover over or select a dot to see
                which text it is.
              </li>
              <li>
                Look at the <strong>spread</strong>, not just the averages. If the two clouds of dots overlap, many texts in one group look like
                texts in the other, even when the averages differ. That is why a single measure cannot tell you who wrote a text.
              </li>
              <li>
                Dots far from the rest are <Term id="outlier">outliers</Term>. Read them: they often reveal a quirk of the measure (a missing
                full stop, a switch into another language) rather than a quirk of the writer.
              </li>
              <li>Open “Read with caution” under each measure for its known weaknesses.</li>
            </ul>
          </Guide>

          <section aria-label="Style measures">
            {FEATURES.map((f) => {
              const groups = [
                { label: labelA, color: A_COLOR, points: sets.A.map((d) => ({ id: d.id, v: profiles.get(d.id)![f.key], detail: d.detail })) },
                { label: labelB, color: B_COLOR, points: sets.B.map((d) => ({ id: d.id, v: profiles.get(d.id)![f.key], detail: d.detail })) },
              ];
              if (ownProfile) groups.push({ label: "Your text", color: YOU_COLOR, points: [{ id: "Your text", v: ownProfile[f.key], detail: "" }] });
              const dsc = describe(
                groups[0].points.map((p) => p.v),
                groups[1].points.map((p) => p.v),
              );
              const same = Math.abs(dsc.ma - dsc.mb) < Math.pow(10, -f.digits) / 2;
              const higher = dsc.ma > dsc.mb ? labelA : labelB;
              return (
                <div className="feature-row" key={f.key}>
                  <div>
                    <h3>
                      <Term id={TERM_FOR[f.key]}>{f.label}</Term>
                    </h3>
                    <p>{f.what}</p>
                    <p>
                      Average: <strong style={{ color: "var(--ink)" }}>{dsc.ma.toFixed(f.digits)}</strong> vs{" "}
                      <strong style={{ color: "var(--ink)" }}>{dsc.mb.toFixed(f.digits)}</strong> {f.unit}
                    </p>
                    <p className="verdict">
                      {same ? (
                        <>The two groups have the same average.</>
                      ) : (
                        <>
                          Higher on average: <strong>{higher}</strong>.
                        </>
                      )}
                      {dsc.overlap && (
                        <>
                          {" "}
                          <Term id="effect-size">Effect size</Term> d = {dsc.d.toFixed(2)}, a {dsc.overlap}.
                        </>
                      )}
                    </p>
                    <details>
                      <summary>Read with caution</summary>
                      <p style={{ marginTop: 6 }}>{f.caution}</p>
                    </details>
                  </div>
                  <StripPlot groups={groups} digits={f.digits} unit={f.unit} onPick={(id) => id !== "Your text" && setPicked(id)} />
                </div>
              );
            })}
          </section>

          {pickedDoc && (
            <section className="panel" aria-live="polite">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ marginTop: 0 }}>{pickedDoc.id}</h3>
                <button className="quiet" onClick={() => setPicked(null)}>
                  Close text
                </button>
              </div>
              <p className="small muted">{pickedDoc.detail}. Connectives are highlighted.</p>
              <div className="prose" style={{ whiteSpace: "pre-wrap" }}>
                <Highlight text={pickedDoc.text} markers={data.markers.connectives} />
              </div>
            </section>
          )}

          <h2>Words that set the groups apart</h2>
          <div className="prose">
            <p>
              <Term id="keyness">Keyness</Term> compares how often each word appears in one group relative to the other.{" "}
              <Term id="log-likelihood">Log-likelihood</Term> says whether the difference is bigger than chance (only words above 6.63,{" "}
              <Term id="p-value">p &lt; .01</Term>, are listed). <Term id="log-ratio">Log ratio</Term> says how big it is: +1 means twice as
              frequent in the first group, −1 twice as frequent in the second. Select a word to see it in context.
            </p>
          </div>
          {(() => {
            const ex = keys.forA[0] ?? keys.forB[0];
            if (!ex) return null;
            const inA = ex.logRatio > 0;
            const times = Math.pow(2, Math.abs(ex.logRatio));
            return (
              <Guide title="Reading one row: a worked example">
                <p>
                  Take “<strong>{ex.word}</strong>”. The Count column shows it appears <strong>{ex.f1}</strong> times in {labelA} and{" "}
                  <strong>{ex.f2}</strong> times in {labelB}. Raw counts can mislead when one group has more words, so the log ratio compares
                  them per word: {inA ? "+" : "−"}
                  {Math.abs(ex.logRatio).toFixed(2)} means “{ex.word}” is about{" "}
                  <strong>{times >= 10 ? Math.round(times) : times.toFixed(1)} times</strong> as frequent in {inA ? labelA : labelB}. Its
                  log-likelihood of {ex.ll.toFixed(1)} is well above 6.63, so a difference this large is very unlikely to be chance.
                </p>
                <p>
                  Then ask <em>why</em>. Sort the key words into rough kinds: topic words (the essay question), function words, misspellings,
                  and words of stance or evaluation. Select “{ex.word}” to read it in context before deciding what it shows.
                </p>
              </Guide>
            );
          })()}
          <div className="two-col">
            {(
              [
                ["forA", labelA, A_COLOR],
                ["forB", labelB, B_COLOR],
              ] as const
            ).map(([k, label, color]) => (
              <div key={k} className="table-wrap">
                <h3 style={{ fontFamily: "var(--sans)", fontSize: "1rem", fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="swatch" style={{ background: color }} /> More typical of {label}
                </h3>
                {keys[k].length === 0 ? (
                  <p className="muted">No words pass the threshold. The groups may be too small or too similar.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Word</th>
                        <th className="num">Count (first / second)</th>
                        <th className="num">Log-likelihood</th>
                        <th className="num">Log ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys[k].map((r) => (
                        <tr key={r.word}>
                          <td>
                            <button className="sentence-btn" aria-pressed={node === r.word} onClick={() => setNode(r.word)}>
                              {r.word}
                            </button>
                          </td>
                          <td className="num">
                            {r.f1} / {r.f2}
                          </td>
                          <td className="num">{r.ll.toFixed(1)}</td>
                          <td className="num">
                            {r.logRatio > 0 ? "+" : ""}
                            {r.logRatio.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
          {node && (
            <section style={{ marginTop: 24 }}>
              <h3>“{node}” in context</h3>
              <Guide title="How to read a concordance">
                <p>
                  This is a <Term id="concordance">concordance</Term>: every line containing “{node}”, lined up so the word sits in the middle
                  column. Read down the words just before and just after it. Repeated patterns (the same verb before it, the same kind of word
                  after it) show how each group typically uses the word, which a count alone cannot.
                </p>
              </Guide>
              <div className="two-col">
                {(
                  [
                    [sets.A, labelA, A_COLOR],
                    [sets.B, labelB, B_COLOR],
                  ] as const
                ).map(([docs, label, color]) => (
                  <div key={label + color}>
                    <p className="small" style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                      <span className="swatch" style={{ background: color }} /> {label}
                    </p>
                    <Concordance docs={docs} node={node} showDoc={false} limit={60} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <h2>Add a single text</h2>
      <div className="prose">
        <p>
          Want to see where a single piece of writing falls? Paste at least 30 words (a student paragraph, your own writing, or an AI
          response). Your text appears as a dark navy dot on every chart above. Nothing leaves your browser: all analysis runs on
          this page.
        </p>
        <textarea value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Paste a paragraph or an essay here." aria-label="Your text" />
        {own.trim() && !ownProfile && <p className="small muted">Keep going: at least 30 words are needed for stable measures.</p>}
        {ownProfile && (
          <p className="small muted">
            {ownProfile.tokens} words, {ownProfile.sentences} sentences. Scroll up to see where your text falls.
          </p>
        )}
      </div>
    </>
  );
}
