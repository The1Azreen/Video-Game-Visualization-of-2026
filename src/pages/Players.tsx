import { useCallback } from "react";
import type { DomainFile, Observation, Source } from "../data/schema";
import { Chart } from "../components/Chart";
import { ConfidenceBadge, Section, SourceLink, StatTile } from "../components/bits";
import { barItem, baseGrid, categoryAxis, legend, tooltip, valueAxis } from "../charts";import type { Tokens } from "../theme";

// Who plays: ESA's US survey for age, platforms and genres by generation, plus the
// few spending-by-age figures that have been published (BCG, Circana).

const AGES: Record<string, string> = {
  "Gen Alpha": "5–12",
  "Gen Z": "13–28",
  Millennials: "29–44",
  "Gen X": "45–60",
  Boomers: "61–79",
  Silent: "80–90",
  "Boomers/Silent": "61–90",
};
const PLATFORM_GENS = ["Gen Alpha", "Gen Z", "Millennials", "Gen X", "Boomers/Silent"];
const PLATFORMS = ["Mobile", "PC", "Console", "VR"];
const pct = (v: number) => `${v}%`;

/** Generations run down the y-axis (oldest at the bottom) so every name fits, even on a phone. */
function genAxis(t: Tokens, data: string[]) {
  const axis = categoryAxis(t, data);
  return { ...axis, inverse: true, axisLabel: { ...axis.axisLabel, interval: 0 } };
}

