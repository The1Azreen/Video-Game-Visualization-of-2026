import type { ReactNode } from "react";
import type { Confidence, Source } from "../data/schema";
import { ConfidenceBadge, SourceLink } from "./bits";

export interface WafflePart {
  label: ReactNode;
  value: number; // share in percent; parts should sum to ~100
  detail: string;
  tone: "accent" | "neutral";
}

/** 10×10 grid, one square per percent: a part-to-whole that makes a tiny share visible. */
export function Waffle({
  title,
  subtitle,
  parts,
  footnote,
  confidence,
  source,
}: {
  title: string;
  subtitle?: ReactNode;
  parts: WafflePart[];
  footnote?: ReactNode;
  confidence: Confidence;
  source?: Source;
}) {
  // Round to whole squares, giving any rounding remainder to the largest part.
  const counts = parts.map((p) => Math.round(p.value));
  const largest = counts.indexOf(Math.max(...counts));
  counts[largest] += 100 - counts.reduce((a, b) => a + b, 0);
  const squares = parts.flatMap((p, i) => Array.from({ length: counts[i] }, () => p));

  return (
    <figure className="card chart waffle-card">
      <header className="chart-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>
      </header>
      <div className="waffle-body">
        <div
          className="waffle"
          role="img"
          aria-label={parts.map((p) => `${typeof p.label === "string" ? p.label : ""} ${p.value}%`).join(", ")}
        >
          {squares.map((p, i) => (
            <span key={i} className={`sq ${p.tone}`} title={`${p.detail}`} />
          ))}
        </div>
        <ul className="waffle-legend">
          {parts.map((p, i) => (
            <li key={i}>
              <span className={`sw ${p.tone}`} aria-hidden />
              <div>
                <div className="wl-label">{p.label}</div>
                <div className="wl-value">{p.value}%</div>
                <div className="wl-detail">{p.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="foot">
        {footnote}
        <span className="tile-meta">
          <ConfidenceBadge c={confidence} />
          {source && <SourceLink source={source} />}
        </span>
      </figcaption>
    </figure>
  );
}
