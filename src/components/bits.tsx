import { useState, type ReactNode } from "react";
import type { Confidence, Source } from "../data/schema";

/** A retro "window": title bar with a collapse button, lede, then content. */
export function Section({ id, title, lede, children }: { id: string; title: string; lede?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section id={id} className={`window section${open ? "" : " collapsed"}`} aria-labelledby={`${id}-title`}>
      <div className="title">
        <h2 id={`${id}-title`}>{title}</h2>
        <span className="tb">
          <button type="button" aria-expanded={open} aria-controls={`${id}-body`} title={open ? "Minimize" : "Restore"} onClick={() => setOpen(!open)}>
            {open ? "_" : "□"}
          </button>
        </span>
      </div>
      <div className="content" id={`${id}-body`}>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  delta,
  deltaTone,
  deltaBad,
  detail,
  confidence,
  source,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  /** Color the delta as bad news regardless of direction (e.g. rising layoffs). */
  deltaBad?: boolean;
  detail?: ReactNode;
  confidence: Confidence;
  source?: Source;
}) {
  const tone = deltaBad ? "bad" : deltaTone === "up" ? "good" : deltaTone === "down" ? "bad" : "";
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {delta && (
        <div className={`tile-delta ${tone}`}>
          <span aria-hidden>{deltaTone === "up" ? "▲" : deltaTone === "down" ? "▼" : "■"}</span> {delta}
        </div>
      )}
      {detail && <div className="tile-detail">{detail}</div>}
      <div className="tile-meta">
        <ConfidenceBadge c={confidence} />
        {source && <SourceLink source={source} />}
      </div>
    </div>
  );
}

export function ConfidenceBadge({ c }: { c: Confidence }) {
  return <span className={`badge ${c}`}>{c}</span>;
}

export function SourceLink({ source }: { source: Source }) {
  return (
    <a className="src" href={source.url} target="_blank" rel="noreferrer" title={source.title}>
      {source.publisher}
    </a>
  );
}