export function Players({ players, sources }: { players: DomainFile; sources: Map<string, Source> }) {
  const obs = players.observations;
  const by = (metric: string) => obs.filter((o) => o.metric === metric);
  const one = (metric: string, entity: string) => obs.find((o) => o.metric === metric && o.entity === entity);
  const src = (o?: Observation) => (o ? sources.get(o.sourceId) : undefined);

  const count = one("players", "US");
  const avgAge = one("average_age", "US");
  const female = one("gender_share", "Female");
  const ageBands = by("age_band_share");
  const playShare = by("play_share");
  const platform = (gen: string, p: string) => obs.find((o) => o.metric === "platform_share" && o.entity === gen && o.segment === p);
  const genres = PLATFORM_GENS.map((gen) => ({ gen, top: obs.filter((o) => o.metric === "genre_share" && o.entity === gen) }));
  const youngSpend = one("weekly_spend_change_pct", "Ages 18–24");
  const genXLow = one("spend_under_100_share", "Gen X");
  const boomerLow = one("spend_under_100_share", "Boomers");
  const parents = one("parents_bought_ingame", "US");
  const over35 = ageBands.filter((o) => o.entity === "35–49" || o.entity === "50+").reduce((a, o) => a + o.value, 0);
  const genreSource = src(genres[0].top[0]);

  const ageOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 8, right: 48 },
      tooltip: { ...tooltip(t, sources, pct), axisPointer: { type: "none" } },
      yAxis: { ...categoryAxis(t, ageBands.map((o) => o.entity)), inverse: true },
      xAxis: { ...valueAxis(t, pct), max: 40 },
      series: [
        {
          name: "Share of players",
          type: "bar",
          barMaxWidth: 22,
          // Emphasis: the 35+ bands that make up half of all players.
          data: ageBands.map((o) => ({ ...barItem(t, o), itemStyle: { color: o.entity === "35–49" || o.entity === "50+" ? t.ramp[1] : t.neutral } })),
          label: { show: true, position: "right", color: t.textSecondary, formatter: (p: { value: number }) => pct(p.value) },
        },
      ],
    }),
    [players],
  );

  const playOption = useCallback(
    (t: Tokens) => ({
      grid: { ...baseGrid(), top: 8, right: 48 },
      tooltip: { ...tooltip(t, sources, pct), axisPointer: { type: "none" } },
      yAxis: genAxis(t, playShare.map((o) => o.entity)),
      xAxis: { ...valueAxis(t, pct), max: 100 },
      series: [
        {
          name: "Play 1+ hour a week",
          type: "bar",
          barMaxWidth: 18,
          color: t.ramp[1],
          data: playShare.map((o) => barItem(t, o)),
          label: { show: true, position: "right", color: t.textSecondary, formatter: (p: { value: number }) => pct(p.value) },
        },
      ],
    }),
    [players],
  );

  const platformOption = useCallback(
    (t: Tokens) => ({
      color: PLATFORMS.map(t.entity),
      grid: baseGrid(),
      legend: legend(t),
      tooltip: tooltip(t, sources, pct),
      yAxis: genAxis(t, PLATFORM_GENS),
      xAxis: { ...valueAxis(t, pct), max: 100 },
      series: PLATFORMS.map((p) => ({
        name: p,
        type: "bar",
        barMaxWidth: 12,
        barGap: "20%",
        data: PLATFORM_GENS.map((gen) => barItem(t, platform(gen, p))),
      })),
    }),
    [players],
  );

  return (
    <Section id="players" title="Players" lede={players.lede}>
      <div className="tiles">
        {avgAge && <StatTile label="Average US player age" value={`${avgAge.value}`} detail={over35 ? `${over35}% of players are 35 or older; ${avgAge.note?.toLowerCase().replace(/\.$/, "")}` : avgAge.note} confidence={avgAge.confidence} source={src(avgAge)} />}
        {count && <StatTile label="Americans who play weekly" value={`${count.value}M`} detail={count.note} confidence={count.confidence} source={src(count)} />}
        {female && <StatTile label="Players who are women" value={pct(female.value)} detail={female.note} confidence={female.confidence} source={src(female)} />}
      </div>

      <div className="pair">
        <Chart
          title="How old players are"
          subtitle="Share of US players aged 5–90. Half are 35 or older."
          height={240}
          option={ageOption}
          table={{ columns: ["Age", "Share of players"], rows: ageBands.map((o) => [o.entity, pct(o.value)]) }}
        />
        <Chart
          title="Who plays, by generation"
          subtitle="Share of each generation that plays 1+ hour a week. Hover for the male / female split."
          height={240}
          option={playOption}
          table={{ columns: ["Generation", "Ages", "Play weekly", "Note"], rows: playShare.map((o) => [o.entity, AGES[o.entity] ?? "", pct(o.value), o.note ?? ""]) }}
        />
      </div>

      <Chart
        title="Where each generation plays"
        subtitle="Share of players 8+ in each generation who play on each platform. Phones are near-universal; consoles fall away after Millennials."
        height={360}
        option={platformOption}
        table={{
          columns: ["Generation", "Ages", ...PLATFORMS],
          rows: PLATFORM_GENS.map((gen) => [gen, gen === "Gen Alpha" ? "8–12" : AGES[gen], ...PLATFORMS.map((p) => (platform(gen, p) ? pct(platform(gen, p)!.value) : "—"))]),
        }}
        footnote="Players can use more than one platform, so each generation's bars add up to more than 100%."
      />

      <figure className="panel chart genres">
        <header className="chart-head">
          <div>
            <h3>What each generation plays</h3>
            <p className="sub">Top three genres played regularly, share of players 8+ in each generation.</p>
          </div>
        </header>
        <div className="genre-grid">
          {genres.map(({ gen, top }) => (
            <div key={gen} className="genre-card">
              <div className="genre-gen">
                {gen} <span className="dim">{gen === "Gen Alpha" ? "8–12" : AGES[gen]}</span>
              </div>
              <ol>
                {top.map((o) => (
                  <li key={o.segment}>
                    <span className="genre-name">{o.segment}</span>
                    <span className="genre-bar" aria-hidden>
                      <span style={{ width: `${o.value}%` }} />
                    </span>
                    <span className="genre-pct">{pct(o.value)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <figcaption className="foot">
          Shooters only make the top three for Gen Z; from Millennials up, puzzle games come first.
          <span className="tile-meta">
            <ConfidenceBadge c="reported" />
            {genreSource && <SourceLink source={genreSource} />}
          </span>
        </figcaption>
      </figure>

      <h3 className="sub-head">Spending by age</h3>
      <div className="tiles">
        {youngSpend && (
          <StatTile label="18–24s' weekly game spending, Jan–Apr" value={`≈${youngSpend.value}%`} delta="vs 2024; older age groups fell under 5%" deltaTone="down" confidence={youngSpend.confidence} source={src(youngSpend)} />
        )}
        {genXLow && <StatTile label="Gen X spending under $100 a month" value={pct(genXLow.value)} detail="Global survey, Jul 2025" confidence={genXLow.confidence} source={src(genXLow)} />}
        {boomerLow && <StatTile label="Boomers spending under $100 a month" value={pct(boomerLow.value)} detail="Global survey, Jul 2025" confidence={boomerLow.confidence} source={src(boomerLow)} />}
        {parents && <StatTile label="Parents who've bought in-game items for their kids" value={pct(parents.value)} detail={parents.note} confidence={parents.confidence} source={src(parents)} />}
      </div>
      <p className="note">
        No public 2025 source splits spending across every age group, so these are the published data points. Circana's analyst reads the 18–24 drop as a shift to free-to-play games on devices
        players already own, not players quitting; BCG finds spending tends to fall as family responsibilities grow. {players.notes}
      </p>
    </Section>
  );
}
