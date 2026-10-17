import { useCallback, useEffect, useState } from "react";
import { loadYear, type YearData } from "../data/load";
import { find, pctChange, quarterPeriods, series, sum } from "../data/select";
import type { DomainFile, Observation, YearEntry } from "../data/schema";
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

// "Jan–Jun" for a year whose last reported calendar quarter is Q2.
const SPAN = ["Jan–Mar", "Jan–Jun", "Jan–Sep", "Jan–Dec"];
const QUARTER_END = ["Mar 31", "Jun 30", "Sep 30", "Dec 31"];

export function YearDashboard({ entry }: { entry: YearEntry }) {
  const [data, setData] = useState<YearData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    loadYear(entry.year).then(setData, (e: Error) => setError(e.message));
  }, [entry.year]);

  if (error) return <pre className="window error">Could not load {entry.year} data:{"\n"}{error}</pre>;
  if (!data) return <p className="loading">Loading {entry.year}…</p>;
  return <Dashboard entry={entry} d={data} />;
}

function WipNotice({ entry, span }: { entry: YearEntry; span: string }) {
  return (
    <section className="window notice" role="note" aria-labelledby="wip-title">
      <div className="title">
        <h2 id="wip-title">Work in progress</h2>
      </div>
      <div className="content">
        <p>
          <b>{entry.year} isn't over yet, so this tab is still being filled in.</b> Company results cover calendar {span} {entry.year}; trackers (layoffs, Steam) run to{" "}
          {entry.asOf}. Jul–Sep earnings arrive from late October, and full-year totals such as global and US annual spending aren't published until early {entry.year + 1}.
        </p>
        <p className="dim small">Charts leave quarters that haven't been reported yet empty. Numbers will change as the year closes.</p>
      </div>
    </section>
  );
}

