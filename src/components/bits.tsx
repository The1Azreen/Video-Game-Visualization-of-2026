import type { ReactNode } from "react";
import type { Confidence, Source } from "../data/schema";

export function Section({ id, title, lede, children }: { id: string; title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="section">
      <h2>{title}</h2>
      <p className="lede">{lede}</p>
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  delta,
  deltaTone,
  detail,
  confidence,
  source,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  detail?: ReactNode;
  confidence: Confidence;
  source?: Source;
}) {
  return (
    <div className="card tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {delta && (
        <div className={`tile-delta ${deltaTone ?? "neutral"}`}>
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
