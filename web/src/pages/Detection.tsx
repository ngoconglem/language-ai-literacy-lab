import { useMemo, useState } from "react";
import { useResources, FEATURE_BY_KEY, CONDITION_LABEL, type Essay, type FeatureKey } from "../lib/data";
import { StripPlot, BarList } from "../components/charts";
import { essayDetail } from "../lib/groups";
import { Guide, Term } from "../components/Guide";

// The naive detector: average of signed z-scores on five features that differ most between
// default model output and learner essays. Positive = more "machine-like" by these features.
const DETECTOR: { key: FeatureKey; sign: 1 | -1; reads: string }[] = [
  { key: "meanWordLength", sign: 1, reads: "longer words" },
  { key: "mattr", sign: 1, reads: "more varied vocabulary" },
  { key: "offListPct", sign: 1, reads: "more words beyond the 2,000 most common" },
  { key: "sentenceLengthCV", sign: -1, reads: "more even sentence lengths" },
  { key: "selfMention", sign: -1, reads: "fewer first-person pronouns" },
];

const ROWS: { key: string; label: string; color: string; test: (e: Essay) => boolean }[] = [
  { key: "lower", label: "Learners, lower proficiency", color: "#008f86", test: (e) => e.band === "lower" },
  { key: "middle", label: "Learners, middle proficiency", color: "#008f86", test: (e) => e.band === "middle" },
  { key: "higher", label: "Learners, higher proficiency", color: "#008f86", test: (e) => e.band === "higher" },
  { key: "default", label: "Model, default instruction", color: "#b07d12", test: (e) => e.condition === "default" },
  { key: "concise", label: "Model, about 200 words", color: "#b07d12", test: (e) => e.condition === "concise" },
  { key: "persuade", label: "Model, persuasive", color: "#b07d12", test: (e) => e.condition === "persuade" },
  { key: "student", label: "Model, as a 10th-grader", color: "#b07d12", test: (e) => e.condition === "student" },
];

const pct = (k: number, n: number) => (n ? (100 * k) / n : 0);

