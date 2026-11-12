import { useEffect, useMemo, useState } from "react";
import { Tiktoken } from "js-tiktoken/lite";
import { useData } from "../lib/data";
import { BarList } from "../components/charts";
import { Guide, Term } from "../components/Guide";
import { LabFrame } from "../components/LabFrame";

type EncName = "o200k_base" | "cl100k_base" | "r50k_base";

const ENCODINGS: { key: EncName; label: string; used: string }[] = [
  { key: "o200k_base", label: "GPT-4o (o200k_base, 2024)", used: "GPT-4o and later OpenAI models" },
  { key: "cl100k_base", label: "GPT-4 (cl100k_base, 2023)", used: "GPT-3.5 and GPT-4" },
  { key: "r50k_base", label: "GPT-3 (r50k_base, 2020)", used: "GPT-3" },
];

const LOADERS: Record<EncName, () => Promise<{ default: unknown }>> = {
  o200k_base: () => import("js-tiktoken/ranks/o200k_base"),
  cl100k_base: () => import("js-tiktoken/ranks/cl100k_base"),
  r50k_base: () => import("js-tiktoken/ranks/r50k_base"),
};

const cache = new Map<EncName, Promise<Tiktoken>>();
function getEncoder(name: EncName) {
  if (!cache.has(name)) {
    cache.set(
      name,
      LOADERS[name]().then((m) => new Tiktoken(m.default as ConstructorParameters<typeof Tiktoken>[0])),
    );
  }
  return cache.get(name)!;
}

interface Lang {
  code: string;
  name: string;
  script: string;
  article1: string;
  characters: number;
  bytes: number;
  tokens: Record<EncName, number>;
  article1_tokens: Record<EncName, number>;
  premium: Record<EncName, number>;
}

function fmtX(x: number) {
  return `${x.toFixed(x < 10 ? 1 : 0)}×`;
}

function TokenView({ text, enc }: { text: string; enc: EncName }) {
  const [state, setState] = useState<{ pieces: string[]; total: number } | { error: string } | null>(null);
  useEffect(() => {
    let live = true;
    setState(null);
    getEncoder(enc)
      .then((e) => {
        const ids = e.encode(text);
        const pieces = ids.slice(0, 600).map((id) => e.decode([id]));
        if (live) setState({ pieces, total: ids.length });
      })
      .catch((err: Error) => live && setState({ error: err.message }));
    return () => {
      live = false;
    };
  }, [text, enc]);

  if (!state) return <p className="muted small">Loading the tokeniser (a few megabytes, once)…</p>;
  if ("error" in state) return <p className="error">{state.error}</p>;
  const chars = [...text].length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="value">{state.total.toLocaleString()}</div>
          <div className="label">tokens</div>
        </div>
        <div className="stat">
          <div className="value">{chars.toLocaleString()}</div>
          <div className="label">characters</div>
        </div>
        <div className="stat">
          <div className="value">{state.total ? (chars / state.total).toFixed(2) : "–"}</div>
          <div className="label">characters per token</div>
        </div>
        <div className="stat">
          <div className="value">{words ? (state.total / words).toFixed(2) : "–"}</div>
          <div className="label">tokens per space-separated word</div>
        </div>
      </div>
      <p className="token-strip" aria-label="The text split into tokens">
        {state.pieces.map((p, i) => (
          <span key={i} className={`tok tok-${i % 2}`} title={`Token ${i + 1}`}>
            {p.replace(/\n/g, "↵").replace(/ /g, " ") || " "}
          </span>
        ))}
        {state.total > state.pieces.length && <span className="muted small"> … {state.total - state.pieces.length} more</span>}
      </p>
    </>
  );
}

