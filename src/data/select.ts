import type { DomainFile, Observation } from "./schema";

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export function quarterPeriods(year: number): string[] {
  return QUARTERS.map((q) => `${year}-${q}`);
}

export function find(file: DomainFile, metric: string, entity: string, period: string): Observation | undefined {
  return file.observations.find((o) => o.metric === metric && o.entity === entity && o.period === period);
}

/** One observation per period (undefined where the entity has no data, e.g. pre-launch). */
export function series(file: DomainFile, metric: string, entity: string, periods: string[]): (Observation | undefined)[] {
  return periods.map((p) => find(file, metric, entity, p));
}

export function sum(obs: (Observation | undefined)[]): number {
  return obs.reduce((acc, o) => acc + (o?.value ?? 0), 0);
}

export function pctChange(from: number, to: number): number {
  return ((to - from) / from) * 100;
}
