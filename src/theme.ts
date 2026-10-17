import { useState } from "react";

// Color follows the entity, never its rank: every chart looks colors up here,
// so "PS5 is teal" holds across the whole dashboard. The palette is the
// the1azreen.neocities.org one: teal, magenta, yellow and mint on indigo.
export const ENTITY_TOKEN: Record<string, string> = {
  PS5: "--series-1",
  PlayStation: "--series-1",
  "Switch 2": "--series-2",
  Nintendo: "--series-2",
  Switch: "--series-3",
  Xbox: "--series-7",
  Steam: "--series-1",
};

export const FONT = '"pixelmplus12", "MS Gothic", ui-monospace, monospace';

export interface Tokens {
  surface: string;
  textPrimary: string;
  textSecondary: string;
  muted: string;
  grid: string;
  axis: string;
  /** Ordinal ramp, light -> dark, for ordered categories (e.g. game age). */
  ramp: [string, string, string];
  neutral: string;
  negative: string;
  /** Text color that reads on top of an accent (teal) fill. */
  onAccent: string;
  font: string;
  entity: (name: string) => string;
}

export function readTokens(): Tokens {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    surface: v("--ink"),
    textPrimary: v("--yellow"),
    textSecondary: v("--text"),
    muted: v("--muted"),
    grid: v("--inactive"),
    axis: v("--outer"),
    ramp: [v("--ramp-1"), v("--ramp-2"), v("--ramp-3")],
    neutral: v("--neutral"),
    negative: v("--bad"),
    onAccent: v("--back"),
    font: FONT,
    entity: (name) => v(ENTITY_TOKEN[name] ?? "--series-1"),
  };
}

/** Single theme, so the tokens only need reading once. */
export function useTokens(): Tokens {
  const [tokens] = useState(readTokens);
  return tokens;
}

/** The scrolling night-sky background, as on the reference site. Off by default; remembered per browser. */
export function savedSky(): boolean {
  try {
    return localStorage.getItem("sky") === "on";
  } catch {
    return false;
  }
}

export function applySky(on: boolean) {
  document.body.classList.toggle("sky-anim", on);
  try {
    localStorage.setItem("sky", on ? "on" : "off");
  } catch {
    /* storage unavailable: the setting just won't persist */
  }
}
