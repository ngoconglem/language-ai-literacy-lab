"""Build the corpora used by the Language & AI Literacy Lab web app.

Outputs (in web/public/data/):
  essays.json      human (ELLIPSE) and LLM essays on two shared prompts
  literary.json    5,000-word chunks of public-domain novels (NLTK Gutenberg selection)
  persuasion.txt   full text of Austen's *Persuasion* for the concordance lab
  wordlist.json    top-2,000 English words (wordfreq) used for lexical sophistication
  markers.json     stance and connective marker lists

Run:  python -I scripts/prepare_data.py <path/to/ELLIPSE_Final_github_train.csv> <path/to/gutenberg_dir>
"""
import csv
import json
import random
import re
import sys
from pathlib import Path

from wordfreq import top_n_list

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "public" / "data"
SRC = ROOT / "data" / "src"
OUT.mkdir(parents=True, exist_ok=True)

PROMPTS = {
    "Distance learning": (
        "Some schools offer distance learning as an option for students to attend classes "
        "from home by way of online or video conferencing. Would students benefit from being "
        "able to attend classes from home? Take a position and support it."
    ),
    "Impact of technology": (
        "Some people believe technology has a positive effect on people's lives; others believe "
        "its effects are negative. Write an essay explaining your view of the impact of "
        "technology on people's lives."
    ),
}
PER_PROMPT = 30  # human essays per prompt, stratified by proficiency
SEED = 2026


def band(score: float) -> str:
    if score < 3.0:
        return "lower"
    if score < 3.5:
        return "middle"
    return "higher"


def sample_ellipse(csv_path: str):
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8", errors="replace")))
    rng = random.Random(SEED)
    out = []
    for prompt in PROMPTS:
        pool = [r for r in rows if r["prompt"] == prompt]
        for b in ("lower", "middle", "higher"):
            group = sorted(
                (r for r in pool if band(float(r["Overall"])) == b),
                key=lambda r: r["text_id_kaggle"],
            )
            for r in rng.sample(group, PER_PROMPT // 3):
                out.append(
                    {
                        "id": "ELL-" + r["text_id_kaggle"],
                        "source": "human",
                        "prompt": prompt,
                        "condition": "ELLIPSE learner essay",
                        "grade": int(r["grade"]),
                        "proficiency": float(r["Overall"]),
                        "band": b,
                        "text": r["full_text"].strip(),
                    }
                )
    return out


def parse_llm(path: Path):
    essays, cur = [], None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("#"):
            continue
        if line.startswith("=== "):
            if cur:
                essays.append(cur)
            eid, prompt, cond = [x.strip() for x in line[4:].split("|")]
            cur = {"id": eid, "source": "llm", "prompt": prompt, "condition": cond, "lines": []}
        elif cur is not None:
            cur["lines"].append(line)
    if cur:
        essays.append(cur)
    for e in essays:
        e["text"] = "\n".join(e.pop("lines")).strip()
    return essays


TOKEN = re.compile(r"[a-z]+(?:'[a-z]+)?")

LITERARY = [
    ("austen-emma.txt", "Austen", "Emma"),
    ("austen-persuasion.txt", "Austen", "Persuasion"),
    ("austen-sense.txt", "Austen", "Sense and Sensibility"),
    ("chesterton-ball.txt", "Chesterton", "The Ball and the Cross"),
    ("chesterton-brown.txt", "Chesterton", "The Wisdom of Father Brown"),
    ("chesterton-thursday.txt", "Chesterton", "The Man Who Was Thursday"),
    ("melville-moby_dick.txt", "Melville", "Moby Dick"),
    ("carroll-alice.txt", "Carroll", "Alice's Adventures in Wonderland"),
    ("edgeworth-parents.txt", "Edgeworth", "The Parent's Assistant"),
]
CHUNK = 5000
MAX_CHUNKS = 8
MFW_STORE = 300


def literary_chunks(gdir: Path):
    texts = []
    for fname, author, title in LITERARY:
        raw = (gdir / fname).read_text(encoding="latin-1")
        toks = TOKEN.findall(raw.lower())
        n = min(len(toks) // CHUNK, MAX_CHUNKS)
        # spread chunks evenly through the book rather than taking the opening only
        step = (len(toks) // CHUNK) / n
        for i in range(n):
            start = int(i * step) * CHUNK
            texts.append({"author": author, "title": title, "idx": i + 1, "toks": toks[start : start + CHUNK]})
    counts = {}
    for t in texts:
        for w in t["toks"]:
            counts[w] = counts.get(w, 0) + 1
    vocab = [w for w, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:MFW_STORE]]
    chunks = []
    for t in texts:
        c = {}
        for w in t["toks"]:
            c[w] = c.get(w, 0) + 1
        chunks.append(
            {
                "id": f"{t['author']}: {t['title']} #{t['idx']}",
                "author": t["author"],
                "title": t["title"],
                "tokens": len(t["toks"]),
                "freq": [c.get(w, 0) for w in vocab],
            }
        )
    return {"vocab": vocab, "chunkSize": CHUNK, "chunks": chunks}


MARKERS = {
    # Abridged from Hyland's (2005) interpersonal metadiscourse categories.
    "hedges": [
        "may", "might", "could", "perhaps", "possibly", "probably", "likely", "unlikely",
        "seem", "seems", "seemed", "appear", "appears", "suggest", "suggests", "somewhat",
        "generally", "often", "usually", "sometimes", "tend", "tends", "maybe", "almost",
        "apparently", "i think", "i believe", "in my opinion", "in my view",
    ],
    "boosters": [
        "actually", "certainly", "clearly", "definitely", "indeed", "obviously", "undoubtedly",
        "surely", "always", "never", "really", "truly", "of course", "in fact", "must",
    ],
    "connectives": [
        "however", "therefore", "moreover", "furthermore", "additionally", "in addition",
        "nevertheless", "consequently", "thus", "hence", "meanwhile", "ultimately", "overall",
        "in conclusion", "on the other hand", "as a result", "for example", "for instance",
        "first", "second", "third", "finally", "firstly", "secondly",
    ],
    "selfMention": ["i", "me", "my", "mine", "we", "our", "us"],
}


def main():
    ell_csv, gdir = sys.argv[1], Path(sys.argv[2])
    human = sample_ellipse(ell_csv)
    llm = parse_llm(SRC / "llm_essays.txt")
    essays = {
        "prompts": PROMPTS,
        "sources": {
            "human": "ELLIPSE corpus (Crossley et al., 2023), CC BY 4.0. English language learners, US grades 9–12.",
            "llm": "Generated by Claude Opus 5.5 (Anthropic), 11 Nov 2026, under four documented prompting conditions.",
        },
        "essays": human + llm,
    }
    (OUT / "essays.json").write_text(json.dumps(essays, ensure_ascii=False), encoding="utf-8")
    (OUT / "literary.json").write_text(json.dumps(literary_chunks(gdir)), encoding="utf-8")
    persuasion = (gdir / "austen-persuasion.txt").read_text(encoding="latin-1")
    (OUT / "persuasion.txt").write_text(persuasion, encoding="utf-8")
    (OUT / "wordlist.json").write_text(json.dumps(top_n_list("en", 2000)), encoding="utf-8")
    (OUT / "markers.json").write_text(json.dumps(MARKERS, indent=1), encoding="utf-8")
    print(f"human={len(human)} llm={len(llm)}")


if __name__ == "__main__":
    main()
