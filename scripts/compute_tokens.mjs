// Count tokens for Articles 1-30 of the UDHR in 22 languages with three OpenAI tokenisers.
// Run from the repository root: node scripts/compute_tokens.mjs
// Writes web/public/data/udhr_tokens.json and data/udhr_tokens.csv, and exports the
// tokenisers' vocabularies to data/ranks/*.tiktoken so tests/check_tokens.py can
// re-count with the independent Python implementation (tiktoken).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../web/package.json", import.meta.url));
const { Tiktoken } = require("js-tiktoken/lite");
const ENCODINGS = {
  r50k_base: require("js-tiktoken/ranks/r50k_base"),
  cl100k_base: require("js-tiktoken/ranks/cl100k_base"),
  o200k_base: require("js-tiktoken/ranks/o200k_base"),
};

mkdirSync("data/ranks", { recursive: true });
const enc = {};
for (const [name, mod] of Object.entries(ENCODINGS)) {
  const ranks = mod.default ?? mod;
  enc[name] = new Tiktoken(ranks);
  const lines = [];
  for (const row of ranks.bpe_ranks.split("\n").filter(Boolean)) {
    const [, offsetStr, ...tokens] = row.split(" ");
    const offset = Number.parseInt(offsetStr, 10);
    tokens.forEach((t, i) => lines.push(`${t} ${offset + i}`));
  }
  writeFileSync(`data/ranks/${name}.tiktoken`, lines.join("\n") + "\n");
}

const langs = JSON.parse(readFileSync("data/src/udhr/languages.json", "utf8"));
const rows = langs.map((l) => {
  const text = readFileSync(`data/src/udhr/${l.code}.txt`, "utf8");
  const out = {
    ...l,
    characters: [...text].length,
    bytes: Buffer.byteLength(text, "utf8"),
    article1_tokens: {},
    tokens: {},
  };
  for (const [name, e] of Object.entries(enc)) {
    out.tokens[name] = e.encode(text).length;
    out.article1_tokens[name] = e.encode(l.article1).length;
  }
  return out;
});
const en = rows.find((r) => r.code === "en");
for (const r of rows) {
  r.premium = Object.fromEntries(Object.keys(enc).map((n) => [n, +(r.tokens[n] / en.tokens[n]).toFixed(3)]));
}
writeFileSync("web/public/data/udhr_tokens.json", JSON.stringify({ encodings: Object.keys(enc), languages: rows }, null, 1));
const header = ["code", "language", "script", "characters", "bytes", ...Object.keys(enc).map((n) => `tokens_${n}`), ...Object.keys(enc).map((n) => `premium_${n}`)];
const csv = [header.join(",")].concat(
  rows.map((r) => [r.code, `"${r.name}"`, `"${r.script}"`, r.characters, r.bytes, ...Object.keys(enc).map((n) => r.tokens[n]), ...Object.keys(enc).map((n) => r.premium[n])].join(",")),
);
writeFileSync("data/udhr_tokens.csv", csv.join("\n") + "\n");
for (const r of rows) console.log(r.code.padEnd(3), r.name.padEnd(22), Object.keys(enc).map((n) => `${n}=${r.tokens[n]} (${r.premium[n]}x)`).join("  "));
