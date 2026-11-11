import { useMemo, useState } from "react";
import { useResources, FEATURES, type Essay } from "../lib/data";
import { GROUPS, GROUP_BY_KEY, PROMPT_FILTERS, essayDetail, select } from "../lib/groups";
import { keyness, profile, tokens } from "../lib/text";
import { StripPlot } from "../components/charts";
import { Concordance } from "../components/Concordance";
import { Highlight } from "../components/Highlight";

const A_COLOR = "#008f86";
const B_COLOR = "#b07d12";
const YOU_COLOR = "#1c2b3a";

export default function Compare() {
  const { data, error } = useResources();
  const [a, setA] = useState("learners");
  const [b, setB] = useState("model");
  const [prompt, setPrompt] = useState("both");
  const [own, setOwn] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [node, setNode] = useState("");

  const sets = useMemo(() => {
    if (!data) return null;
    return { A: select(data.essays.essays, a, prompt), B: select(data.essays.essays, b, prompt) };
  }, [data, a, b, prompt]);

  const ownProfile = useMemo(() => (data && own.trim().split(/\s+/).length >= 30 ? profile(own, data.wordlist, data.markers) : null), [own, data]);

  const keys = useMemo(() => {
    if (!sets) return null;
    const tA = sets.A.flatMap((e) => tokens(e.text));
    const tB = sets.B.flatMap((e) => tokens(e.text));
    const rows = keyness(tA, tB, 5).filter((r) => r.ll >= 6.63);
    return {
      nA: tA.length,
      nB: tB.length,
      forA: rows.filter((r) => r.logRatio > 0).slice(0, 15),
      forB: rows.filter((r) => r.logRatio < 0).slice(0, 15),
    };
  }, [sets]);

  if (error) return <p className="error">{error}</p>;
  if (!data || !sets || !keys) return <p className="muted">Loading the essays…</p>;

  const labelA = GROUP_BY_KEY[a].label;
  const labelB = GROUP_BY_KEY[b].label;
  const pickedEssay: Essay | undefined = picked ? data.essays.essays.find((e) => e.id === picked) : undefined;
  const same = a === b;

  return (
    <>
      <h1>Compare two sets of texts</h1>
      <p className="lede">
        Each dot is one essay. The ink tick marks the group average. Every measure is simple enough to check by hand. That transparency is the
        point: you can see exactly why two texts differ, and decide whether the difference means anything.
      </p>

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
          {same && " Both groups are the same, so pick two different groups to see a contrast."}
        </p>
      </div>

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
        <span className="muted">Select a dot to read that essay.</span>
      </div>

      <section aria-label="Style measures">
        {FEATURES.map((f) => {
          const groups = [
            {
              label: labelA,
              color: A_COLOR,
              points: sets.A.map((e) => ({ id: e.id, v: data.profiles.get(e.id)![f.key], detail: essayDetail(e) })),
            },
            {
              label: labelB,
              color: B_COLOR,
              points: sets.B.map((e) => ({ id: e.id, v: data.profiles.get(e.id)![f.key], detail: essayDetail(e) })),
            },
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

      {pickedEssay && (
        <section className="panel" aria-live="polite">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ marginTop: 0 }}>{pickedEssay.id}</h3>
            <button className="quiet" onClick={() => setPicked(null)}>
              Close essay
            </button>
          </div>
          <p className="small muted">{essayDetail(pickedEssay)}. Connectives are highlighted.</p>
          <div className="prose" style={{ whiteSpace: "pre-wrap" }}>
            <Highlight text={pickedEssay.text} markers={data.markers.connectives} />
          </div>
        </section>
      )}

      <h2>Words that set the groups apart</h2>
      <div className="prose">
        <p>
          Keyness compares how often each word appears in one group relative to the other. Log-likelihood says whether the difference is
          bigger than chance (only words above 6.63, p &lt; .01, are listed). Log ratio says how big it is: +1 means twice as frequent in the
          first group, −1 twice as frequent in the second. Select a word to see it in context.
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
              <span className="swatch" style={{ background: color }} /> More typical of {label.toLowerCase()}
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
                      <td className="num">{r.logRatio > 0 ? "+" : ""}{r.logRatio.toFixed(2)}</td>
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
            <div>
              <p className="small" style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                <span className="swatch" style={{ background: A_COLOR }} /> {labelA}
              </p>
              <Concordance docs={sets.A} node={node} showDoc={false} limit={60} />
            </div>
            <div>
              <p className="small" style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                <span className="swatch" style={{ background: B_COLOR }} /> {labelB}
              </p>
              <Concordance docs={sets.B} node={node} showDoc={false} limit={60} />
            </div>
          </div>
        </section>
      )}

      <h2>Add your own text</h2>
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
