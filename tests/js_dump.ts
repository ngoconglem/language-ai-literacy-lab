// Bundled with esbuild and run in Node: dumps the browser implementation's outputs for comparison.
import { readFileSync, writeFileSync } from "node:fs";
import { profile, keyness, tokens, burrowsDelta, collocates } from "../web/src/lib/text";

const dir = process.argv[2];
const essays = JSON.parse(readFileSync(`${dir}/essays.json`, "utf8")).essays;
const wordlist = new Set<string>(JSON.parse(readFileSync(`${dir}/wordlist.json`, "utf8")));
const markers = JSON.parse(readFileSync(`${dir}/markers.json`, "utf8"));
const lit = JSON.parse(readFileSync(`${dir}/literary.json`, "utf8"));
const profiles = Object.fromEntries(essays.map((e: any) => [e.id, profile(e.text, wordlist, markers)]));
const tH = essays.filter((e: any) => e.source === "human").flatMap((e: any) => tokens(e.text));
const tM = essays.filter((e: any) => e.source === "llm").flatMap((e: any) => tokens(e.text));
const key = keyness(tH, tM, 5).slice(0, 40);
const delta = burrowsDelta(lit.chunks, 100).delta;
const col = collocates(tH, "technology", 4, 3).slice(0, 15);
writeFileSync(process.argv[3], JSON.stringify({ profiles, key, delta, col }));
