import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GLOSSARY_BY_ID } from "../lib/glossary";

/* ------------------------------------------------------------------ guidance switch */

const GuideCtx = createContext<{ on: boolean; set: (v: boolean) => void }>({ on: true, set: () => {} });

function readPref(): boolean {
  try {
    return localStorage.getItem("guidance") !== "off";
  } catch {
    return true;
  }
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(readPref);
  const set = (v: boolean) => {
    setOn(v);
    try {
      localStorage.setItem("guidance", v ? "on" : "off");
    } catch {
      /* storage unavailable: the choice lasts for this visit only */
    }
  };
  return <GuideCtx.Provider value={{ on, set }}>{children}</GuideCtx.Provider>;
}

export const useGuide = () => useContext(GuideCtx);

export function GuideToggle() {
  const { on, set } = useGuide();
  return (
    <button className="guide-toggle" aria-pressed={on} onClick={() => set(!on)} title="Show or hide the step-by-step explanations">
      Guidance {on ? "on" : "off"}
    </button>
  );
}

/** A beginner explanation panel. Hidden when the reader switches guidance off. */
export function Guide({ title = "How to read this", children }: { title?: string; children: ReactNode }) {
  const { on } = useGuide();
  if (!on) return null;
  return (
    <aside className="guide" aria-label={title}>
      <p className="guide-title">{title}</p>
      {children}
    </aside>
  );
}

/* ------------------------------------------------------------------ inline term definitions */

export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const entry = GLOSSARY_BY_ID[id];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 320 });
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "mousedown" && (pop.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setOpen(false);
      if (e.type === "keydown") btn.current?.focus();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (!entry) return <>{children}</>;

  const toggle = () => {
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 24);
      const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
      const below = r.bottom + 8;
      setPos({ top: below + 220 > window.innerHeight && r.top > 240 ? r.top - 8 : below, left, width });
    }
    setOpen(!open);
  };
  const above = btn.current ? pos.top < btn.current.getBoundingClientRect().top : false;

  return (
    <>
      <button ref={btn} type="button" className="term" aria-expanded={open} aria-controls={popId} onClick={toggle}>
        {children ?? entry.term}
      </button>
      {open && (
        <div
          ref={pop}
          id={popId}
          role="note"
          className="term-pop"
          style={{ top: pos.top, left: pos.left, width: pos.width, transform: above ? "translateY(-100%)" : undefined }}
        >
          <p className="term-pop-title">{entry.term}</p>
          <p>{entry.plain}</p>
          {entry.rule && (
            <p className="small">
              <strong>Rule of thumb:</strong> {entry.rule}
            </p>
          )}
          <a href={`#glossary/${entry.id}`} onClick={() => setOpen(false)} className="small">
            Full glossary entry
          </a>
        </div>
      )}
    </>
  );
}
