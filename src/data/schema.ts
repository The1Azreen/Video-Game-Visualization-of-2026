import { z } from "zod";

// "reported" = stated in a filing/report, "estimate" = analyst/tracker figure,
// "derived" = our own arithmetic on reported numbers (explained in `note`).
export const Confidence = z.enum(["reported", "estimate", "derived"]);
export type Confidence = z.infer<typeof Confidence>;

export const Observation = z.object({
  metric: z.string(),
  entity: z.string(),
  // "2025", "2025-Q3", "2025-10", or a range like "2022-2025"
  period: z.string().regex(/^\d{4}(-Q[1-4]|-\d{2}|-\d{4})?$/),
  value: z.number(),
  unit: z.string(),
  sourceId: z.string(),
  confidence: Confidence,
  note: z.string().optional(),
});
export type Observation = z.infer<typeof Observation>;

export const DomainFile = z.object({
  domain: z.string(),
  /** One-line summary shown under the section heading. */
  lede: z.string().optional(),
  notes: z.string().optional(),
  observations: z.array(Observation),
});
export type DomainFile = z.infer<typeof DomainFile>;

export const IndustryEvent = z.object({
  date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  category: z.enum(["platform", "pricing", "jobs", "deals", "release"]),
  title: z.string(),
  sourceId: z.string(),
});
export type IndustryEvent = z.infer<typeof IndustryEvent>;

export const EventsFile = z.object({
  domain: z.literal("events"),
  events: z.array(IndustryEvent),
});

export const Source = z.object({
  id: z.string(),
  publisher: z.string(),
  title: z.string(),
  url: z.url(),
  published: z.string().optional(),
  kind: z.enum(["primary", "secondary"]),
  note: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

export const SourcesFile = z.object({ sources: z.array(Source) });

export const YearEntry = z.object({
  year: z.number().int(),
  status: z.enum(["complete", "in-progress", "planned"]),
  label: z.string(),
  asOf: z.string().nullable(),
});
export type YearEntry = z.infer<typeof YearEntry>;

export const YearsFile = z.object({ years: z.array(YearEntry) });