export default function Detection() {
  const { data, error } = useResources();

  const model = useMemo(() => {
    if (!data) return null;
    const essays = data.essays.essays;
    const stats = DETECTOR.map((d) => {
      const xs = essays.map((e) => data.profiles.get(e.id)![d.key]);
      const m = xs.reduce((a, b) => a + b, 0) / xs.length;
      const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
      return { ...d, m, sd };
    });
    const score = new Map(
      essays.map((e) => {
        const p = data.profiles.get(e.id)!;
        return [e.id, stats.reduce((s, d) => s + (d.sign * (p[d.key] - d.m)) / d.sd, 0) / stats.length];
      }),
    );
    const sorted = [...score.values()].sort((a, b) => a - b);
    const acc = (t: number) => essays.filter((e) => (score.get(e.id)! >= t) === (e.source === "llm")).length / essays.length;
    let best = sorted[0];
    for (const t of sorted) if (acc(t) > acc(best)) best = t;
    const llmScores = essays.filter((e) => e.source === "llm").map((e) => score.get(e.id)!);
    const humanScores = essays.filter((e) => e.source === "human").map((e) => score.get(e.id)!);
    return {
      essays,
      score,
      best,
      bestAcc: acc(best),
      catchAll: Math.min(...llmScores),
      noLearner: Math.max(...humanScores) + 0.001,
      lo: Math.min(...sorted),
      hi: Math.max(...sorted),
    };
  }, [data]);

  const [thr, setThr] = useState<number | null>(null);

  if (error) return <p className="error">{error}</p>;
  if (!data || !model) return <p className="muted">Loading the essays…</p>;

  const t = thr ?? model.best;
  const rowStats = ROWS.map((r) => {
    const es = model.essays.filter(r.test);
    const flagged = es.filter((e) => model.score.get(e.id)! >= t).length;
    return { ...r, n: es.length, flagged };
  });
  const human = model.essays.filter((e) => e.source === "human");
  const llm = model.essays.filter((e) => e.source === "llm");
  const fp = human.filter((e) => model.score.get(e.id)! >= t).length;
  const tp = llm.filter((e) => model.score.get(e.id)! >= t).length;
  const student = rowStats.find((r) => r.key === "student")!;
  const atCatchAll = (test: (e: Essay) => boolean) => {
    const es = model.essays.filter(test);
    return pct(es.filter((e) => model.score.get(e.id)! >= model.catchAll).length, es.length);
  };
  const learnersAtCatchAll = atCatchAll((e) => e.source === "human");
  const higherAtCatchAll = atCatchAll((e) => e.band === "higher");
  const lowerAtCatchAll = atCatchAll((e) => e.band === "lower");

  return (
    <>
      <h1>Why detection fails</h1>
      <p className="lede">
        Here is a deliberately simple <Term id="detector">AI-writing detector</Term> built from five measures on this site. On default model output it looks impressive.
        Then the prompt changes by one sentence.
      </p>

      <Guide title="The idea in one paragraph">
        <p>
          Many people assume AI writing has tell-tale features: longer words, more varied vocabulary, very even sentences, no “I”. This page
          builds a detector from exactly those features and tests it on 84 essays whose authorship we know: 60 by English language learners
          and 24 by an AI model. You will see that it works well on ordinary AI output, fails as soon as the AI is asked to write like a
          student, and that trying to fix it means wrongly accusing real students.
        </p>
      </Guide>

      <div className="panel prose">
        <p>
          <strong>How the detector scores an essay.</strong> For each of five measures, the essay's value is converted to a{" "}
          <Term id="z-score">z-score</Term> (how many <Term id="sd">standard deviations</Term> it sits from the average of all 84 essays). The score is the average of those five z-scores, signed so that
          higher means {DETECTOR.map((d) => d.reads).join(", ")}. Essays at or above the <Term id="threshold">threshold</Term> are flagged
          as machine-written. A score of 0 is a perfectly average essay; most scores fall between −1.5 and +1.5.
        </p>
        <p className="small muted">
          Measures: {DETECTOR.map((d) => FEATURE_BY_KEY[d.key].label.toLowerCase()).join("; ")}. Real detectors use language-model
          probabilities rather than these features, but they share the logic: text that looks statistically “too smooth” is flagged.
        </p>
      </div>

      <Guide title="What the three numbers mean">
        <ul>
          <li>
            <strong>Model essays flagged</strong>: how much AI writing the detector catches. Higher is better.
          </li>
          <li>
            <strong>Learner essays wrongly flagged</strong>: <Term id="false-positive">false positives</Term>, real students accused of using
            AI. This should be as close to 0% as possible.
          </li>
          <li>
            <strong>“Write as a 10th-grader” essays caught</strong>: AI essays produced with one extra sentence in the prompt. The ones not
            caught are <Term id="false-negative">misses</Term>.
          </li>
        </ul>
        <p>All three change as you move the threshold slider below.</p>
      </Guide>

      <div className="metrics" aria-live="polite">
        <div className="metric">
          <div className="value">{pct(tp, llm.length).toFixed(0)}%</div>
          <div className="label">of model essays flagged ({tp} of {llm.length})</div>
        </div>
        <div className="metric">
          <div className="value">{pct(fp, human.length).toFixed(0)}%</div>
          <div className="label">of learner essays wrongly flagged ({fp} of {human.length})</div>
        </div>
        <div className="metric">
          <div className="value">{pct(student.flagged, student.n).toFixed(0)}%</div>
          <div className="label">of “write as a 10th-grader” model essays caught ({student.flagged} of {student.n})</div>
        </div>
      </div>

      <label className="field" style={{ maxWidth: 640 }}>
        Threshold: {t.toFixed(2)}
        <input
          type="range"
          min={model.lo}
          max={model.hi}
          step={0.01}
          value={t}
          onChange={(e) => setThr(Number(e.target.value))}
          aria-describedby="thr-help"
        />
      </label>
      <p id="thr-help" className="small muted" style={{ marginTop: 4 }}>
        Drag left to flag more essays, right to flag fewer.
      </p>
      <div className="chips" role="group" aria-label="Threshold presets" style={{ margin: "12px 0 20px" }}>
        <button className="chip" aria-pressed={Math.abs(t - model.best) < 1e-9} onClick={() => setThr(model.best)}>
          Best overall accuracy
        </button>
        <button className="chip" aria-pressed={Math.abs(t - model.catchAll) < 1e-9} onClick={() => setThr(model.catchAll)}>
          Catch every model essay
        </button>
        <button className="chip" aria-pressed={Math.abs(t - model.noLearner) < 1e-9} onClick={() => setThr(model.noLearner)}>
          Never flag a learner
        </button>
      </div>

      <StripPlot
        groups={ROWS.map((r) => ({
          label: r.label,
          color: r.color,
          points: model.essays.filter(r.test).map((e) => ({ id: e.id, v: model.score.get(e.id)!, detail: essayDetail(e) })),
        }))}
        digits={2}
        unit="(detector score)"
        threshold={t}
        labelWidth={200}
        height={38}
      />
      <p className="small muted">Each dot is one essay; the ink tick is the group average; the dashed line is the threshold.</p>
      <Guide title="Try this">
        <ol>
          <li>
            Press <strong>Best overall accuracy</strong>. Teal rows are learners, gold rows are the AI. Dots to the right of the dashed line
            are flagged. Notice that every ordinary AI essay is flagged, but the “as a 10th-grader” essays sit among the
            learners.
          </li>
          <li>
            Press <strong>Catch every model essay</strong>. The line moves left until every gold dot is flagged. Count the teal dots that
            are now flagged too: each one is a student wrongly accused.
          </li>
          <li>
            Press <strong>Never flag a learner</strong>. Now no student is accused, but read how many AI essays slip through.
          </li>
          <li>
            Look at the bars below for each setting. Which proficiency group is flagged most often? Why might that be unfair?
          </li>
        </ol>
      </Guide>

      <h2>Who gets flagged at this threshold</h2>
      <BarList rows={rowStats.map((r) => ({ label: `${r.label} (n = ${r.n})`, value: pct(r.flagged, r.n), color: r.color }))} max={100} suffix="%" />

      <h2>What this shows</h2>
      <div className="prose">
        <p>
          At the best-performing threshold the detector classifies {(model.bestAcc * 100).toFixed(0)}% of essays correctly (its{" "}
          <Term id="accuracy">accuracy</Term>), and it flags
          every model essay written under the default, concise and persuasive instructions. Adding one sentence to the prompt, “write the essay as
          a 10th-grade student would”, produces essays that sit inside the learner range on every one of the five measures. Under that
          condition the detector catches {student.flagged === 0 ? "none" : `${student.flagged} of ${student.n}`} of them at the threshold
          currently selected.
        </p>
        <p>
          Lowering the threshold to catch the disguised essays has a cost, and it falls on real students. At the threshold that catches
          every model essay, {learnersAtCatchAll.toFixed(0)}% of learners are wrongly flagged: {higherAtCatchAll.toFixed(0)}% of the
          higher-proficiency learners against {lowerAtCatchAll.toFixed(0)}% of the lower-proficiency ones. The gap is small in a sample this
          size, but its direction matters: on these measures, more fluent writing edges a learner towards the “machine” end, so the detector
          penalises the very progress teachers want to see.
        </p>
        <div className="callout">
          <p>
            This pattern is not an artefact of a toy detector. Liang and colleagues (2023) found that seven widely used GPT detectors
            misclassified, on average, 61% of TOEFL essays written by non-native English speakers as AI-generated, while correctly classifying
            essays by US eighth-graders. They also showed that simple prompting changes evade detection.
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Liang, W., Yuksekgonul, M., Mao, Y., Wu, E., &amp; Zou, J. (2023). GPT detectors are biased against non-native English writers.{" "}
            <em>Patterns, 4</em>(7), 100779. <a href="https://doi.org/10.1016/j.patter.2023.100779">doi.org/10.1016/j.patter.2023.100779</a>
          </p>
        </div>
        <h3>Limits of this demonstration</h3>
        <ul>
          <li>The samples are small: 60 learner essays and 24 model essays on two prompts.</li>
          <li>All model essays come from one model in one session. Other models and prompts will behave differently.</li>
          <li>The detector is fitted and tested on the same essays, which flatters its accuracy.</li>
          <li>
            Learners are US secondary-school English language learners (ELLIPSE corpus), so results do not transfer directly to university or
            other settings.
          </li>
        </ul>
        <h3>Questions for discussion</h3>
        <ol>
          <li>Which kind of error is worse in an academic-integrity process, missing a model essay or flagging a learner? Who decides?</li>
          <li>The five measures describe style, not authorship. What evidence would actually show who wrote a text?</li>
          <li>
            Look at the “{CONDITION_LABEL.student}” essays on the Compare page. Which features make them read as student writing, and which
            still do not?
          </li>
        </ol>
      </div>
    </>
  );
}
