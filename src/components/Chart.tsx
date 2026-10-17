import { useEffect, useRef, useState, type ReactNode } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent, AriaComponent, MarkLineComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";
import { useTokens, type Tokens } from "../theme";

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, AriaComponent, MarkLineComponent, SVGRenderer]);

export interface TableData {
  columns: string[];
  rows: (string | number)[][];
}

interface Props {
  title: string;
  subtitle?: ReactNode;
  height?: number;
  option: (t: Tokens) => EChartsCoreOption;
  table: TableData;
  footnote?: ReactNode;
}

export function Chart({ title, subtitle, height = 280, option, table, footnote }: Props) {
  const tokens = useTokens();
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    if (view !== "chart" || !el.current) return;
    const c = echarts.init(el.current, undefined, { renderer: "svg" });
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, [view]);

  useEffect(() => {
    chart.current?.setOption({ animationDuration: 300, textStyle: { fontFamily: tokens.font }, ...option(tokens) }, true);
  }, [option, tokens, view]);

  return (
    <figure className="panel chart">
      <header className="chart-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>
        <div className="tabs" role="group" aria-label="View">
          <button className="tab" aria-pressed={view === "chart"} onClick={() => setView("chart")}>Chart</button>
          <button className="tab" aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button>
        </div>
      </header>
      {/* Distinct keys so React never reuses the ECharts host element for the table:
          ECharts clears its host's contents on dispose, which would wipe the table. */}
      {view === "chart" ? (
        <div key="chart" ref={el} className="plot" style={{ height }} role="img" aria-label={title} />
      ) : (
        <div key="table" className="table-wrap" style={{ minHeight: height }}>
          <table>
            <thead>
              <tr>{table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footnote && <figcaption className="foot">{footnote}</figcaption>}
    </figure>
  );
}
