import { Fragment } from "react";
import { markerSpans } from "../lib/text";

const TOKEN = /[a-z]+(?:'[a-z]+)?/g;

/** Render text with marker matches (or off-list words) wrapped in <mark>. */
export function Highlight({
  text,
  markers,
  offList,
}: {
  text: string;
  markers?: string[];
  offList?: Set<string>;
}) {
  const lower = text.toLowerCase().replace(/’/g, "'");
  const pos: [number, number][] = [];
  const toks: string[] = [];
  for (const m of lower.matchAll(TOKEN)) {
    pos.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
    toks.push(m[0]);
  }
  const ranges: [number, number][] = [];
  if (markers) {
    for (const [s, len] of markerSpans(toks, markers)) ranges.push([pos[s][0], pos[s + len - 1][1]]);
  }
  if (offList) {
    toks.forEach((w, i) => {
      if (!offList.has(w)) ranges.push(pos[i]);
    });
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: JSX.Element[] = [];
  let cur = 0;
  ranges.forEach(([s, e], i) => {
    if (s < cur) return;
    out.push(<Fragment key={`t${i}`}>{text.slice(cur, s)}</Fragment>);
    out.push(<mark key={`m${i}`}>{text.slice(s, e)}</mark>);
    cur = e;
  });
  out.push(<Fragment key="end">{text.slice(cur)}</Fragment>);
  return <>{out}</>;
}
