import { useMemo, useState } from "react";
import { useResources, FEATURES } from "../lib/data";
import { GROUPS, GROUP_BY_KEY, PROMPT_FILTERS, essayDetail, select } from "../lib/groups";
import { keyness, profile, tokens, type Profile } from "../lib/text";
import { StripPlot } from "../components/charts";
import { Concordance } from "../components/Concordance";
import { Highlight } from "../components/Highlight";
import { CorpusInput, type UserCorpus } from "../components/CorpusInput";

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

          <section aria-label="Style measures">
            {FEATURES.map((f) => {
              const groups = [
                { label: labelA, color: A_COLOR, points: sets.A.map((d) => ({ id: d.id, v: profiles.get(d.id)![f.key], detail: d.detail })) },
                { label: labelB, color: B_COLOR, points: sets.B.map((d) => ({ id: d.id, v: profiles.get(d.id)![f.key], detail: d.detail })) },
              ];
              if (ownProfile) groups.push({ label: "Your text", color: YOU_COLOR, points: [{ id: "Your text", v: ownProfile[f.key], detail: "" }] });
              const mean = (pts: { v: number }[]) => pts.reduce((s, p) => s + p.v, 0) / Math.max(1, pts.length);
              return (
                <div className="feature-row" key={f.key}>
                  <div>
                    <h3>{f.label}</h3>
                    <p>{f.what}</p>
                    <p>
                      Average: <strong style={{ color: "var(--ink)" }}>{mean(groups[0].points).toFixed(f.digits)}</strong> vs{" "}
                      <strong style={{ color: "var(--ink)" }}>{mean(groups[1].points).toFixed(f.digits)}</strong> {f.unit}
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
              Keyness compares how often each word appears in one group relative to the other. Log-likelihood says whether the difference is
              bigger than chance (only words above 6.63, p &lt; .01, are listed). Log ratio says how big it is: +1 means twice as frequent in
              the first group, −1 twice as frequent in the second. Select a word to see it in context.
            </p>
          </div>
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
                        <th className="num">Count</th>
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
          Paste at least 30 words. Your text appears as an ink dot on every measure above. Nothing leaves your browser: all analysis runs on
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