export default function Lab5() {
  const { data, error } = useData<{ encodings: EncName[]; languages: Lang[] }>("udhr_tokens.json");
  const [enc, setEnc] = useState<EncName>("o200k_base");
  const [sample, setSample] = useState("vi");
  const [text, setText] = useState<string | null>(null);
  const [chartEnc, setChartEnc] = useState<EncName>("o200k_base");

  const langs = data?.languages ?? [];
  const current = text ?? langs.find((l) => l.code === sample)?.article1 ?? "";
  const vi = langs.find((l) => l.code === "vi");

  const rows = useMemo(
    () =>
      [...langs]
        .sort((a, b) => a.premium[chartEnc] - b.premium[chartEnc])
        .map((l) => ({
          label: l.name,
          value: l.premium[chartEnc],
          color: l.code === "en" ? "var(--ink-3)" : l.code === "vi" ? "var(--model)" : "var(--learner)",
        })),
    [langs, chartEnc],
  );
  const others = rows.filter((r) => r.label !== "English");
  const extremes = others.length ? { lo: others[0], hi: others[others.length - 1] } : null;

  return (
    <LabFrame
      title="Lab 5. How language models see your language"
      goal="Language models do not read words. They read tokens: pieces of text from a fixed vocabulary. This lab splits the same text into tokens in 22 languages and asks who pays for the difference."
      notebook="lab5_tokenisation.ipynb"
      time="30 minutes"
      ideas={
        <>
          <ul>
            <li>
              Before a <Term id="llm">language model</Term> sees any text, a <Term id="tokeniser">tokeniser</Term> cuts it into{" "}
              <Term id="llm-token">tokens</Term>: common words, parts of words, single letters or even parts of a letter.
            </li>
            <li>
              Companies charge for language models per token, and a model can only read a fixed number of tokens at once (its{" "}
              <Term id="context-window">context window</Term>). So a language that needs more tokens costs more and fits less.
            </li>
            <li>
              To compare languages fairly you need the same content in each: a <Term id="parallel-corpus">parallel corpus</Term>. Here it is
              Articles 1–30 of the Universal Declaration of Human Rights in 22 languages. The <Term id="token-premium">token premium</Term> is
              how many times more tokens a language needs than English for the same content.
            </li>
          </ul>
          <p>
            The tokenisers are the real ones OpenAI has published for its models; they run in your browser. Other companies' tokenisers differ,
            and some are not public, but unequal token counts across languages have been found across many tokenisers (Petrov et al., 2023).
          </p>
        </>
      }
      steps={[
        <>Below, keep the Vietnamese sample and the GPT-4o tokeniser. Look at how the text is split. Which words stay whole, and which break?</>,
        <>Switch to English, then back. Compare the number of tokens for the same sentence (Article 1).</>,
        <>Switch the tokeniser to GPT-3 (2020) and watch what happens to Vietnamese. Pieces shown as � are fragments of a single character.</>,
        <>Scroll to the chart. Change the tokeniser and see which languages gained most from newer tokenisers, and which still pay most.</>,
        <>Paste a paragraph in a language you know, perhaps your own writing, and compare its characters per token with English.</>,
      ]}
      reflect={[
        "Who pays the token premium? Think about students using a paid AI tool for homework, or a school paying for an API.",
        "Why might Vietnamese have improved so much between tokenisers, while Burmese and Amharic still need far more tokens than English?",
        "If a model can read 100 pages of English at once, roughly how many pages of Burmese can it read? What does that mean for summarising long documents?",
        "Token counts are only one kind of inequality. What else would you want to know before saying a model treats two languages equally?",
      ]}
    >
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <h3>See the tokens</h3>
          <div className="controls">
            <label className="field">
              Sample text (Article 1)
              <select
                value={text === null ? sample : "own"}
                onChange={(e) => {
                  if (e.target.value === "own") setText(current);
                  else {
                    setSample(e.target.value);
                    setText(null);
                  }
                }}
              >
                {langs.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
                <option value="own">My own text</option>
              </select>
            </label>
            <label className="field">
              Tokeniser
              <select value={enc} onChange={(e) => setEnc(e.target.value as EncName)}>
                {ENCODINGS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field" style={{ marginTop: 12 }}>
            Text (edit it or paste your own)
            <textarea rows={4} value={current} onChange={(e) => setText(e.target.value)} />
          </label>
          <Guide title="How to read the tokens">
            <p>
              Each shaded box is one token; the shading alternates so you can see where one ends and the next begins. A space at the start of
              a token belongs to it, which is why many English tokens are whole words with a leading space. A <strong>�</strong> marks a token
              that is only part of a character: the tokeniser works on the bytes of the text, and letters such as Vietnamese “ế” or Burmese
              syllables take several bytes, which may be split across tokens.
            </p>
          </Guide>
          <TokenView text={current} enc={enc} />

          <h3 style={{ marginTop: 32 }}>Same content, different cost</h3>
          <div className="controls">
            <label className="field">
              Tokeniser
              <select value={chartEnc} onChange={(e) => setChartEnc(e.target.value as EncName)}>
                {ENCODINGS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {vi && extremes && (
            <p className="verdict">
              With the {ENCODINGS.find((x) => x.key === chartEnc)!.label} tokeniser, Vietnamese needs{" "}
              <strong>{fmtX(vi.premium[chartEnc])}</strong> as many tokens as English for the same Articles. In the space a model gives 100
              pages of English, about <strong>{Math.round(100 / vi.premium[chartEnc])} pages</strong> of Vietnamese fit. Across these 22
              languages the premium runs from {fmtX(extremes.lo.value)} ({extremes.lo.label}) to {fmtX(extremes.hi.value)} ({extremes.hi.label}).
            </p>
          )}
          <Guide title="How to read the chart">
            <p>
              Each bar is a language. Its length is the <Term id="token-premium">token premium</Term>: the number of tokens needed for Articles
              1–30, divided by the number English needs. English is 1.0 (grey). Vietnamese is highlighted in gold. A premium of 2.0 means the
              same content costs twice as much to send to a model that charges per token, and takes twice as much of its context window.
            </p>
          </Guide>
          <BarList rows={rows} digits={2} suffix="×" />
          <div className="table-wrap" style={{ marginTop: 20 }}>
            <table>
              <caption className="small muted" style={{ textAlign: "left", captionSide: "top", marginBottom: 6 }}>
                Token premium relative to English for each tokeniser, Articles 1–30 of the Universal Declaration of Human Rights.
              </caption>
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Script</th>
                  <th className="num">GPT-3 (2020)</th>
                  <th className="num">GPT-4 (2023)</th>
                  <th className="num">GPT-4o (2024)</th>
                </tr>
              </thead>
              <tbody>
                {[...langs]
                  .sort((a, b) => b.premium.r50k_base - a.premium.r50k_base)
                  .map((l) => (
                    <tr key={l.code} style={l.code === "vi" ? { background: "var(--model-tint)" } : undefined}>
                      <td>{l.name}</td>
                      <td className="small">{l.script}</td>
                      <td className="num">{l.premium.r50k_base.toFixed(2)}</td>
                      <td className="num">{l.premium.cl100k_base.toFixed(2)}</td>
                      <td className="num">{l.premium.o200k_base.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">
            Counts were produced in the browser with js-tiktoken and checked, all 132 of them, against OpenAI's own tiktoken library in Python
            (tests/check_tokens.py). Texts: Articles 1–30 of the Universal Declaration of Human Rights from NLTK's udhr2 corpus (UDHR in
            Unicode project), Unicode-normalised (NFC). Related research: Petrov, La Malfa, Torr &amp; Bibi (2023), Language model tokenizers
            introduce unfairness between languages, NeurIPS 36; Ahia et al. (2023), Do all languages cost the same? Tokenization in the era of
            commercial language models, EMNLP 2023,{" "}
            <a href="https://doi.org/10.18653/v1/2023.emnlp-main.614">doi.org/10.18653/v1/2023.emnlp-main.614</a>.
          </p>
        </>
      )}
    </LabFrame>
  );
}
