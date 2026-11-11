"""Reference implementation of every measure shown in the Close & Distant web app.

The TypeScript code in web/src/lib/text.ts mirrors these functions one-to-one, and
tests/compare_outputs.py checks that both produce the same numbers.
"""
import math
import re
import statistics

TOKEN = re.compile(r"[a-z]+(?:'[a-z]+)?")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


def tokens(text: str) -> list[str]:
    return TOKEN.findall(text.lower().replace("’", "'"))


def sentences(text: str) -> list[list[str]]:
    out = []
    for s in SENT_SPLIT.split(text):
        t = tokens(s)
        if t:
            out.append(t)
    return out


def mattr(toks: list[str], window: int = 50) -> float:
    """Moving-average type-token ratio (Covington & McFall, 2010)."""
    if len(toks) < window:
        return len(set(toks)) / len(toks) if toks else 0.0
    counts: dict[str, int] = {}
    for w in toks[:window]:
        counts[w] = counts.get(w, 0) + 1
    total = len(counts)
    for i in range(window, len(toks)):
        out_w, in_w = toks[i - window], toks[i]
        counts[out_w] -= 1
        if counts[out_w] == 0:
            del counts[out_w]
        counts[in_w] = counts.get(in_w, 0) + 1
        total += len(counts)
    return total / (len(toks) - window + 1) / window


def count_markers(toks: list[str], markers: list[str]) -> int:
    singles = {m for m in markers if " " not in m}
    phrases = [m.split() for m in markers if " " in m]
    n = sum(1 for w in toks if w in singles)
    for p in phrases:
        k = len(p)
        n += sum(1 for i in range(len(toks) - k + 1) if toks[i : i + k] == p)
    return n


def profile(text: str, wordlist: set[str], markers: dict[str, list[str]]) -> dict:
    toks = tokens(text)
    sents = sentences(text)
    lens = [len(s) for s in sents]
    n = len(toks)
    per_k = lambda c: 1000 * c / n if n else 0.0
    mean_len = statistics.fmean(lens) if lens else 0.0
    sd_len = statistics.pstdev(lens) if len(lens) > 1 else 0.0
    return {
        "tokens": n,
        "sentences": len(sents),
        "meanSentenceLength": mean_len,
        "sentenceLengthCV": sd_len / mean_len if mean_len else 0.0,
        "meanWordLength": statistics.fmean(len(w.replace("'", "")) for w in toks) if n else 0.0,
        "mattr": mattr(toks),
        "offListPct": 100 * sum(1 for w in toks if w not in wordlist) / n if n else 0.0,
        "hedges": per_k(count_markers(toks, markers["hedges"])),
        "boosters": per_k(count_markers(toks, markers["boosters"])),
        "connectives": per_k(count_markers(toks, markers["connectives"])),
        "selfMention": per_k(count_markers(toks, markers["selfMention"])),
    }


def log_likelihood(a: int, b: int, c: int, d: int) -> float:
    """Dunning/Rayson log-likelihood. a,b = word freq in corpus 1,2; c,d = corpus sizes."""
    e1 = c * (a + b) / (c + d)
    e2 = d * (a + b) / (c + d)
    ll = 0.0
    if a:
        ll += a * math.log(a / e1)
    if b:
        ll += b * math.log(b / e2)
    return 2 * ll


def log_ratio(a: int, b: int, c: int, d: int) -> float:
    """Hardie's Log Ratio with 0.5 smoothing for zero frequencies."""
    return math.log2(((a or 0.5) / c) / ((b or 0.5) / d))


def keyness(toks1: list[str], toks2: list[str], min_freq: int = 5) -> list[dict]:
    f1: dict[str, int] = {}
    f2: dict[str, int] = {}
    for w in toks1:
        f1[w] = f1.get(w, 0) + 1
    for w in toks2:
        f2[w] = f2.get(w, 0) + 1
    c, d = len(toks1), len(toks2)
    rows = []
    for w in set(f1) | set(f2):
        a, b = f1.get(w, 0), f2.get(w, 0)
        if a + b < min_freq:
            continue
        rows.append({"word": w, "f1": a, "f2": b, "ll": log_likelihood(a, b, c, d), "logRatio": log_ratio(a, b, c, d)})
    return sorted(rows, key=lambda r: (-r["ll"], r["word"]))


def burrows_delta(chunks: list[dict], vocab: list[str], n_mfw: int = 100) -> list[list[float]]:
    """Burrows' Delta between all chunks using the first n_mfw words of vocab."""
    rel = [[c["freq"][i] / c["tokens"] for i in range(n_mfw)] for c in chunks]
    means = [statistics.fmean(r[i] for r in rel) for i in range(n_mfw)]
    sds = [statistics.pstdev([r[i] for r in rel]) or 1e-12 for i in range(n_mfw)]
    z = [[(r[i] - means[i]) / sds[i] for i in range(n_mfw)] for r in rel]
    return [[statistics.fmean(abs(a - b) for a, b in zip(zi, zj)) for zj in z] for zi in z]


def collocates(toks: list[str], node: str, window: int = 4, min_joint: int = 3) -> list[dict]:
    """Collocates within +/- window tokens, ranked by logDice (Rychly, 2008)."""
    f: dict[str, int] = {}
    for w in toks:
        f[w] = f.get(w, 0) + 1
    fn = f.get(node, 0)
    if not fn:
        return []
    joint: dict[str, int] = {}
    for i, w in enumerate(toks):
        if w != node:
            continue
        for k in range(max(0, i - window), min(len(toks) - 1, i + window) + 1):
            if k != i:
                joint[toks[k]] = joint.get(toks[k], 0) + 1
    n = len(toks)
    out = []
    for w, j in joint.items():
        if j < min_joint:
            continue
        fc = f[w]
        out.append({
            "word": w, "joint": j, "freq": fc,
            "logDice": 14 + math.log2(2 * j / (fn + fc)),
            "mi": math.log2(j * n / (fn * fc * 2 * window)),
        })
    return sorted(out, key=lambda r: (-r["logDice"], r["word"]))


def detector_scores(profiles: list[dict]) -> list[float]:
    """Naive detector: mean of signed z-scores (sample SD) on five features."""
    spec = {"meanWordLength": 1, "mattr": 1, "offListPct": 1, "sentenceLengthCV": -1, "selfMention": -1}
    stats = {}
    for k in spec:
        xs = [p[k] for p in profiles]
        stats[k] = (statistics.fmean(xs), statistics.stdev(xs))
    return [sum(s * (p[k] - stats[k][0]) / stats[k][1] for k, s in spec.items()) / len(spec) for p in profiles]
