import { useEffect, useState, type ReactNode } from "react";
import { loadYears } from "./data/load";
import type { YearEntry } from "./data/schema";
import { YearDashboard } from "./pages/YearDashboard";
import { applySky, savedSky } from "./theme";

// Hash routing (#/2025) keeps the build a plain static folder: it works from
// file servers, GitHub Pages and CDNs with no rewrite rules.
function yearFromHash(): number | null {
  const m = window.location.hash.match(/^#\/(\d{4})/);
  return m ? Number(m[1]) : null;
}

// 16×16 pixel icons in the reference site's style (crisp edges, palette colors).
const ICONS: Record<string, ReactNode> = {
  jobs: (
    <>
      <path fill="#F7C948" d="M5 2h6v1h1v2h3v9H1V5h3V3h1zM6 4v1h4V4z" />
      <path fill="#1B1B2F" d="M2 7h12v1H2z" />
      <path fill="#FF6FF2" d="M7 7h2v2H7z" />
    </>
  ),
  consoles: (
    <>
      <path fill="#F7C948" d="M3 4h10v1h1v1h1v6h-1v1h-3v-1h-1v-1H6v1H5v1H2v-1H1V6h1V5h1z" />
      <path fill="#1B1B2F" d="M4 6h1v1h1v1H5v1H4V8H3V7h1z" />
      <path fill="#FF6FF2" d="M11 6h1v1h-1zM12 7h1v1h-1zM10 7h1v1h-1zM11 8h1v1h-1z" />
    </>
  ),
  sales: (
    <>
      <path fill="#F7C948" d="M5 1h6v1h2v2h1v8h-1v2h-2v1H5v-1H3v-2H2V4h1V2h2z" />
      <path fill="#8a6d17" d="M7 4h2v1h2v1H7v1h4v4H9v1H7v-1H5v-1h4V9H5V5h2z" />
    </>
  ),
  "long-view": (
    <>
      <path fill="#fff" d="M1 1h1v13h13v1H1z" />
      <path fill="#6DE0F6" d="M3 10h2v3H3zM7 7h2v6H7zM11 4h2v9h-2z" />
      <path fill="#FF6FF2" d="M3 8h1v1H3zM4 7h1v1H4zM5 6h2v1H5zM7 5h2v1H7zM9 4h1v1H9zM10 3h2v1h-2z" />
    </>
  ),
  timeline: (
    <>
      <path fill="#F7C948" d="M2 2h12v12H2z" />
      <path fill="#1B1B2F" d="M3 5h10v8H3z" />
      <path fill="#FF6FF2" d="M2 2h12v2H2z" />
      <path fill="#6DE0F6" d="M4 6h2v2H4zM7 6h2v2H7zM10 6h2v2h-2zM4 9h2v2H4zM7 9h2v2H7z" />
    </>
  ),
  sources: (
    <>
      <path fill="#fff" d="M3 1h8l2 2v12H3z" />
      <path fill="#3C2E7B" d="M5 5h6v1H5zM5 7h6v1H5zM5 9h6v1H5zM5 11h4v1H5z" />
    </>
  ),
  folder: (
    <>
      <path fill="#F7C948" d="M1 3h5l1 1h8v9H1z" />
      <path fill="#FFE08A" d="M1 6h14v7H1z" />
    </>
  ),
  wip: (
    <>
      <path fill="#F7C948" d="M1 3h5l1 1h8v9H1z" />
      <path fill="#FFE08A" d="M1 6h14v7H1z" />
      <path fill="#FF6FF2" d="M9 8h5v4H9z" />
      <path fill="#1B1B2F" d="M10 9h1v2h-1zM12 9h1v2h-1z" />
    </>
  ),
  sky: <path fill="#6DE0F6" d="M7 1h2v4h1v1h4v2h-4v1H9v4H7v-4H6V8H2V6h4V5h1z" />,
};

const Icon = ({ name }: { name: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

const SECTIONS = [
  ["jobs", "Jobs"],
  ["consoles", "Consoles"],
  ["sales", "Sales"],
  ["long-view", "Long view"],
  ["timeline", "Timeline"],
  ["sources", "Sources"],
] as const;

export function App() {
  const [years, setYears] = useState<YearEntry[]>([]);
  const [year, setYear] = useState<number | null>(yearFromHash);
  const [sky, setSky] = useState(savedSky);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    loadYears().then(setYears, console.error);
    const onHash = () => setYear(yearFromHash());
    window.addEventListener("hashchange", onHash);
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.removeEventListener("hashchange", onHash);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => applySky(sky), [sky]);

  const available = years.filter((y) => y.status !== "planned");
  const active = year ?? available[0]?.year ?? null;
  const entry = years.find((y) => y.year === active);

  return (
    <div className="app">
      <header className="top">
        <nav className="desktop" aria-label="Sections">
          {SECTIONS.map(([id, label]) => (
            <a key={id} className="app-icon" href={`#${id}`} onClick={scrollTo(id)}>
              <Icon name={id} />
              {label}
            </a>
          ))}
        </nav>
        <div className="logo">
          <div className="logo-main">
            GAME<span>//</span>STATE
          </div>
          <div className="logo-sub">✦ the state of the games industry, year by year ✦</div>
        </div>
        <nav className="desktop right" aria-label="Year">
          {years.map((y) =>
            y.status === "planned" ? (
              <span key={y.year} className="app-icon disabled" title="Coming soon">
                <Icon name="folder" />
                {y.label} (soon)
              </span>
            ) : (
              <a key={y.year} href={`#/${y.year}`} className={`app-icon${y.year === active ? " on" : ""}`} aria-current={y.year === active ? "page" : undefined}>
                <Icon name={y.status === "in-progress" ? "wip" : "folder"} />
                {y.label}
              </a>
            ),
          )}
          <button type="button" className={`app-icon${sky ? " on" : ""}`} aria-pressed={sky} onClick={() => setSky(!sky)}>
            <Icon name="sky" />
            Night sky
          </button>
        </nav>
      </header>

      <main>{active && entry && <YearDashboard key={active} entry={entry} />}</main>

      <footer id="taskbar">
        <a className="button start" href={active ? `#/${active}` : "#"} onClick={scrollTo("top")}>
          ✦ {entry?.label ?? "…"}
        </a>
        <span className="vl" aria-hidden />
        <span className="ticker">
          {entry?.status === "in-progress" ? "● WORK IN PROGRESS ✦ " : ""}
          jobs ✦ console makers ✦ physical vs digital{entry?.asOf ? ` ✦ data as of ${entry.asOf}` : ""}
        </span>
        <span className="vl" aria-hidden />
        <time className="clock">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</time>
      </footer>
    </div>
  );
}

// In-page anchors would clobber the #/year route, so scroll without touching the hash.
const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  if (id === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};
