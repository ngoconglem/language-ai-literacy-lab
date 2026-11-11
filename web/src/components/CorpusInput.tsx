import { useState } from "react";

export interface UserDoc {
  id: string;
  text: string;
}

export interface UserCorpus {
  name: string;
  docs: UserDoc[];
}

/** Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes and newlines inside quotes. */
export function parseCsv(src: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Pick the text column: a header named text/essay/content/response, else the column with the longest average cell. */
export function textsFromCsv(src: string, fileName: string): UserDoc[] {
  const rows = parseCsv(src);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  let col = header.findIndex((h) => ["text", "essay", "content", "response", "full_text", "body"].includes(h));
  if (col < 0) {
    const avg = header.map((_, j) => rows.slice(1).reduce((s, r) => s + (r[j]?.length ?? 0), 0));
    col = avg.indexOf(Math.max(...avg));
  }
  const idCol = header.findIndex((h) => ["id", "text_id", "name", "file", "student"].includes(h));
  return rows
    .slice(1)
    .map((r, i) => ({ id: idCol >= 0 && r[idCol]?.trim() ? r[idCol].trim() : `${fileName} row ${i + 2}`, text: (r[col] ?? "").trim() }))
    .filter((d) => d.text.split(/\s+/).length >= 5);
}

export function textsFromPaste(src: string, label: string): UserDoc[] {
  return src
    .split(/^\s*-{3,}\s*$/m)
    .map((t) => t.trim())
    .filter((t) => t.split(/\s+/).length >= 5)
    .map((text, i) => ({ id: `${label} ${i + 1}`, text }));
}

export function CorpusInput({
  side,
  color,
  value,
  onChange,
}: {
  side: string;
  color: string;
  value: UserCorpus;
  onChange: (c: UserCorpus) => void;
}) {
  const [paste, setPaste] = useState("");
  const [fileDocs, setFileDocs] = useState<UserDoc[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const update = (fd: UserDoc[], p: string, name = value.name) => {
    onChange({ name, docs: [...fd, ...textsFromPaste(p, name || side)] });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const out: UserDoc[] = [];
    const skipped: string[] = [];
    for (const f of Array.from(files)) {
      const lower = f.name.toLowerCase();
      const txt = await f.text();
      if (lower.endsWith(".csv")) out.push(...textsFromCsv(txt, f.name));
      else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
        if (txt.trim().split(/\s+/).length >= 5) out.push({ id: f.name, text: txt.trim() });
      } else skipped.push(f.name);
    }
    setFileDocs(out);
    setNote(skipped.length ? `Skipped ${skipped.join(", ")}: only .txt, .md and .csv files can be read.` : null);
    update(out, paste);
  };

  const words = value.docs.reduce((s, d) => s + d.text.split(/\s+/).length, 0);

  return (
    <div className="corpus-input" style={{ borderTopColor: color }}>
      <label className="field">
        Name for this set
        <input type="text" value={value.name} placeholder={side} onChange={(e) => update(fileDocs, paste, e.target.value)} />
      </label>
      <label className="field">
        Files (.txt, one text per file, or .csv with a text column)
        <input type="file" multiple accept=".txt,.md,.csv,text/plain,text/csv" onChange={(e) => onFiles(e.target.files)} />
      </label>
      <label className="field">
        Or paste texts, separated by a line containing only ---
        <textarea
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value);
            update(fileDocs, e.target.value);
          }}
          placeholder={"First text…\n---\nSecond text…"}
          style={{ minHeight: 120 }}
        />
      </label>
      <p className="small" style={{ margin: 0 }}>
        <span className="swatch" style={{ background: color, marginRight: 6 }} />
        {value.docs.length === 0 ? "No texts yet." : `${value.docs.length} text${value.docs.length === 1 ? "" : "s"}, about ${words.toLocaleString()} words.`}
      </p>
      {note && <p className="small muted">{note}</p>}
    </div>
  );
}
