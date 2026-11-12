"""Generate and execute the reproduction notebooks in notebooks/.

Run from the repository root:  python scripts/build_notebooks.py
"""
from pathlib import Path

import nbformat as nbf
from nbconvert.preprocessors import ExecutePreprocessor

ROOT = Path(__file__).resolve().parent.parent
NB = ROOT / "notebooks"
NB.mkdir(exist_ok=True)

SETUP = """import json, sys, statistics
from collections import Counter
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

sys.path.insert(0, "../analysis")
from features import *

DATA = Path("../web/public/data")
essays = json.loads((DATA / "essays.json").read_text())["essays"]
wordlist = set(json.loads((DATA / "wordlist.json").read_text()))
markers = json.loads((DATA / "markers.json").read_text())
pd.set_option("display.precision", 3)
plt.rcParams.update({"figure.dpi": 110, "axes.spines.top": False, "axes.spines.right": False})
TEAL, OCHRE, INK = "#008f86", "#b07d12", "#1c2b3a"
"""

NOTEBOOKS = {
    "compare_and_detection.ipynb": [
        ("md", "# Compare and detection\n\nReproduces the **Compare** and **Why detection fails** pages of the Language & AI Literacy Lab. "
               "Every function used here lives in `analysis/features.py`, which mirrors the browser code."),
        ("code", SETUP),
        ("md", "## Style profile of every essay"),
        ("code", """rows = []
for e in essays:
    p = profile(e["text"], wordlist, markers)
    p.update(id=e["id"], source=e["source"], prompt=e["prompt"],
             group=e.get("band") or e["condition"], proficiency=e.get("proficiency"))
    rows.append(p)
df = pd.DataFrame(rows)
df.groupby("source").mean(numeric_only=True).T"""),
        ("md", "## Group means by learner proficiency band and model instruction"),
        ("code", """FEATS = ["meanWordLength", "mattr", "offListPct", "meanSentenceLength", "sentenceLengthCV",
         "hedges", "boosters", "connectives", "selfMention"]
df.groupby("group")[FEATS].mean().T"""),
        ("md", "## Keyness: learners against the model\n\nLog-likelihood ≥ 6.63 (p < .01)."),
        ("code", """tH = [w for e in essays if e["source"] == "human" for w in tokens(e["text"])]
tM = [w for e in essays if e["source"] == "llm" for w in tokens(e["text"])]
key = pd.DataFrame(keyness(tH, tM, 5))
key = key[key.ll >= 6.63]
print("More typical of learners:", ", ".join(key[key.logRatio > 0].word.head(15)))
print("More typical of the model:", ", ".join(key[key.logRatio < 0].word.head(15)))"""),
        ("md", "## The naive detector"),
        ("code", """df["score"] = detector_scores(df.to_dict("records"))
is_llm = df.source == "llm"
acc = lambda t: ((df.score >= t) == is_llm).mean()
best = max(sorted(df.score), key=acc)   # lowest threshold reaching the best accuracy
catch_all = df[is_llm].score.min()
for name, t in [("best accuracy", best), ("catch every model essay", catch_all)]:
    flagged = df.score >= t
    print(f"{name}: threshold {t:.2f}, accuracy {acc(t):.0%}, model flagged {flagged[is_llm].mean():.0%}, "
          f"learners flagged {flagged[~is_llm].mean():.0%}")
    print(df.assign(flagged=flagged).groupby("group").flagged.mean().round(2).to_dict())"""),
        ("code", """order = ["lower", "middle", "higher", "default", "concise", "persuade", "student"]
fig, ax = plt.subplots(figsize=(8, 3.6))
for i, g in enumerate(order):
    s = df[df.group == g].score
    ax.scatter(s, [i] * len(s), color=TEAL if g in order[:3] else OCHRE, alpha=0.75, s=28, edgecolor="white")
ax.axvline(best, color=INK, ls="--", lw=1)
ax.set_yticks(range(len(order)), [f"Learners, {g}" if g in order[:3] else f"Model, {g}" for g in order])
ax.invert_yaxis(); ax.set_xlabel("Detector score"); plt.tight_layout()"""),
        ("code", """print("Correlation between learner proficiency and detector score:",
      round(df[~is_llm][["proficiency", "score"]].corr().iloc[0, 1], 3))"""),
    ],
    "lab1_concordance_frequency.ipynb": [
        ("md", "# Lab 1. Concordance and frequency\n\nReproduces Lab 1 on Austen's *Persuasion* and the essay corpora."),
        ("code", SETUP),
        ("code", """persuasion = (DATA / "persuasion.txt").read_text()
ptoks = tokens(persuasion)
print(len(ptoks), "words")

def kwic(text, node, span=60):
    import re
    flat = re.sub(r"\\s+", " ", text)
    for m in re.finditer(rf"\\b{re.escape(node)}\\b", flat, flags=re.I):
        yield flat[max(0, m.start() - span):m.start()].rjust(span), m.group(0), flat[m.end():m.end() + span]

for left, node, right in list(kwic(persuasion, "persuaded"))[:15]:
    print(f"{left} [{node}] {right}")"""),
        ("code", """lines = list(kwic(persuasion, "persuaded"))
print(Counter((r.split() or [""])[0].lower().strip(",.;") for _, _, r in lines).most_common(8))"""),
        ("md", "## Frequency, with and without function words"),
        ("code", """STOP = set(\"\"\"the a an and or but of to in on at for with by from as is are was were be been being it its this that these those
he she they them his her their i you we my your our me him us not no so if then than there here what which who whom when where why
how all any some such into out up down over under again very can could would should will shall may might must do does did have has had am\"\"\".split())
f = Counter(ptoks)
pd.DataFrame({"all words": [w for w, _ in f.most_common(20)],
              "content words": [w for w, _ in ((w, c) for w, c in f.most_common() if w not in STOP)][:20]})"""),
        ("code", """for src in ["human", "llm"]:
    t = [w for e in essays if e["source"] == src for w in tokens(e["text"])]
    print(src, "'because' per 1,000 words:", round(1000 * t.count("because") / len(t), 2))"""),
    ],
    "lab2_keyness_collocation.ipynb": [
        ("md", "# Lab 2. Keyness and collocation"),
        ("code", SETUP),
        ("code", """tH = [w for e in essays if e["source"] == "human" for w in tokens(e["text"])]
tM = [w for e in essays if e["source"] == "llm" for w in tokens(e["text"])]
key = pd.DataFrame(keyness(tH, tM, 5))
key = key[key.ll >= 6.63]
key.head(25)"""),
        ("md", "## Collocates of *technology* (window 4, ranked by logDice)"),
        ("code", """pd.concat({"learners": pd.DataFrame(collocates(tH, "technology", 4, 3)).head(12).reset_index(drop=True),
           "model": pd.DataFrame(collocates(tM, "technology", 4, 2)).head(12).reset_index(drop=True)}, axis=1)"""),
        ("code", """for w in [2, 4, 8]:
    print(w, [r["word"] for r in collocates(tH, "technology", w, 3)[:8]])"""),
    ],
    "lab3_burrows_delta.ipynb": [
        ("md", "# Lab 3. Burrows' Delta\n\nNine public-domain books, 5,000-word passages, distances on the most frequent words."),
        ("code", SETUP),
        ("code", """lit = json.loads((DATA / "literary.json").read_text())
chunks, vocab = lit["chunks"], lit["vocab"]
print(len(chunks), "passages;", Counter(c["author"] for c in chunks))

def nn_accuracy(n_mfw):
    D = burrows_delta(chunks, vocab, n_mfw)
    ok = 0
    for i, c in enumerate(chunks):
        j = min((k for k in range(len(chunks)) if k != i), key=lambda k: D[i][k])
        ok += chunks[j]["author"] == c["author"]
    return ok

pd.Series({n: nn_accuracy(n) for n in [10, 20, 50, 100, 200, 300]}, name="correct of 69")"""),
        ("code", """D = burrows_delta(chunks, vocab, 100)
fig, ax = plt.subplots(figsize=(6, 6))
ax.imshow(D, cmap="GnBu_r")
authors = [c["author"] for c in chunks]
ticks = [authors.index(a) + authors.count(a) / 2 for a in dict.fromkeys(authors)]
ax.set_xticks(ticks, list(dict.fromkeys(authors)), rotation=45); ax.set_yticks(ticks, list(dict.fromkeys(authors)))
ax.set_title("Burrows' Delta, 100 most frequent words"); plt.tight_layout()"""),
    ],
    "lab4_critical_ai_reading.ipynb": [
        ("md", "# Lab 4. Reading an AI summary critically\n\nContent-word overlap between each sentence of the model's summary and Wentworth's letter."),
        ("code", SETUP),
        ("code", """import re
lab = json.loads((DATA / "lab4.json").read_text())
STOP = set(\"\"\"the a an and or but of to in on at for with by from as is are was were be been being it its this that these those
he she they them his her their i you we my your our me him us not no so if then than there here what which who whom when where why
how all any some such into out up down over under again very can could would should will shall may might must do does did have has had am\"\"\".split())
passage = {w for w in tokens(lab["passage"]) if w not in STOP}
rows = []
for s in re.findall(r"[^.!?]+[.!?]+", lab["model"]):
    content = [w for w in tokens(s) if w not in STOP]
    shared = [w for w in content if w in passage]
    rows.append({"sentence": s.strip(), "overlap": len(shared) / len(content), "shared": ", ".join(dict.fromkeys(shared))})
pd.set_option("display.max_colwidth", 90)
pd.DataFrame(rows)"""),
    ],
    "lab5_tokenisation.ipynb": [
        ("md", "# Lab 5. How language models see your language\n\nToken counts for Articles 1–30 of the Universal Declaration of Human Rights in 22 languages, "
               "with three of OpenAI's published tokenisers. The counts in `data/udhr_tokens.csv` come from `scripts/compute_tokens.mjs` (js-tiktoken, as in the browser) "
               "and are re-checked with Python's tiktoken in `tests/check_tokens.py`."),
        ("code", """from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
pd.set_option("display.precision", 2)
plt.rcParams.update({"figure.dpi": 110, "axes.spines.top": False, "axes.spines.right": False})
TEAL, OCHRE, INK = "#008f86", "#b07d12", "#1c2b3a"
df = pd.read_csv("../data/udhr_tokens.csv")
df[["language", "script", "tokens_r50k_base", "tokens_cl100k_base", "tokens_o200k_base",
    "premium_r50k_base", "premium_cl100k_base", "premium_o200k_base"]].sort_values("premium_o200k_base", ascending=False)"""),
        ("md", "## Token premium across three generations of tokeniser\n\nPremium = tokens for the language ÷ tokens for English. 1.0 means parity with English."),
        ("code", """order = df.sort_values("premium_o200k_base")
fig, ax = plt.subplots(figsize=(7, 6.5))
for col, label, c in [("premium_r50k_base", "GPT-3 (2020)", "#c9d0d8"), ("premium_cl100k_base", "GPT-4 (2023)", TEAL), ("premium_o200k_base", "GPT-4o (2024)", OCHRE)]:
    ax.scatter(order[col], order["language"], label=label, color=c, s=28, zorder=3)
ax.axvline(1, color=INK, lw=0.8, ls="--")
ax.set_xscale("log"); ax.set_xlabel("Token premium relative to English (log scale)")
ax.legend(frameon=False, loc="lower right"); plt.tight_layout()"""),
        ("md", "## Did newer tokenisers close the gap?\n\nThe ratio below shows how many times smaller each language's premium became from GPT-3 to GPT-4o."),
        ("code", """df["improvement"] = df["premium_r50k_base"] / df["premium_o200k_base"]
df[["language", "premium_r50k_base", "premium_o200k_base", "improvement"]].sort_values("improvement", ascending=False).head(8)"""),
        ("md", "## Is the premium just about bytes?\n\nTokenisers work on UTF-8 bytes. Scripts such as Thai, Khmer and Burmese use three bytes per character, Latin-script English one. "
               "The correlation below checks how far bytes per character track the premium with each tokeniser."),
        ("code", """df["bytes_per_char"] = df["bytes"] / df["characters"]
for col in ["premium_r50k_base", "premium_cl100k_base", "premium_o200k_base"]:
    r = df["bytes_per_char"].corr(df[col], method="spearman")
    print(f"{col:22s} Spearman rho with bytes per character = {r:.2f}")"""),
        ("md", "## Count it yourself\n\nWith internet access, `tiktoken` downloads the vocabulary on first use. If `scripts/compute_tokens.mjs` has been run, the local copy in `data/ranks/` is used instead."),
        ("code", """import base64, tiktoken
import tiktoken_ext.openai_public as public

def encoding(name):
    local = Path("../data/ranks") / f"{name}.tiktoken"
    if not local.exists():
        return tiktoken.get_encoding(name)
    def from_local(_url, expected_hash=None):
        return {base64.b64decode(t): int(r) for t, r in (l.split(" ") for l in local.read_text().splitlines())}
    original, public.load_tiktoken_bpe = public.load_tiktoken_bpe, from_local
    try:
        return tiktoken.Encoding(**getattr(public, name)())
    finally:
        public.load_tiktoken_bpe = original

enc = encoding("o200k_base")
sentence = Path("../data/src/udhr/vi.txt").read_text(encoding="utf-8").splitlines()[1]
ids = enc.encode(sentence)
print(len(ids), "tokens for Article 1 in Vietnamese")
print([enc.decode([i]) for i in ids][:20])"""),
    ],
}


def build(only=None):
    ep = ExecutePreprocessor(timeout=300, kernel_name="python3")
    for name, cells in NOTEBOOKS.items():
        if only and name not in only:
            continue
        nb = nbf.v4.new_notebook()
        nb.cells = [nbf.v4.new_markdown_cell(c) if k == "md" else nbf.v4.new_code_cell(c) for k, c in cells]
        nb.metadata["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
        ep.preprocess(nb, {"metadata": {"path": str(NB)}})
        nbf.write(nb, NB / name)
        print("built", name)


if __name__ == "__main__":
    import sys

    build(sys.argv[1:] or None)
