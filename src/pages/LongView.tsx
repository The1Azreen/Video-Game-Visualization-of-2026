import { useCallback } from "react";
import type { YearData } from "../data/load";
import type { Observation } from "../data/schema";
import { Chart } from "../components/Chart";
import { Section, StatTile } from "../components/bits";
import { barItem, baseGrid, categoryAxis, legend, lineItem, tooltip, valueAxis } from "../charts";
import type { Tokens } from "../theme";

// Long-run context from Matthew Ball's "State of Video Gaming" deck. Single-series
// charts use emphasis (one accent bar, the rest neutral) rather than extra hues.

const by = (obs: Observation[], metric: string) => obs.filter((o) => o.metric === metric);

/** barItem plus a fill color, keeping the derived-value hatch. */
function fill(t: Tokens, o: Observation | undefined, color: string) {
  const item = barItem(t, o);
  return { ...item, itemStyle: { ...item.itemStyle, color } };
}

const fmtSignedB = (v: number) => `${v < 0 ? "−" : "+"}$${Math.abs(v)}B`;
const fmtInt = (v: number) => v.toLocaleString("en-US");

export function LongView({ d }: { d: YearData }) {
  const obs = d.context.observations;
  const src = d.sources.get("ball-2025");

  const growth = by(obs, "growth_since_2011").sort((a, b) => b.value - a.value);
  const realSpend = by(obs, "real_content_spend");
  const releases = by(obs, "steam_releases");
  const perMau = by(obs, "steam_games_per_mau");
  const playtime = by(obs, "playtime_share_2023").sort((a, b) => b.value - a.value);
  const hours = by(obs, "monthly_hours").sort((a, b) => b.value - a.value);

  const steamYears = [...new Set(by(obs, "steam_playtime_share").map((o) => o.period))].sort();
  // Bottom-to-top stack order; game age is ordered, so it takes the ordinal ramp.
  const ageBuckets = ["Valve first-party", "8+ years old", "1-7 years old", "Released that year"];
  const steamShare = (entity: string) =>
    steamYears.map((y) => obs.find((o) => o.metric === "steam_playtime_share" && o.entity === entity && o.period === y));

  const newShare = playtime.find((o) => o.entity === "New games released in 2023");
  const peak = realSpend.find((o) => o.period === "2021");
  const latest = realSpend.find((o) => o.period === "2024");

  const growthOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 8, right: 64 },
      tooltip: { ...tooltip(t, d.sources, fmtSignedB), axisPointer: { type: "none" } },
      yAxis: { ...categoryAxis(t, growth.map((o) => o.entity)), inverse: true },
      xAxis: valueAxis(t, (v) => (v < 0 ? `−$${-v}B` : `$${v}B`)),
      series: [
        {
          name: "Change in yearly spend",
          type: "bar",
          barMaxWidth: 20,
          data: growth.map((o) => ({
            ...fill(t, o, o.value >= 0 ? t.ramp[1] : t.negative),
            itemStyle: { color: o.value >= 0 ? t.ramp[1] : t.negative },
          })),
          label: { show: true, position: "right", color: t.textSecondary, formatter: (p: { value: number }) => fmtSignedB(p.value) },
        },
      ],
    }),
    [d],
  );

  const realOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 24 },
      tooltip: tooltip(t, d.sources, (v) => `$${v}B`),
      xAxis: categoryAxis(t, realSpend.map((o) => o.period)),
      yAxis: valueAxis(t, (v) => `$${v}B`),
      series: [
        {
          name: "Real spend (2024 dollars)",
          type: "bar",
          barMaxWidth: 48,
          data: realSpend.map((o) => ({ ...fill(t, o, o.period === "2024" ? t.ramp[1] : t.neutral), itemStyle: { color: o.period === "2024" ? t.ramp[1] : t.neutral } })),
          label: { show: true, position: "top", color: t.textSecondary, formatter: (p: { value: number }) => `$${p.value}B` },
        },
      ],
    }),
    [d],
  );

  const steamOption = useCallback(
    (t: Tokens) => {
      const colors: Record<string, string> = {
        "Released that year": t.ramp[0],
        "1-7 years old": t.ramp[1],
        "8+ years old": t.ramp[2],
        "Valve first-party": t.neutral,
      };
      return {
        grid: { ...baseGrid(), top: 40 },
        legend: { ...legend(t), data: [...ageBuckets].reverse() },
        tooltip: tooltip(t, d.sources, (v) => `${v}%`),
        xAxis: categoryAxis(t, steamYears),
        yAxis: { ...valueAxis(t, (v) => `${v}%`), max: 100 },
        series: ageBuckets.map((e) => ({
          name: e,
          type: "bar",
          stack: "share",
          barMaxWidth: 56,
          color: colors[e],
          // 2px surface gap between stacked segments
          itemStyle: { borderColor: t.surface, borderWidth: 1 },
          data: steamShare(e).map((o) => barItem(t, o)),
          label:
            e === "Released that year"
              ? { show: true, color: t.onAccent, fontSize: 12, formatter: (p: { value: number }) => `${p.value}%` } // segment is always the lightest ramp step
              : undefined,
        })),
      };
    },
    [d],
  );

  const releasesOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 24 },
      tooltip: tooltip(t, d.sources, fmtInt),
      xAxis: categoryAxis(t, releases.map((o) => o.period)),
      yAxis: valueAxis(t, (v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)),
      series: [
        {
          name: "New games released",
          type: "bar",
          barMaxWidth: 26,
          data: releases.map((o, i) => {
            const c = i === releases.length - 1 ? t.ramp[1] : t.neutral;
            return { ...fill(t, o, c), itemStyle: { color: c } };
          }),
          label: {
            show: true,
            position: "top",
            color: t.textSecondary,
            fontSize: 11,
            formatter: (p: { value: number; dataIndex: number }) =>
              p.dataIndex === 0 || p.dataIndex === releases.length - 1 ? fmtInt(p.value) : "",
          },
        },
      ],
    }),
    [d],
  );

  const perMauOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 24, right: 32 },
      tooltip: { ...tooltip(t, d.sources, (v) => `${v} games`), axisPointer: { type: "line", lineStyle: { color: t.axis } } },
      xAxis: { ...categoryAxis(t, perMau.map((o) => o.period)), boundaryGap: false },
      yAxis: { ...valueAxis(t), min: 0, max: 8 },
      series: [
        {
          name: "Games bought or installed per player",
          type: "line",
          color: t.ramp[1],
          lineStyle: { width: 2 },
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { borderColor: t.surface, borderWidth: 2 },
          data: perMau.map(lineItem),
          label: {
            show: true,
            position: "top",
            color: t.textSecondary,
            fontSize: 11,
            formatter: (p: { value: number; dataIndex: number }) => (p.dataIndex === 0 || p.dataIndex === perMau.length - 1 ? `${p.value}` : ""),
          },
        },
      ],
    }),
    [d],
  );

  const playtimeOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 8, right: 48 },
      tooltip: { ...tooltip(t, d.sources, (v) => `${v}%`), axisPointer: { type: "none" } },
      yAxis: { ...categoryAxis(t, playtime.map((o) => o.entity)), inverse: true },
      xAxis: { ...valueAxis(t, (v) => `${v}%`), max: 60 },
      series: [
        {
          name: "Share of playtime",
          type: "bar",
          barMaxWidth: 18,
          data: playtime.map((o) => {
            const c = o === newShare ? t.ramp[1] : t.neutral;
            return { ...fill(t, o, c), itemStyle: { ...fill(t, o, c).itemStyle } };
          }),
          label: { show: true, position: "right", color: t.textSecondary, formatter: (p: { value: number }) => `${p.value}%` },
        },
      ],
    }),
    [d],
  );

  const hoursOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 24 },
      tooltip: tooltip(t, d.sources, (v) => `${v}B hours`),
      xAxis: { ...categoryAxis(t, hours.map((o) => (o.period === "2023" ? `${o.entity}*` : o.entity))), axisLabel: { color: t.muted, interval: 0, fontSize: 11 } },
      yAxis: valueAxis(t, (v) => `${v}B`),
      series: [
        {
          name: "Monthly hours",
          type: "bar",
          barMaxWidth: 36,
          data: hours.map((o) => {
            const c = o.entity === "Roblox" ? t.ramp[1] : t.neutral;
            return { ...fill(t, o, c), itemStyle: { color: c } };
          }),
          label: { show: true, position: "top", color: t.textSecondary, fontSize: 11, formatter: (p: { value: number }) => `≈${p.value}B` },
        },
      ],
    }),
    [d],
  );

  const table = (rows: Observation[], label: string, fmt: (o: Observation) => string | number = (o) => o.value) => ({
    columns: [label, "Value", "Slide / note"],
    rows: rows.map((o) => [label === "Year" ? o.period : o.entity, fmt(o), o.note ?? ""]),
  });

  return (
    <Section
      id="long-view"
      title="The long view"
      lede={d.context.lede}
    >
      <div className="tiles">
        {newShare && <StatTile label="2023 playtime spent on new games" value={`${newShare.value}%`} detail="PC + PlayStation/Xbox, excl. annual sequels" confidence={newShare.confidence} source={src} />}
        {peak && latest && (
          <StatTile
            label="Real spending, 2024 vs 2021 peak"
            value={`${(((latest.value - peak.value) / peak.value) * 100).toFixed(0)}%`}
            detail={`$${peak.value}B → $${latest.value}B in 2024 dollars`}
            confidence="derived"
            source={src}
          />
        )}
        {growth[0] && <StatTile label="Mobile's share of growth since 2011" value="≈70%" detail={`+$${growth[0].value}B of new yearly spend`} confidence="estimate" source={src} />}
        {releases.at(-1) && <StatTile label="New games on Steam in 2024" value={fmtInt(releases.at(-1)!.value)} detail={`vs ${fmtInt(releases[0].value)} in ${releases[0].period}`} confidence="estimate" source={src} />}
      </div>

      <div className="pair">
        <Chart
          title="Where the growth came from, 2011 → 2024"
          subtitle="Change in yearly worldwide spending on game content, by platform"
          height={240}
          option={growthOption}
          table={table(growth, "Platform", (o) => fmtSignedB(o.value))}
        />
        <Chart
          title="Inflation-adjusted spending"
          subtitle="Worldwide spending on game content, USD billions in 2024 dollars"
          height={240}
          option={realOption}
          table={table(realSpend, "Year", (o) => `$${o.value}B`)}
        />
      </div>

      <Chart
        title="Who gets Steam's playtime?"
        subtitle="Share of total Steam playtime by game age. Labels show games released that year."
        height={280}
        option={steamOption}
        table={{
          columns: ["Year", ...[...ageBuckets].reverse()],
          rows: steamYears.map((y, i) => [y, ...[...ageBuckets].reverse().map((e) => `${steamShare(e)[i]?.value ?? "—"}%`)]),
        }}
      />

      <div className="pair">
        <Chart
          title="More games on Steam every year..."
          subtitle="New releases per year"
          height={240}
          option={releasesOption}
          table={table(releases, "Year", (o) => fmtInt(o.value))}
        />
        <Chart
          title="...but players buy fewer of them"
          subtitle="Games bought or installed per monthly active user per year"
          height={240}
          option={perMauOption}
          table={table(perMau, "Year")}
        />
      </div>

      <div className="pair">
        <Chart
          title="Where 2023's playtime went"
          subtitle="PC + PlayStation/Xbox, share of hours by when the game came out. Hatched = derived."
          height={240}
          option={playtimeOption}
          table={table(playtime, "Group", (o) => `${o.value}%`)}
        />
        <Chart
          title="Roblox out-engages every platform"
          subtitle="Monthly hours of engagement, billions. *PlayStation is a 2023 average."
          height={240}
          option={hoursOption}
          table={table(hours, "Platform", (o) => `≈${o.value}B`)}
          footnote="Approximate: read from the slide's gridlines, which have no value labels."
        />
      </div>
      <p className="note">{d.context.notes}</p>
    </Section>
  );
}
