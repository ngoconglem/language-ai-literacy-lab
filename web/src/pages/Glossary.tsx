import { useEffect, useMemo, useState } from "react";
import { GLOSSARY, type GlossaryEntry } from "../lib/glossary";

export default function Glossary({ focus }: { focus?: string }) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`g-${focus}`);
    if (el) {
      el.scrollIntoView({ block: "start" });
      el.classList.add("glossary-focus");
      const t = setTimeout(() => el.classList.remove("glossary-focus"), 2400);
      return () => clearTimeout(t);
    }
  }, [focus]);

  const topics = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = (g: GlossaryEntry) => !needle || [g.term, g.plain, g.detail ?? "", g.example ?? ""].join(" ").toLowerCase().includes(needle);
    const out = new Map<string, GlossaryEntry[]>();
    for (const g of GLOSSARY.filter(hit)) out.set(g.topic, [...(out.get(g.topic) ?? []), g]);
    return [...out.entries()];
  }, [q]);

  return (
    <>
      <h1>Glossary</h1>
      <p className="lede">
        Every technical term used on this site, explained in plain language. Throughout the site, terms with a dotted underline open a short
        definition when you select them.
      </p>
      <label className="field" style={{ maxWidth: 420 }}>
        Search the glossary
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="for example: keyness, z-score, collocation" />
      </label>
      {topics.length === 0 && <p className="muted">No term matches “{q}”.</p>}
      {topics.map(([topic, entries]) => (
        <section key={topic}>
          <h2>{topic}</h2>
          <dl className="glossary">
            {entries.map((g) => (
              <div key={g.id} id={`g-${g.id}`} className="glossary-entry">
                <dt>{g.term}</dt>
                <dd>
                  <p>{g.plain}</p>
                  {g.rule && (
                    <p>
                      <strong>Rule of thumb:</strong> {g.rule}
                    </p>
                  )}
                  {g.example && (
                    <p>
                      <strong>Example:</strong> {g.example}
                    </p>
                  )}
                  {g.detail && <p className="small muted">{g.detail}</p>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}
