import { useCallback, useEffect, useState } from "react";
import { loadYear, type YearData } from "../data/load";
import { find, pctChange, quarterPeriods, series, sum } from "../data/select";
import type { DomainFile, Observation } from "../data/schema";
import { Chart } from "../components/Chart";
import { Section, StatTile, SourceLink } from "../components/bits";
import { LongView } from "./LongView";
import { Waffle } from "../components/Waffle";
import { barItem, baseGrid, categoryAxis, legend, tooltip, valueAxis } from "../charts";
import type { Tokens } from "../theme";

const fmtM = (v: number) => `${v.toFixed(2).replace(/\.?0+$/, "")}M`;
const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v}%`;
const fmtB = (v: number) => `$${v}B`;
const fmtInt = (v: number) => v.toLocaleString("en-US");

export function YearDashboard({ year }: { year: number }) {
  const [data, setData] = useState<YearData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    loadYear(year).then(setData, (e: Error) => setError(e.message));
  }, [year]);

  if (error) return <pre className="card error">Could not load {year} data:{"\n"}{error}</pre>;
  if (!data) return <p className="loading">Loading {year}…</p>;
  return <Dashboard year={year} d={data} />;
}

function Dashboard({ year, d }: { year: number; d: YearData }) {
  const src = (o?: Observation) => (o ? d.sources.get(o.sourceId) : undefined);
  const q = quarterPeriods(year);
  const qLabels = q.map((p) => p.slice(5));
  const get = (f: DomainFile, metric: string, entity: string, period: string) => find(f, metric, entity, period);

  // ---- headline figures
  const global = get(d.sales, "global_content_spend", "Global", `${year}`);
  const layoffs = get(d.jobs, "layoffs", "Satvat tracker", `${year}`);
  const layoffsPrev = get(d.jobs, "layoffs", "Satvat tracker", `${year - 1}`);
  const layoffsBall = get(d.jobs, "layoffs", "Ball / Epyllion", `${year}`);
  const layoffsCum = d.jobs.observations.find((o) => o.metric === "layoffs_cumulative");
  const funding = get(d.jobs, "private_funding_yoy_pct", "Global", `${year}`);
  const outsourcing = get(d.jobs, "outsourcing_share_pct", "Global", `${year}`);
  const usTotal = get(d.sales, "us_spend_total", "US", `${year}`);
  const usTotalPrev = get(d.sales, "us_spend_total", "US", `${year - 1}`);
  const usPhysical = get(d.sales, "us_physical_spend", "US", `${year}`);
  const usMobile = get(d.sales, "us_mobile_spend", "US", `${year}`);
  const usContent = get(d.sales, "us_spend", "Content", `${year}`);
  const usHw = get(d.sales, "us_spend", "Hardware", `${year}`);
  const usHwPrev = get(d.sales, "us_spend", "Hardware", `${year - 1}`);

  const layoffHistory = d.jobs.observations
    .filter((o) => o.metric === "layoffs" && o.entity === "Ball / Epyllion")
    .sort((a, b) => a.period.localeCompare(b.period));
  const layoffOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 24 },
      tooltip: tooltip(t, d.sources, fmtInt),
      xAxis: categoryAxis(t, layoffHistory.map((o) => o.period)),
      yAxis: valueAxis(t, (v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)),
      series: [
        {
          name: "Layoffs",
          type: "bar",
          barMaxWidth: 56,
          // Emphasis: the dashboard's year in the accent color, history in neutral.
          data: layoffHistory.map((o) => {
            const c = o.period === `${year}` ? t.ramp[1] : t.neutral;
            return { ...barItem(t, o), itemStyle: { color: c, borderRadius: [4, 4, 0, 0] } };
          }),
          label: { show: true, position: "top", color: t.textSecondary, formatter: (p: { value: number }) => fmtInt(p.value) },
        },
      ],
    }),
    [d],
  );

  // ---- consoles
  const hwEntities = ["PS5", "Switch 2", "Switch"];
  const hw = Object.fromEntries(hwEntities.map((e) => [e, series(d.consoles, "hw_units", e, q)]));
  const ps5Year = sum(hw["PS5"]);
  const sw2Year = sum(hw["Switch 2"]);
  const ps5Base = get(d.consoles, "installed_base", "PS5", `${year}-Q4`);
  const steamPeak = d.consoles.observations
    .filter((o) => o.metric === "steam_peak_ccu")
    .reduce<Observation | undefined>((best, o) => (!best || o.value > best.value ? o : best), undefined);

  const hwOption = useCallback(
    (t: Tokens) => ({
      color: hwEntities.map(t.entity),
      grid: baseGrid(),
      legend: legend(t),
      tooltip: tooltip(t, d.sources, fmtM),
      xAxis: categoryAxis(t, qLabels),
      yAxis: valueAxis(t, (v) => `${v}M`),
      series: hwEntities.map((e) => ({
        name: e,
        type: "bar",
        barMaxWidth: 22,
        barGap: "15%",
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: hw[e].map((o) => barItem(t, o)),
      })),
    }),
    [d],
  );

  const xboxOption = (entity: string) => (t: Tokens) => ({
    grid: { ...baseGrid(), top: 12 },
    tooltip: tooltip(t, d.sources, fmtPct),
    xAxis: categoryAxis(t, qLabels),
    yAxis: { ...valueAxis(t, (v) => `${v}%`), min: -40, max: 20 },
    series: [
      {
        name: entity,
        type: "bar",
        barMaxWidth: 28,
        color: t.entity("Xbox"),
        data: series(d.consoles, "rev_yoy_pct", entity, q).map((o) => ({
          ...barItem(t, o),
          itemStyle: { borderRadius: (o?.value ?? 0) < 0 ? [0, 0, 4, 4] : [4, 4, 0, 0] },
        })),
        label: { show: true, position: "outside", color: t.textSecondary, fontSize: 11, formatter: (p: { value: number }) => fmtPct(p.value) },
      },
    ],
  });
  const xboxHwOption = useCallback(xboxOption("Xbox hardware"), [d]);
  const xboxCsOption = useCallback(xboxOption("Xbox content & services"), [d]);

  // ---- sales
  const platforms = ["Mobile & other", "Console", "PC"];
  const platformObs = platforms.map((p) => get(d.sales, "platform_spend", p, `${year}`));
  const platformOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 8, right: 56 },
      tooltip: { ...tooltip(t, d.sources, fmtB), axisPointer: { type: "none" } },
      yAxis: { ...categoryAxis(t, platforms), inverse: true },
      xAxis: valueAxis(t, (v) => `$${v}B`),
      series: [
        {
          name: "Player spending",
          type: "bar",
          barMaxWidth: 22,
          color: t.entity("default"),
          itemStyle: { borderRadius: [0, 4, 4, 0] },
          data: platformObs.map((o) => barItem(t, o)),
          label: { show: true, position: "right", color: t.textSecondary, formatter: (p: { value: number }) => fmtB(p.value) },
        },
      ],
    }),
    [d],
  );

  // Physical share is the complement of the reported digital share, so it's derived.
  const split = (entity: string) => {
    const digital = series(d.sales, "digital_share_pct", entity, q);
    const physical = digital.map((o): Observation | undefined =>
      o && { ...o, value: Number((100 - o.value).toFixed(1)), confidence: "derived", note: "100% minus the reported digital share." },
    );
    return { digital, physical };
  };
  const psSplit = split("PlayStation");
  const ninSplit = split("Nintendo");
  const physicalWins = (s: ReturnType<typeof split>) => q.filter((_, i) => (s.physical[i]?.value ?? 0) > 50).map((p) => p.slice(5));

  // Digital vs physical is a format comparison, not an entity one: digital takes
  // the accent, physical the neutral, the same in every chart (and the waffle).
  const splitOption = (s: ReturnType<typeof split>, digitalName: string) => (t: Tokens) => ({
    grid: { ...baseGrid(), top: 40, right: 36 },
    legend: { ...legend(t), data: [digitalName, "Physical"] },
    tooltip: tooltip(t, d.sources, (v) => `${v}%`),
    xAxis: categoryAxis(t, qLabels),
    yAxis: { ...valueAxis(t, (v) => `${v}%`), max: 100 },
    series: [
      {
        name: digitalName,
        type: "bar",
        stack: "format",
        barMaxWidth: 44,
        color: t.ramp[1],
        itemStyle: { borderColor: t.surface, borderWidth: 1 },
        data: s.digital.map((o) => barItem(t, o)),
        label: { show: true, color: "#ffffff", fontWeight: 600, formatter: (p: { value: number }) => `${p.value}%` },
        // 50% line: above it, physical outsold digital that quarter
        markLine: {
          silent: true,
          z: 10,
          symbol: "none",
          lineStyle: { color: t.textPrimary, type: "solid", width: 1, opacity: 0.6 },
          label: { show: true, position: "end", color: t.textSecondary, fontSize: 10, formatter: "50%" },
          data: [{ yAxis: 50 }],
        },
      },
      {
        name: "Physical",
        type: "bar",
        stack: "format",
        barMaxWidth: 44,
        color: t.neutral,
        itemStyle: { borderColor: t.surface, borderWidth: 1, borderRadius: [4, 4, 0, 0] },
        data: s.physical.map((o) => ({ ...barItem(t, o), itemStyle: { decal: undefined } })),
        label: { show: true, color: "#ffffff", formatter: (p: { value: number }) => `${p.value}%` },
      },
    ],
  });
  const psSplitOption = useCallback(splitOption(psSplit, "Digital"), [d]);
  const ninSplitOption = useCallback(splitOption(ninSplit, "Digital*"), [d]);
  const ninPhysicalWins = physicalWins(ninSplit);
  const psDigitalAvg = sum(psSplit.digital) / psSplit.digital.filter(Boolean).length;
  const usDigital = usContent && usPhysical ? Number((usContent.value - usPhysical.value).toFixed(1)) : null;

  const usedSources = [...new Set([...d.consoles.observations, ...d.sales.observations, ...d.jobs.observations, ...d.context.observations, ...d.events].map((o) => o.sourceId))]
    .map((id) => d.sources.get(id)!)
    .sort((a, b) => a.publisher.localeCompare(b.publisher));

  return (
    <>
      <div className="tiles hero">
        {global && (
          <StatTile label="Global player spending on games" value={fmtB(global.value)} delta="+5.3% vs 2024" deltaTone="up" confidence={global.confidence} source={src(global)} />
        )}
        {layoffs && layoffsPrev && (
          <StatTile
            label="Industry layoffs"
            value={`~${fmtInt(layoffs.value)}`}
            delta={`${pctChange(layoffsPrev.value, layoffs.value).toFixed(0)}% vs ${fmtInt(layoffsPrev.value)} in ${year - 1}`}
            deltaTone="down"
            confidence={layoffs.confidence}
            source={src(layoffs)}
          />
        )}
        <StatTile label="Switch 2 shipped in launch year" value={fmtM(sw2Year)} detail="Jun–Dec; fastest-selling Nintendo platform" confidence="reported" source={src(hw["Switch 2"][3])} />
        {usPhysical && (
          <StatTile label="US physical game spending" value={fmtB(usPhysical.value)} delta="−11%, record low" deltaTone="down" confidence={usPhysical.confidence} source={src(usPhysical)} />
        )}
      </div>

      <Section id="jobs" title="Jobs" lede="Layoffs fell sharply from 2024's peak but stayed historically high, while studio funding dried up and more work shifted to outsourcers.">
        <div className="tiles">
          {layoffs && <StatTile label={`Layoffs ${year} · Satvat`} value={fmtInt(layoffs.value)} confidence={layoffs.confidence} source={src(layoffs)} />}
          {layoffsBall && <StatTile label={`Layoffs ${year} · Ball`} value={fmtInt(layoffsBall.value)} detail={layoffsBall.note} confidence={layoffsBall.confidence} source={src(layoffsBall)} />}
          {layoffsCum && <StatTile label={`Layoffs ${layoffsCum.period.replace("-", "–")}`} value={`~${fmtInt(layoffsCum.value)}`} detail={layoffsCum.note} confidence={layoffsCum.confidence} source={src(layoffsCum)} />}
          {funding && <StatTile label="Private studio funding" value={`${funding.value}%`} detail="year over year" confidence={funding.confidence} source={src(funding)} />}
          {outsourcing && <StatTile label="Content spend outsourced" value={`${outsourcing.value}%`} detail={outsourcing.note} confidence={outsourcing.confidence} source={src(outsourcing)} />}
        </div>
        <Chart
          title="Games industry layoffs by year"
          subtitle="Gross reported layoffs. 2022–2024 were each a record at the time."
          height={240}
          option={layoffOption}
          table={{ columns: ["Year", "Layoffs", "Note"], rows: layoffHistory.map((o) => [o.period, fmtInt(o.value), o.note ?? ""]) }}
          footnote="Matthew Ball / Epyllion, from Farhan Noor and Amir Satvat's trackers."
        />
        <p className="note">{d.jobs.notes}</p>
      </Section>

      <Section id="consoles" title="Console makers" lede="Switch 2 had a record launch and PS5 had a strong holiday quarter, while Xbox hardware revenue fell every quarter as Microsoft leaned on content and Game Pass.">
        <div className="tiles">
          <StatTile label={`PS5 shipped in ${year}`} value={fmtM(Number(ps5Year.toFixed(1)))} detail="Sum of calendar quarters; Q3 derived" confidence="derived" source={src(hw["PS5"][3])} />
          {ps5Base && <StatTile label="PS5 lifetime shipments" value={fmtM(ps5Base.value)} detail="as of Dec 31" confidence={ps5Base.confidence} source={src(ps5Base)} />}
          <StatTile label="Switch 2 shipments" value={fmtM(sw2Year)} detail="Jun 5 launch to Dec 31" confidence="reported" source={src(hw["Switch 2"][3])} />
          {steamPeak && <StatTile label="Steam peak concurrent users" value={fmtM(steamPeak.value)} detail={steamPeak.note} confidence={steamPeak.confidence} source={src(steamPeak)} />}
        </div>
        <Chart
          title="Console hardware shipments by quarter"
          subtitle={`Millions of units shipped to retail, calendar ${year}. Hatched = derived.`}
          option={hwOption}
          table={{ columns: ["Quarter", ...hwEntities], rows: q.map((p, i) => [p, ...hwEntities.map((e) => hw[e][i]?.value ?? "—")]) }}
          footnote={d.consoles.notes}
        />
        <div className="pair">
          <Chart
            title="Xbox hardware revenue"
            subtitle="Change vs same quarter a year earlier"
            height={220}
            option={xboxHwOption}
            table={{ columns: ["Quarter", "YoY"], rows: series(d.consoles, "rev_yoy_pct", "Xbox hardware", q).map((o, i) => [q[i], o ? fmtPct(o.value) : "—"]) }}
          />
          <Chart
            title="Xbox content & services revenue"
            subtitle="Change vs same quarter a year earlier"
            height={220}
            option={xboxCsOption}
            table={{ columns: ["Quarter", "YoY"], rows: series(d.consoles, "rev_yoy_pct", "Xbox content & services", q).map((o, i) => [q[i], o ? fmtPct(o.value) : "—"]) }}
          />
        </div>
        <p className="note">Microsoft does not publish console unit sales, only revenue change, so Xbox can't appear in the shipments chart.</p>
      </Section>

      <Section id="sales" title="Sales: physical vs digital" lede="Spending hit a record, but the money is in mobile, PC and subscriptions. US physical game sales fell to their lowest level since tracking began.">
        <div className="pair">
          <Chart
            title="Global player spending by platform"
            subtitle={`USD billions, ${year}, Matthew Ball estimates. Hatched = derived (global minus console and PC).`}
            height={200}
            option={platformOption}
            table={{ columns: ["Platform", "USD B", "Confidence"], rows: platformObs.map((o, i) => [platforms[i], o?.value ?? "—", o?.confidence ?? "—"]) }}
          />
          <div className="tiles compact">
            {usTotal && usTotalPrev && (
              <StatTile label="US total spending" value={fmtB(usTotal.value)} delta={`+${pctChange(usTotalPrev.value, usTotal.value).toFixed(1)}% vs ${year - 1}`} deltaTone="up" confidence={usTotal.confidence} source={src(usTotal)} />
            )}
            {usContent && <StatTile label="US content (games, DLC, subs, mobile)" value={fmtB(usContent.value)} confidence={usContent.confidence} source={src(usContent)} />}
            {usHw && usHwPrev && (
              <StatTile label="US hardware" value={fmtB(usHw.value)} delta={`+${pctChange(usHwPrev.value, usHw.value).toFixed(0)}% vs ${year - 1}`} deltaTone="up" confidence={usHw.confidence} source={src(usHw)} />
            )}
            {usMobile && <StatTile label="US mobile game spending" value={fmtB(usMobile.value)} detail="Half of all US content spend" confidence={usMobile.confidence} source={src(usMobile)} />}
          </div>
        </div>
        {usDigital !== null && usContent && usPhysical && (
          <Waffle
            title={`In the US, physical is now about ${Math.round((usPhysical.value / usContent.value) * 100)}¢ of every game-content dollar`}
            subtitle={`US consumer spending on game content, ${year}. Each square is 1%.`}
            parts={[
              { label: "Digital*", value: Number(((usDigital / usContent.value) * 100).toFixed(1)), detail: `${fmtB(usDigital)} · content total minus physical`, tone: "accent" },
              { label: "Physical (discs & cartridges)", value: Number(((usPhysical.value / usContent.value) * 100).toFixed(1)), detail: `${fmtB(usPhysical.value)} · record low, −11% vs ${year - 1}`, tone: "neutral" },
            ]}
            footnote={<>*Digital here also includes DLC, microtransactions, subscriptions and mobile games — everything in ESA/Circana's "content" except physical copies.</>}
            confidence="derived"
            source={src(usContent)}
          />
        )}
        <div className="pair">
          <Chart
            title="PlayStation: digital vs physical"
            subtitle={`Share of PS4+PS5 full-game units. Digital averaged ${psDigitalAvg.toFixed(0)}% in ${year}.`}
            height={240}
            option={psSplitOption}
            table={{ columns: ["Quarter", "Digital %", "Physical % (derived)"], rows: q.map((p, i) => [p, psSplit.digital[i]?.value ?? "—", psSplit.physical[i]?.value ?? "—"]) }}
            footnote="Full games only: Sony's ratio counts game units, so DLC and microtransactions are not included."
          />
          <Chart
            title="Nintendo: digital vs physical"
            subtitle={
              ninPhysicalWins.length
                ? `Share of software sales. Physical outsold digital in ${ninPhysicalWins.join(", ")} as Switch 2 launched.`
                : "Share of software sales."
            }
            height={240}
            option={ninSplitOption}
            table={{
              columns: ["Quarter", "Digital* %", "Physical % (derived)", "Digital sales (¥B)"],
              rows: q.map((p, i) => [p, ninSplit.digital[i]?.value ?? "—", ninSplit.physical[i]?.value ?? "—", get(d.sales, "digital_sales", "Nintendo", p)?.value ?? "—"]),
            }}
            footnote="*Digital also includes DLC/add-on content, microtransactions and Nintendo Switch Online. Measured by revenue (yen)."
          />
        </div>
        <p className="note">
          The two charts measure different things (units vs revenue, full games vs everything digital), so compare each company's trend rather than the two against each other. Holiday quarters lean physical
          because more games are bought as gifts.
        </p>
      </Section>

      <LongView d={d} />

      <Section id="timeline" title="Timeline" lede={`Key events that shaped ${year}.`}>
        <ol className="card timeline">
          {d.events.map((e) => (
            <li key={e.date + e.title}>
              <time>{formatDate(e.date)}</time>
              <span className={`cat ${e.category}`}>{e.category}</span>
              <span className="ev">{e.title}</span>
              <SourceLink source={d.sources.get(e.sourceId)!} />
            </li>
          ))}
        </ol>
      </Section>

      <Section id="sources" title="Sources" lede="Every number above links back to one of these. Primary = the company or report itself; secondary = press coverage of it.">
        <ul className="card sources">
          {usedSources.map((s) => (
            <li key={s.id}>
              <span className={`badge ${s.kind}`}>{s.kind}</span>
              <a href={s.url} target="_blank" rel="noreferrer">{s.publisher}</a>
              <span className="muted"> — {s.title}{s.published ? ` (${s.published})` : ""}</span>
              {s.note && <div className="muted small">{s.note}</div>}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function formatDate(iso: string) {
  const [y, m, day] = iso.split("-").map(Number);
  const month = new Date(y, m - 1).toLocaleString("en-US", { month: "short" });
  return day ? `${month} ${day}` : month;
}
