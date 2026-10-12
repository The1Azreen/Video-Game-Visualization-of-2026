import { useEffect, useState } from "react";
import { loadYears } from "./data/load";
import type { YearEntry } from "./data/schema";
import { YearDashboard } from "./pages/YearDashboard";
import { applyTheme, savedTheme, type ThemeChoice } from "./theme";

// Hash routing (#/2025) keeps the build a plain static folder: it works from
// file servers, GitHub Pages and CDNs with no rewrite rules.
function yearFromHash(): number | null {
  const m = window.location.hash.match(/^#\/(\d{4})/);
  return m ? Number(m[1]) : null;
}

export function App() {
  const [years, setYears] = useState<YearEntry[]>([]);
  const [year, setYear] = useState<number | null>(yearFromHash);
  const [theme, setTheme] = useState<ThemeChoice>(savedTheme);

  useEffect(() => {
    loadYears().then(setYears, console.error);
    const onHash = () => setYear(yearFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => applyTheme(theme), [theme]);

  const available = years.filter((y) => y.status !== "planned");
  const active = year ?? available[0]?.year ?? null;
  const entry = years.find((y) => y.year === active);

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>State of the Games Industry</h1>
          <p className="muted">
            Jobs, console makers, and physical vs digital sales{entry?.asOf ? ` · data as of ${entry.asOf}` : ""}
          </p>
        </div>
        <label className="theme">
          <span className="muted small">Theme</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeChoice)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </header>

      <nav className="tabs" aria-label="Year">
        {years.map((y) =>
          y.status === "planned" ? (
            <span key={y.year} className="tab disabled" title="Coming soon">
              {y.label} <small>soon</small>
            </span>
          ) : (
            <a key={y.year} href={`#/${y.year}`} className="tab" aria-current={y.year === active ? "page" : undefined}>
              {y.label}
            </a>
          ),
        )}
        <span className="tab-links">
          <a href="#jobs" onClick={scrollTo("jobs")}>Jobs</a>
          <a href="#consoles" onClick={scrollTo("consoles")}>Consoles</a>
          <a href="#sales" onClick={scrollTo("sales")}>Sales</a>
          <a href="#long-view" onClick={scrollTo("long-view")}>Long view</a>
          <a href="#sources" onClick={scrollTo("sources")}>Sources</a>
        </span>
      </nav>

      <main>{active && <YearDashboard key={active} year={active} />}</main>
    </div>
  );
}

// In-page anchors would clobber the #/year route, so scroll without touching the hash.
const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};
