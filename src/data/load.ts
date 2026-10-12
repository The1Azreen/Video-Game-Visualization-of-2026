import { z } from "zod";
import {
  DomainFile,
  EventsFile,
  SourcesFile,
  YearsFile,
  type IndustryEvent,
  type Source,
  type YearEntry,
} from "./schema";

// The single place the app touches storage. Today it reads static JSON from
// /public/data; to move to a hosted API later, point DATA_ROOT at the API
// (e.g. VITE_DATA_ROOT=https://api.example.com/v1) and keep the same paths.
const DATA_ROOT = import.meta.env.VITE_DATA_ROOT ?? `${import.meta.env.BASE_URL}data`;

async function getJson<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> {
  const res = await fetch(`${DATA_ROOT}/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) throw new Error(`${path} failed validation:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export interface YearData {
  consoles: DomainFile;
  sales: DomainFile;
  jobs: DomainFile;
  context: DomainFile;
  events: IndustryEvent[];
  sources: Map<string, Source>;
}

export function loadYears(): Promise<YearEntry[]> {
  return getJson("years.json", YearsFile).then((f) => f.years);
}

export async function loadYear(year: number): Promise<YearData> {
  const [consoles, sales, jobs, context, events, sources] = await Promise.all([
    getJson(`${year}/consoles.json`, DomainFile),
    getJson(`${year}/sales.json`, DomainFile),
    getJson(`${year}/jobs.json`, DomainFile),
    getJson(`${year}/context.json`, DomainFile),
    getJson(`${year}/events.json`, EventsFile),
    getJson("sources.json", SourcesFile),
  ]);
  const sourceMap = new Map(sources.sources.map((s) => [s.id, s]));

  // Fail loudly on a dangling citation rather than rendering an unsourced number.
  const cited = [...consoles.observations, ...sales.observations, ...jobs.observations, ...context.observations, ...events.events];
  const missing = cited.map((o) => o.sourceId).filter((id) => !sourceMap.has(id));
  if (missing.length) throw new Error(`Unknown sourceId(s): ${[...new Set(missing)].join(", ")}`);

  return { consoles, sales, jobs, context, events: events.events, sources: sourceMap };
}