function Dashboard({ entry, d }: { entry: YearEntry; d: YearData }) {
  const year = entry.year;
  const ytd = entry.status === "in-progress";
  const src = (o?: Observation) => (o ? d.sources.get(o.sourceId) : undefined);
  const q = quarterPeriods(year);
  const qLabels = q.map((p) => p.slice(5));
  const get = (f: DomainFile, metric: string, entity: string, period: string) => find(f, metric, entity, period);

  // Last calendar quarter with any hardware data, so YTD labels say how far the year runs.
  const lastQ = Math.max(0, ...q.map((p, i) => (d.consoles.observations.some((o) => o.period === p) ? i : 0)));
  const span = SPAN[lastQ];
  const pending = ytd && lastQ < 3 ? ` Q${lastQ + 2}–Q4 not reported yet.` : "";

  // ---- headline figures
  const global = get(d.sales, "global_content_spend", "Global", `${year}`);
  const layoffs = get(d.jobs, "layoffs", "Satvat tracker", `${year}`);
  const layoffsPrev = get(d.jobs, "layoffs", "Satvat tracker", `${year - 1}`);
  const layoffsBall = get(d.jobs, "layoffs", "Ball / Epyllion", `${year}`);
  const layoffsProj = get(d.jobs, "layoffs_projection", "Satvat tracker", `${year}`);
  const layoffsCum = d.jobs.observations.find((o) => o.metric === "layoffs_cumulative");
  const funding = get(d.jobs, "private_funding_yoy_pct", "Global", `${year}`);
  const outsourcing = get(d.jobs, "outsourcing_share_pct", "Global", `${year}`);
  const usTotal = get(d.sales, "us_spend_total", "US", `${year}`);
  const usTotalPrev = get(d.sales, "us_spend_total", "US", `${year - 1}`);
  const usH1 = get(d.sales, "us_spend_total_h1", "US", `${year}`);
  const usContentH1 = get(d.sales, "us_content_h1", "US", `${year}`);
  const usPhysical = get(d.sales, "us_physical_spend", "US", `${year}`);
  const usMobile = get(d.sales, "us_mobile_spend", "US", `${year}`);
  const usContent = get(d.sales, "us_spend", "Content", `${year}`);
  const usHw = get(d.sales, "us_spend", "Hardware", `${year}`);
  const usHwPrev = get(d.sales, "us_spend", "Hardware", `${year - 1}`);

  // Ball's yearly totals; a year still in progress takes the tracker's year-to-date count instead.
  const layoffHistory = d.jobs.observations
    .filter((o) => o.metric === "layoffs" && o.entity === "Ball / Epyllion")
    .concat(!layoffsBall && layoffs ? [layoffs] : [])
    .sort((a, b) => a.period.localeCompare(b.period));
  const layoffLabel = (o: Observation) => (ytd && o.period === `${year}` ? `${year} YTD` : o.period);
  const projRest: Observation | undefined =
    ytd && layoffs && layoffsProj
      ? { ...layoffsProj, value: layoffsProj.value - layoffs.value, confidence: "derived", note: `Tracker's full-year projection (${fmtInt(layoffsProj.value)}) minus the year-to-date count.` }
      : undefined;
  const layoffOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 24 },
      legend: projRest ? { ...legend(t), data: ["Layoffs", "Projected rest of year"] } : undefined,
      tooltip: tooltip(t, d.sources, fmtInt),
      xAxis: categoryAxis(t, layoffHistory.map(layoffLabel)),
      yAxis: valueAxis(t, (v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)),
      series: [
        {
          name: "Layoffs",
          type: "bar",
          stack: "layoffs",
          barMaxWidth: 56,
          color: t.ramp[1],
          // Emphasis: the dashboard's year in the accent color, history in neutral.
          data: layoffHistory.map((o) => {
            const c = o.period === `${year}` ? t.ramp[1] : t.neutral;
            return { ...barItem(t, o), itemStyle: { color: c } };
          }),
          label: {
            show: true,
            position: projRest ? "inside" : "top",
            color: t.textSecondary,
            formatter: (p: { value: number; dataIndex: number }) =>
              projRest && p.dataIndex === layoffHistory.length - 1 ? "" : fmtInt(p.value),
          },
        },
        ...(projRest
          ? [
              {
                name: "Projected rest of year",
                type: "bar",
                stack: "layoffs",
                barMaxWidth: 56,
                color: t.axis,
                data: layoffHistory.map((o) => (o.period === `${year}` ? { ...barItem(t, projRest), itemStyle: { ...barItem(t, projRest).itemStyle, color: t.axis, borderColor: t.ramp[1], borderWidth: 2, borderType: "dashed" } } : { value: null })),
                label: { show: true, position: "top", color: t.textSecondary, formatter: () => `${fmtInt(layoffs!.value)} → ≈${fmtInt(layoffsProj!.value)}` },
              },
            ]
          : []),
      ],
    }),
    [d],
  );

  // ---- consoles
  const hwEntities = ["PS5", "Switch 2", "Switch"];
  const hw = Object.fromEntries(hwEntities.map((e) => [e, series(d.consoles, "hw_units", e, q)]));
  const ps5Year = sum(hw["PS5"]);
  const sw2Year = sum(hw["Switch 2"]);
  const latestOf = (entity: string, metric: string) =>
    d.consoles.observations.filter((o) => o.metric === metric && o.entity === entity).sort((a, b) => b.period.localeCompare(a.period))[0];
  const ps5Base = latestOf("PS5", "installed_base");
  const sw2Base = latestOf("Switch 2", "installed_base");
  const ps5Last = hw["PS5"].filter(Boolean).at(-1);
  const sw2Last = hw["Switch 2"].filter(Boolean).at(-1);
  const steamPeak = d.consoles.observations
    .filter((o) => o.metric === "steam_peak_ccu")
    .reduce<Observation | undefined>((best, o) => (!best || o.value > best.value ? o : best), undefined);
  const asOfQuarter = (o?: Observation) => (o ? `as of ${QUARTER_END[Number(o.period.slice(-1)) - 1]}` : "");

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
        data: series(d.consoles, "rev_yoy_pct", entity, q).map((o) => barItem(t, o)),
        label: { show: true, position: "outside", color: t.textSecondary, fontSize: 12, formatter: (p: { value: number }) => fmtPct(p.value) },
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
        label: { show: true, color: t.onAccent, fontWeight: 700, formatter: (p: { value: number }) => `${p.value}%` },
        // 50% line: above it, physical outsold digital that quarter
        markLine: {
          silent: true,
          z: 10,
          symbol: "none",
          lineStyle: { color: t.textPrimary, type: "dashed", width: 1, opacity: 0.8 },
          label: { show: true, position: "end", color: t.textPrimary, fontSize: 11, formatter: "50%" },
          data: [{ yAxis: 50 }],
        },
      },
      {
        name: "Physical",
        type: "bar",
        stack: "format",
        barMaxWidth: 44,
        color: t.neutral,
        itemStyle: { borderColor: t.surface, borderWidth: 1 },
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
  const hasPlatforms = platformObs.some(Boolean);

  const usTiles = (
    <>
      {usTotal && usTotalPrev && (
        <StatTile label="US total spending" value={fmtB(usTotal.value)} delta={`+${pctChange(usTotalPrev.value, usTotal.value).toFixed(1)}% vs ${year - 1}`} deltaTone="up" confidence={usTotal.confidence} source={src(usTotal)} />
      )}
      {usH1 && <StatTile label="US total spending, Jan–Jun" value={fmtB(usH1.value)} delta={`about 1% behind ${year - 1}'s pace`} deltaTone="down" confidence={usH1.confidence} source={src(usH1)} />}
      {usContentH1 && <StatTile label="US content spending, Jan–Jun" value={fmtB(usContentH1.value)} delta={`flat vs ${year - 1}`} deltaTone="neutral" confidence={usContentH1.confidence} source={src(usContentH1)} />}
      {usContent && <StatTile label="US content (games, DLC, subs, mobile)" value={fmtB(usContent.value)} confidence={usContent.confidence} source={src(usContent)} />}
      {usHw && usHwPrev && (
        <StatTile label="US hardware" value={fmtB(usHw.value)} delta={`+${pctChange(usHwPrev.value, usHw.value).toFixed(0)}% vs ${year - 1}`} deltaTone="up" confidence={usHw.confidence} source={src(usHw)} />
      )}
      {usMobile && <StatTile label="US mobile game spending" value={fmtB(usMobile.value)} detail="Half of all US content spend" confidence={usMobile.confidence} source={src(usMobile)} />}
    </>
  );

  const usedSources = [...new Set([...d.consoles.observations, ...d.sales.observations, ...d.jobs.observations, ...d.context.observations, ...d.events].map((o) => o.sourceId))]
    .map((id) => d.sources.get(id)!)
    .sort((a, b) => a.publisher.localeCompare(b.publisher));

  return (
    <>
      {ytd && <WipNotice entry={entry} span={span} />}

      <section className="window" aria-labelledby="headline-title">
        <div className="title">
          <h2 id="headline-title">{ytd ? `${year} so far` : `${year} at a glance`}</h2>
        </div>
        <div className="content">
          <div className="tiles hero">
            {global && (
              <StatTile label="Global player spending on games" value={fmtB(global.value)} delta={global.note?.split(";")[0]} deltaTone="up" confidence={global.confidence} source={src(global)} />
            )}
            {layoffs && layoffsPrev && (
              <StatTile
                label={ytd ? "Industry layoffs so far" : "Industry layoffs"}
                value={`≈${fmtInt(layoffs.value)}`}
                delta={
                  ytd
                    ? `${pctChange(layoffsPrev.value, layoffs.value).toFixed(0)}% more than all of ${year - 1} (${fmtInt(layoffsPrev.value)})`
                    : `${pctChange(layoffsPrev.value, layoffs.value).toFixed(0)}% vs ${fmtInt(layoffsPrev.value)} in ${year - 1}`
                }
                deltaTone={layoffs.value > layoffsPrev.value ? "up" : "down"}
                deltaBad={layoffs.value > layoffsPrev.value}
                confidence={layoffs.confidence}
                source={src(layoffs)}
              />
            )}
            {ytd ? (
              <StatTile label={`Switch 2 shipped, ${span}`} value={fmtM(Number(sw2Year.toFixed(2)))} detail={sw2Base ? `${fmtM(sw2Base.value)} lifetime ${asOfQuarter(sw2Base)}` : undefined} confidence="derived" source={src(sw2Last)} />
            ) : (
              <StatTile label="Switch 2 shipped in launch year" value={fmtM(sw2Year)} detail="Jun–Dec; fastest-selling Nintendo platform" confidence="reported" source={src(hw["Switch 2"][3])} />
            )}
            {usPhysical && (
              <StatTile label="US physical game spending" value={fmtB(usPhysical.value)} delta="−11%, record low" deltaTone="down" confidence={usPhysical.confidence} source={src(usPhysical)} />
            )}
            {ytd && usH1 && <StatTile label="US game spending, Jan–Jun" value={fmtB(usH1.value)} delta={`about 1% behind ${year - 1}`} deltaTone="down" confidence={usH1.confidence} source={src(usH1)} />}
            {ytd && steamPeak && <StatTile label="Steam concurrent-user record" value={fmtM(steamPeak.value)} detail={steamPeak.note} confidence={steamPeak.confidence} source={src(steamPeak)} />}
          </div>
        </div>
      </section>

      <Section id="jobs" title="Jobs" lede={d.jobs.lede}>
        <div className="tiles">
          {layoffs && <StatTile label={`Layoffs ${year}${ytd ? " so far" : ""} · Satvat`} value={fmtInt(layoffs.value)} detail={ytd ? layoffs.note : undefined} confidence={layoffs.confidence} source={src(layoffs)} />}
          {layoffsProj && <StatTile label={`Projected for all of ${year}`} value={`≈${fmtInt(layoffsProj.value)}`} detail={layoffsProj.note} confidence={layoffsProj.confidence} source={src(layoffsProj)} />}
          {layoffsBall && <StatTile label={`Layoffs ${year} · Ball`} value={fmtInt(layoffsBall.value)} detail={layoffsBall.note} confidence={layoffsBall.confidence} source={src(layoffsBall)} />}
          {layoffsCum && <StatTile label={`Layoffs ${layoffsCum.period.replace("-", "–")}`} value={`≈${fmtInt(layoffsCum.value)}`} detail={layoffsCum.note} confidence={layoffsCum.confidence} source={src(layoffsCum)} />}
          {funding && <StatTile label="Private studio funding" value={`${funding.value}%`} detail="year over year" confidence={funding.confidence} source={src(funding)} />}
          {outsourcing && <StatTile label="Content spend outsourced" value={`${outsourcing.value}%`} detail={outsourcing.note} confidence={outsourcing.confidence} source={src(outsourcing)} />}
        </div>
        <Chart
          title="Games industry layoffs by year"
          subtitle={
            ytd
              ? `Gross reported layoffs. ${year} is year to date; the dashed segment is the tracker's projection for the rest of the year.`
              : "Gross reported layoffs. 2022–2024 were each a record at the time."
          }
          height={240}
          option={layoffOption}
          table={{
            columns: ["Year", "Layoffs", "Note"],
            rows: [
              ...layoffHistory.map((o) => [layoffLabel(o), fmtInt(o.value), o.note ?? ""]),
              ...(layoffsProj ? [[`${year} projected`, fmtInt(layoffsProj.value), layoffsProj.note ?? ""]] : []),
            ],
          }}
          footnote={ytd ? "2022–2025: Matthew Ball / Epyllion. 2026: Amir Satvat's ASGC tracker." : "Matthew Ball / Epyllion, from Farhan Noor and Amir Satvat's trackers."}
        />
        <p className="note">{d.jobs.notes}</p>
      </Section>

      <Section id="consoles" title="Console makers" lede={d.consoles.lede}>
        <div className="tiles">
          <StatTile
            label={ytd ? `PS5 shipped, ${span}` : `PS5 shipped in ${year}`}
            value={fmtM(Number(ps5Year.toFixed(1)))}
            detail={ytd ? "Sum of reported calendar quarters" : "Sum of calendar quarters; Q3 derived"}
            confidence="derived"
            source={src(ps5Last)}
          />
          {ps5Base && <StatTile label="PS5 lifetime shipments" value={fmtM(ps5Base.value)} detail={asOfQuarter(ps5Base)} confidence={ps5Base.confidence} source={src(ps5Base)} />}
          {ytd ? (
            sw2Base && <StatTile label="Switch 2 lifetime shipments" value={fmtM(sw2Base.value)} detail={asOfQuarter(sw2Base)} confidence={sw2Base.confidence} source={src(sw2Base)} />
          ) : (
            <StatTile label="Switch 2 shipments" value={fmtM(sw2Year)} detail="Jun 5 launch to Dec 31" confidence="reported" source={src(hw["Switch 2"][3])} />
          )}
          {steamPeak && <StatTile label="Steam peak concurrent users" value={fmtM(steamPeak.value)} detail={steamPeak.note} confidence={steamPeak.confidence} source={src(steamPeak)} />}
        </div>
        <Chart
          title="Console hardware shipments by quarter"
          subtitle={`Millions of units shipped to retail, calendar ${year}. Hatched = derived.${pending}`}
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

      <Section id="sales" title="Sales: physical vs digital" lede={d.sales.lede}>
        {hasPlatforms ? (
          <div className="pair">
            <Chart
              title="Global player spending by platform"
              subtitle={`USD billions, ${year}, Matthew Ball estimates. Hatched = derived (global minus console and PC).`}
              height={200}
              option={platformOption}
              table={{ columns: ["Platform", "USD B", "Confidence"], rows: platformObs.map((o, i) => [platforms[i], o?.value ?? "—", o?.confidence ?? "—"]) }}
            />
            <div className="tiles compact">{usTiles}</div>
          </div>
        ) : (
          <div className="tiles">{usTiles}</div>
        )}
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
            subtitle={`Share of PS4+PS5 full-game units. Digital averaged ${psDigitalAvg.toFixed(0)}% in ${year}${ytd ? " so far" : ""}.`}
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
                : `Share of software sales.${pending}`
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

      <Section id="timeline" title="Timeline" lede={ytd ? `Key events of ${year} so far, plus what's scheduled.` : `Key events that shaped ${year}.`}>
        <ol className="timeline">
          {d.events.map((e) => {
            const upcoming = entry.asOf !== null && e.date > entry.asOf;
            return (
              <li key={e.date + e.title} className={upcoming ? "upcoming" : undefined}>
                <time>{formatDate(e.date)}</time>
                <span className={`cat ${e.category}`}>{upcoming ? "upcoming" : e.category}</span>
                <span className="ev">{e.title}</span>
                <SourceLink source={d.sources.get(e.sourceId)!} />
              </li>
            );
          })}
        </ol>
      </Section>

      <Section id="sources" title="Sources" lede="Every number above links back to one of these. Primary = the company or report itself; secondary = press coverage of it.">
        <ul className="sources">
          {usedSources.map((s) => (
            <li key={s.id}>
              <span className={`badge ${s.kind}`}>{s.kind}</span>
              <a href={s.url} target="_blank" rel="noreferrer">{s.publisher}</a>
              <span className="dim"> — {s.title}{s.published ? ` (${s.published})` : ""}</span>
              {s.note && <div className="dim small">{s.note}</div>}
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
