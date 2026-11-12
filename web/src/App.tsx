import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Compare from "./pages/Compare";
import Detection from "./pages/Detection";
import Labs from "./pages/Labs";
import About from "./pages/About";
import Teach from "./pages/Teach";
import Glossary from "./pages/Glossary";
import { GuideProvider, GuideToggle } from "./components/Guide";
import { REPO_URL } from "./config";

function useRoute(): string[] {
  // Plain #name routes (#compare, #lab-3) so links work on static hosts and inside embedded previews.
  const parse = () => {
    const h = window.location.hash.replace(/^#\/?/, "");
    const lab = h.match(/^lab-?(\d)$/) ?? h.match(/^labs\/(\d)$/);
    if (lab) return ["labs", lab[1]];
    if (h === "compare-own") return ["compare", "own"];
    return h.split("/").filter(Boolean);
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

const NAV = [
  { href: "#compare", key: "compare", label: "Compare" },
  { href: "#detection", key: "detection", label: "Why detection fails" },
  { href: "#labs", key: "labs", label: "Labs" },
  { href: "#teach", key: "teach", label: "Teach with it" },
  { href: "#glossary", key: "glossary", label: "Glossary" },
  { href: "#about", key: "about", label: "About & data" },
];

export default function App() {
  const route = useRoute();
  const page = route[0] ?? "";

  useEffect(() => {
    const titles: Record<string, string> = {
      compare: "Compare",
      detection: "Why detection fails",
      labs: "Labs",
      teach: "Teach with it",
      glossary: "Glossary",
      about: "About & data",
    };
    document.title = titles[page] ? `${titles[page]} · Language & AI Literacy Lab` : "Language & AI Literacy Lab: Linguistic analysis of human and AI writing";
  }, [page]);

  return (
    <GuideProvider>
      <header className="topbar">
        <div className="shell">
          <a className="wordmark" href="#">
            Language &amp; <span>AI Literacy</span> Lab
          </a>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.key} href={n.href} aria-current={page === n.key ? "page" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <GuideToggle />
        </div>
      </header>
      <main>
        <div className="shell">
          {page === "compare" && <Compare key={route[1] ?? "builtin"} initialMode={route[1] === "own" ? "own" : "builtin"} />}
          {page === "detection" && <Detection />}
          {page === "labs" && <Labs lab={route[1]} />}
          {page === "teach" && <Teach />}
          {page === "about" && <About />}
          {page === "glossary" && <Glossary key={route[1] ?? ""} focus={route[1]} />}
          {!["compare", "detection", "labs", "teach", "about", "glossary"].includes(page) && <Home />}
        </div>
      </main>
      <footer>
        <div className="shell">
          <span>
            Language &amp; AI Literacy Lab, an open resource by{" "}
            <a href="https://research.monash.edu/en/persons/cong-ngo/">Dr Cong Ngo</a>. Code MIT; data under their own licences.
          </span>
          <span>
            <a href={REPO_URL}>Source code and Python notebooks</a>
          </span>
        </div>
      </footer>
    </GuideProvider>
  );
}
