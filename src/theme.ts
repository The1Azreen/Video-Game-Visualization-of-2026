import { useEffect, useState } from "react";

// Color follows the entity, never its rank: every chart looks colors up here,
// so "PS5 is blue" holds across the whole dashboard. Slots 1-3 of the reference
// palette are validated all-pairs (light + dark); Xbox only ever appears alone.
export const ENTITY_TOKEN: Record<string, string> = {
  PS5: "--series-1",
  PlayStation: "--series-1",
  "Switch 2": "--series-2",
  Nintendo: "--series-2",
  Switch: "--series-3",
  Xbox: "--series-7",
  Steam: "--series-1",
};

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
  entity: (name: string) => string;
}

export function readTokens(): Tokens {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    surface: v("--surface-1"),
    textPrimary: v("--text-primary"),
    textSecondary: v("--text-secondary"),
    muted: v("--text-muted"),
    grid: v("--grid"),
    axis: v("--axis"),
    ramp: [v("--ramp-1"), v("--ramp-2"), v("--ramp-3")],
    neutral: v("--neutral"),
    negative: v("--negative"),
    entity: (name) => v(ENTITY_TOKEN[name] ?? "--series-1"),
  };
}

export type ThemeChoice = "system" | "light" | "dark";

/** Re-reads tokens whenever the OS scheme or the in-page toggle changes. */
export function useTokens(): Tokens {
  const [tokens, setTokens] = useState(readTokens);
  useEffect(() => {
    const update = () => setTokens(readTokens());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", update);
      mo.disconnect();
    };
  }, []);
  return tokens;
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  try {
    localStorage.setItem("theme", choice);
  } catch {
    /* storage unavailable: theme just won't persist */
  }
}

export function savedTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    /* ignore */
  }
  return "system";
}
