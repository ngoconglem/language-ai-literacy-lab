// Text measures used across the site. Mirrors analysis/features.py one-to-one so that
// every number on screen can be reproduced in Python (see tests/compare_outputs.py).

export type Markers = Record<"hedges" | "boosters" | "connectives" | "selfMention", string[]>;

const TOKEN = /[a-z]+(?:'[a-z]+)?/g;
const SENT_SPLIT = /(?<=[.!?])\s+|\n+/;

export function tokens(text: string): string[] {
  return text.toLowerCase().replace(/’/g, "'").match(TOKEN) ?? [];
}

export function sentences(text: string): string[][] {
  return text
    .split(SENT_SPLIT)
    .map(tokens)
    .filter((t) => t.length > 0);
}

/** Moving-average type-token ratio (Covington & McFall, 2010). */
export function mattr(toks: string[], window = 50): number {
  if (toks.length === 0) return 0;
  if (toks.length < window) return new Set(toks).size / toks.length;
  const counts = new Map<string, number>();
  for (const w of toks.slice(0, window)) counts.set(w, (counts.get(w) ?? 0) + 1);
  let total = counts.size;
  for (let i = window; i < toks.length; i++) {
    const out = toks[i - window];
    const inn = toks[i];
    const c = counts.get(out)! - 1;
    if (c === 0) counts.delete(out);
    else counts.set(out, c);
    counts.set(inn, (counts.get(inn) ?? 0) + 1);
    total += counts.size;
  }
  return total / (toks.length - window + 1) / window;
}

/** Positions [start, length] (in tokens) of every marker match. */
export function markerSpans(toks: string[], markers: string[]): [number, number][] {
  const singles = new Set(markers.filter((m) => !m.includes(" ")));
  const phrases = markers.filter((m) => m.includes(" ")).map((m) => m.split(" "));
  const spans: [number, number][] = [];
  toks.forEach((w, i) => {
    if (singles.has(w)) spans.push([i, 1]);
  });
  for (const p of phrases) {
    for (let i = 0; i + p.length <= toks.length; i++) {
      if (p.every((w, k) => toks[i + k] === w)) spans.push([i, p.length]);
    }
  }
  return spans;
}

export function countMarkers(toks: string[], markers: string[]): number {
  return markerSpans(toks, markers).length;
}

export interface Profile {
  tokens: number;
  sentences: number;
  meanSentenceLength: number;
  sentenceLengthCV: number;
  meanWordLength: number;
  mattr: number;
  offListPct: number;
  hedges: number;
  boosters: number;
  connectives: number;
  selfMention: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pstdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

export function profile(text: string, wordlist: Set<string>, markers: Markers): Profile {
  const toks = tokens(text);
  const lens = sentences(text).map((s) => s.length);
  const n = toks.length;
  const perK = (c: number) => (n ? (1000 * c) / n : 0);
  const meanLen = mean(lens);
  return {
    tokens: n,
    sentences: lens.length,
    meanSentenceLength: meanLen,
    sentenceLengthCV: meanLen ? pstdev(lens) / meanLen : 0,
    meanWordLength: n ? mean(toks.map((w) => w.replace(/'/g, "").length)) : 0,
    mattr: mattr(toks),
    offListPct: n ? (100 * toks.filter((w) => !wordlist.has(w)).length) / n : 0,
    hedges: perK(countMarkers(toks, markers.hedges)),
    boosters: perK(countMarkers(toks, markers.boosters)),
    connectives: perK(countMarkers(toks, markers.connectives)),
    selfMention: perK(countMarkers(toks, markers.selfMention)),
  };
}

export function freq(toks: string[]): Map<string, number> {
  const f = new Map<string, number>();
  for (const w of toks) f.set(w, (f.get(w) ?? 0) + 1);
  return f;
}

/** Dunning/Rayson log-likelihood. a,b = frequency in corpus 1,2; c,d = corpus sizes. */
export function logLikelihood(a: number, b: number, c: number, d: number): number {
  const e1 = (c * (a + b)) / (c + d);
  const e2 = (d * (a + b)) / (c + d);
  let ll = 0;
  if (a) ll += a * Math.log(a / e1);
  if (b) ll += b * Math.log(b / e2);
  return 2 * ll;
}

/** Hardie's Log Ratio with 0.5 smoothing for zero frequencies. */
export function logRatio(a: number, b: number, c: number, d: number): number {
  return Math.log2(((a || 0.5) / c) / ((b || 0.5) / d));
}

export interface KeyRow {
  word: string;
  f1: number;
  f2: number;
  ll: number;
  logRatio: number;
}

export function keyness(t1: string[], t2: string[], minFreq = 5): KeyRow[] {
  const f1 = freq(t1);
  const f2 = freq(t2);
  const c = t1.length;
  const d = t2.length;
  const rows: KeyRow[] = [];
  for (const w of new Set([...f1.keys(), ...f2.keys()])) {
    const a = f1.get(w) ?? 0;
    const b = f2.get(w) ?? 0;
    if (a + b < minFreq) continue;
    rows.push({ word: w, f1: a, f2: b, ll: logLikelihood(a, b, c, d), logRatio: logRatio(a, b, c, d) });
  }
  return rows.sort((x, y) => y.ll - x.ll || (x.word < y.word ? -1 : x.word > y.word ? 1 : 0));
}

export interface Line {
  left: string;
  node: string;
  right: string;
  doc: string;
}

/** Key-word-in-context lines. Works on the original text so punctuation survives. */
export function kwic(docs: { id: string; text: string }[], node: string, span = 60, limit = 400): Line[] {
  const target = node.toLowerCase().trim();
  if (!target) return [];
  const isPhrase = target.includes(" ");
  const esc = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const re = new RegExp(isPhrase ? `\\b${esc}\\b` : `\\b${esc}\\b`, "gi");
  const lines: Line[] = [];
  for (const d of docs) {
    const flat = d.text.replace(/\s+/g, " ");
    for (const m of flat.matchAll(re)) {
      const s = m.index ?? 0;
      lines.push({
        left: flat.slice(Math.max(0, s - span), s),
        node: m[0],
        right: flat.slice(s + m[0].length, s + m[0].length + span),
        doc: d.id,
      });
      if (lines.length >= limit) return lines;
    }
  }
  return lines;
}

export interface Collocate {
  word: string;
  joint: number;
  freq: number;
  logDice: number;
  mi: number;
}

/** Collocates of a node word within +/- window tokens, ranked by logDice (Rychlý, 2008). */
export function collocates(toks: string[], node: string, window = 4, minJoint = 3): Collocate[] {
  const f = freq(toks);
  const fn = f.get(node) ?? 0;
  if (!fn) return [];
  const joint = new Map<string, number>();
  toks.forEach((w, i) => {
    if (w !== node) return;
    for (let k = Math.max(0, i - window); k <= Math.min(toks.length - 1, i + window); k++) {
      if (k === i) continue;
      joint.set(toks[k], (joint.get(toks[k]) ?? 0) + 1);
    }
  });
  const N = toks.length;
  const out: Collocate[] = [];
  for (const [w, j] of joint) {
    if (j < minJoint) continue;
    const fc = f.get(w)!;
    out.push({
      word: w,
      joint: j,
      freq: fc,
      logDice: 14 + Math.log2((2 * j) / (fn + fc)),
      mi: Math.log2((j * N) / (fn * fc * 2 * window)),
    });
  }
  return out.sort((a, b) => b.logDice - a.logDice || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
}

export interface Chunk {
  id: string;
  author: string;
  title: string;
  tokens: number;
  freq: number[];
}

/** Burrows' Delta between every pair of chunks on the first nMfw words. */
export function burrowsDelta(chunks: Chunk[], nMfw: number): { z: number[][]; delta: number[][]; means: number[]; sds: number[] } {
  const rel = chunks.map((c) => c.freq.slice(0, nMfw).map((x) => x / c.tokens));
  const means = Array.from({ length: nMfw }, (_, i) => mean(rel.map((r) => r[i])));
  const sds = Array.from({ length: nMfw }, (_, i) => pstdev(rel.map((r) => r[i])) || 1e-12);
  const z = rel.map((r) => r.map((x, i) => (x - means[i]) / sds[i]));
  const delta = z.map((zi) => z.map((zj) => mean(zi.map((a, k) => Math.abs(a - zj[k])))));
  return { z, delta, means, sds };
}

/** Delta from an arbitrary text to every chunk, using the chunk corpus's z-score parameters. */
export function deltaToText(text: string, vocab: string[], nMfw: number, model: ReturnType<typeof burrowsDelta>): number[] {
  const toks = tokens(text);
  const f = freq(toks);
  const zt = vocab.slice(0, nMfw).map((w, i) => ((f.get(w) ?? 0) / Math.max(1, toks.length) - model.means[i]) / model.sds[i]);
  return model.z.map((zc) => mean(zc.map((a, k) => Math.abs(a - zt[k]))));
}
