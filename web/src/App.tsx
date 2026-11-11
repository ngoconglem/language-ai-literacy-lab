import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Compare from "./pages/Compare";
import Detection from "./pages/Detection";
import Labs from "./pages/Labs";
import About from "./pages/About";
import { REPO_URL } from "./config";

function useRoute(): string[] {
  // Plain #name routes (#compare, #lab-3) so links work on static hosts and inside embedded previews.
  const parse = () => {
    const h = window.location.hash.replace(/^#\/?/, "");
    const lab = h.match(/^lab-?(\d)$/) ?? h.match(/^labs\/(\d)$/);
    return lab ? ["labs", lab[1]] : h.split("/").filter(Boolean);
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
      about: "About & data",
    };
    document.title = titles[page] ? `${titles[page]} · Close & Distant` : "Close & Distant: reading human and machine text";
  }, [page]);

  return (
    <>
      <header className="topbar">
        <div className="shell">
          <a className="wordmark" href="#">
            Close &amp; <span>Distant</span>
          </a>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.key} href={n.href} aria-current={page === n.key ? "page" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <div className="shell">
          {page === "compare" && <Compare />}
          {page === "detection" && <Detection />}
          {page === "labs" && <Labs lab={route[1]} />}
          {page === "about" && <About />}
          {!["compare", "detection", "labs", "about"].includes(page) && <Home />}
        </div>
      </main>
      <footer>
        <div className="shell">
          <span>
            Close &amp; Distant, an open text-as-data lab by{" "}
            <a href="https://research.monash.edu/en/persons/cong-ngo/">Dr Cong Ngo</a>. Code MIT; data under their own licences.
          </span>
          <span>
            <a href={REPO_URL}>Source code and Python notebooks</a>
          </span>
        </div>
      </footer>
    </>
  );
}
