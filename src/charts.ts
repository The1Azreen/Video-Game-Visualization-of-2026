import type { Observation, Source } from "./data/schema";
import type { Tokens } from "./theme";

// Shared ECharts building blocks so every chart has the same recessive chrome:
// hairline indigo grid, muted axis labels, no axis ticks, square pixel corners.

export function baseGrid() {
  return { left: 8, right: 16, top: 36, bottom: 8, containLabel: true };
}

export function categoryAxis(t: Tokens, data: string[]) {
  return {
    type: "category",
    data,
    axisLine: { lineStyle: { color: t.axis } },
    axisTick: { show: false },
    axisLabel: { color: t.muted },
  };
}

export function valueAxis(t: Tokens, fmt: (v: number) => string = String) {
  return {
    type: "value",
    splitLine: { lineStyle: { color: t.grid, width: 1 } },
    axisLabel: { color: t.muted, formatter: fmt },
  };
}

export function legend(t: Tokens) {
  return {
    top: 0,
    left: 0,
    icon: "rect",
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: t.textSecondary, fontFamily: t.font },
  };
}

/** Bar data item carrying its observation; derived values (our own arithmetic) are hatched. */
export function barItem(t: Tokens, o: Observation | undefined) {
  if (!o) return { value: null };
  const hatched = o.confidence === "derived";
  return {
    value: o.value,
    obs: o,
    itemStyle: hatched
      ? { decal: { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 3], rotation: Math.PI / 4, color: t.surface + "99" } }
      : undefined,
  };
}

export function lineItem(o: Observation | undefined) {
  return o ? { value: o.value, obs: o } : { value: null };
}

const CONF_LABEL = { reported: "Reported", estimate: "Estimate", derived: "Derived" } as const;

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

type TooltipParam = { seriesName: string; color: string; data: { value: number | null; obs?: Observation }; axisValueLabel?: string };

export function tooltip(t: Tokens, sources: Map<string, Source>, fmt: (v: number) => string) {
  return {
    trigger: "axis",
    axisPointer: { type: "shadow", shadowStyle: { color: t.axis + "88" } },
    backgroundColor: t.surface,
    borderColor: t.textPrimary,
    borderWidth: 2,
    textStyle: { color: t.textPrimary, fontSize: 13, fontFamily: t.font },
    extraCssText: "box-shadow:4px 4px 0 #000;border-radius:0;max-width:320px;white-space:normal;",
    formatter: (params: TooltipParam[]) => {
      const rows = params
        .filter((p) => p.data?.value != null)
        .map((p) => {
          const o = p.data.obs;
          const src = o ? sources.get(o.sourceId) : undefined;
          return `<div style="margin-top:6px">
            <span style="display:inline-block;width:8px;height:8px;background:${p.color};margin-right:6px"></span>
            ${esc(p.seriesName)} <b style="float:right;margin-left:12px">${fmt(p.data.value!)}</b>
            ${o ? `<div style="color:${t.textSecondary};opacity:.75;font-size:12px;margin-left:14px">${CONF_LABEL[o.confidence]} · ${esc(src?.publisher ?? o.sourceId)}${o.note ? `<br>${esc(o.note)}` : ""}</div>` : ""}
          </div>`;
        });
      return `<div style="font-weight:600">${esc(params[0]?.axisValueLabel ?? "")}</div>${rows.join("")}`;
    },
  };
}
