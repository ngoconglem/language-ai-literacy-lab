import { useMemo, useState } from "react";
import { kwic, type Line } from "../lib/text";

type Sort = "order" | "left" | "right";

function firstWord(s: string) {
  return (s.toLowerCase().match(/[a-z']+/) ?? [""])[0];
}
function lastWord(s: string) {
  const m = s.toLowerCase().match(/[a-z']+/g);
  return m ? m[m.length - 1] : "";
}

export function Concordance({
  docs,
  node,
  limit = 400,
  showDoc = true,
  caption,
}: {
  docs: { id: string; text: string }[];
  node: string;
  limit?: number;
  showDoc?: boolean;
  caption?: string;
}) {
  const [sort, setSort] = useState<Sort>("order");
  const lines = useMemo(() => kwic(docs, node, 70, limit), [docs, node, limit]);
  const sorted = useMemo(() => {
    const ls: Line[] = [...lines];
    if (sort === "right") ls.sort((a, b) => firstWord(a.right).localeCompare(firstWord(b.right)));
    if (sort === "left") ls.sort((a, b) => lastWord(a.left).localeCompare(lastWord(b.left)));
    return ls;
  }, [lines, sort]);

  if (!node.trim()) return <p className="muted">Type a word or phrase to see it in context.</p>;
  if (!lines.length) return <p className="muted">No matches for “{node}”. Check the spelling or try a shorter form of the word.</p>;

  return (
    <div>
      <div className="controls" style={{ margin: "8px 0" }}>
        <span className="small muted">
          {lines.length >= limit ? `First ${limit}` : lines.length} line{lines.length === 1 ? "" : "s"}
          {caption ? `, ${caption}` : ""}
        </span>
        <div className="chips" role="group" aria-label="Sort concordance lines">
          {(
            [
              ["order", "Text order"],
              ["left", "Sort by word before"],
              ["right", "Sort by word after"],
            ] as [Sort, string][]
          ).map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={sort === k} onClick={() => setSort(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap" style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--rule)", borderRadius: 6 }}>
        <table className="kwic">
          <tbody>
            {sorted.map((l, i) => (
              <tr key={i}>
                <td className="left">
                  <div>{l.left}</div>
                </td>
                <td className="node">
                  <mark>{l.node}</mark>
                </td>
                <td>{l.right}</td>
                {showDoc && <td className="doc">{l.doc}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
