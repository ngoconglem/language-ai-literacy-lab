import type { ReactNode } from "react";
import { notebookUrl } from "../config";
import { Guide } from "./Guide";

export function LabFrame({
  title,
  goal,
  time,
  ideas,
  steps,
  children,
  reflect,
  notebook,
  notebookLabel,
}: {
  title: string;
  goal: string;
  time: string;
  ideas: ReactNode;
  steps: ReactNode[];
  children: ReactNode;
  reflect: string[];
  notebook: string;
  notebookLabel?: string;
}) {
  return (
    <article>
      <h2 style={{ marginTop: 0.4 + "em" }}>{title}</h2>
      <p className="lede">{goal}</p>
      <Guide title={`Before you start (about ${time})`}>{ideas}</Guide>
      <h3>Steps</h3>
      <ol className="lab-steps">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {children}
      <h3>Reflect</h3>
      <ul className="lab-steps">
        {reflect.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="small">
        <a href={notebookUrl(notebook)}>{notebookLabel ?? "Reproduce this lab in Python"} ({notebook})</a>
      </p>
    </article>
  );
}

// ---------------- Lab 1 ----------------

