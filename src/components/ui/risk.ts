/**
 * The one risk-level mapping (F1). Pills, map markers, route lines, the
 * heatmap and the legend all read from here. Colour values live only in the
 * `--risk-*` tokens in `src/app/globals.css`.
 */

/** Lowest to highest, then Unknown (no forecast). Matches the API's level names. */
export const RISK_LEVELS = ["low", "moderate", "high", "severe", "no_travel", "unknown"] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

export type RiskStyle = {
  /** The API's level number (0–4); null for Unknown, which is never ranked. */
  rank: number | null;
  label: string;
  description: string;
  /** CSS custom property holding the fill colour, e.g. `--risk-low`. */
  cssVar: `--risk-${string}`;
  /** Tailwind classes for a filled surface with readable text (pills, swatches). */
  fillClass: string;
  /** Unknown is drawn hatched (CSS) or dashed/hollow (map) instead of a flat fill. */
  hatched: boolean;
};

export const RISK_COLOR: Record<RiskLevel, RiskStyle> = {
  low: {
    rank: 0,
    label: "Low",
    description: "Normal driving conditions.",
    cssVar: "--risk-low",
    fillClass: "bg-risk-low text-risk-low-fg",
    hatched: false,
  },
  moderate: {
    rank: 1,
    label: "Moderate",
    description: "Some wind, rain or snow. Drive with care.",
    cssVar: "--risk-moderate",
    fillClass: "bg-risk-moderate text-risk-moderate-fg",
    hatched: false,
  },
  high: {
    rank: 2,
    label: "High",
    description: "Strong wind or heavy rain or snow. Slow down or consider waiting.",
    cssVar: "--risk-high",
    fillClass: "bg-risk-high text-risk-high-fg",
    hatched: false,
  },
  severe: {
    rank: 3,
    label: "Severe",
    description: "Dangerous conditions. Avoid this stretch if you can.",
    cssVar: "--risk-severe",
    fillClass: "bg-risk-severe text-risk-severe-fg",
    hatched: false,
  },
  no_travel: {
    rank: 4,
    label: "No Travel",
    description: "Unsafe for this truck and load. Don't drive this stretch.",
    cssVar: "--risk-no-travel",
    fillClass: "bg-risk-no-travel text-risk-no-travel-fg",
    hatched: false,
  },
  unknown: {
    rank: null,
    label: "Unknown",
    description: "No forecast for this place and time. Not the same as Low.",
    cssVar: "--risk-unknown",
    fillClass: "bg-risk-unknown-hatched text-risk-unknown-fg",
    hatched: true,
  },
};

/** CSS custom property for the casing drawn around markers and lines. */
export const RISK_OUTLINE_VAR = "--risk-outline";

/** "Severe: Dangerous conditions…" — for tooltips and accessible names. */
export const riskTitle = (level: RiskLevel): string =>
  `${RISK_COLOR[level].label}: ${RISK_COLOR[level].description}`;

/**
 * Resolved colour strings for canvas/WebGL consumers (map layers, heatmap) that
 * can't use CSS variables. Call in the browser; re-read when the colour scheme
 * changes (`matchMedia("(prefers-color-scheme: dark)")`).
 */
export const readRiskColors = (
  el: Element = document.documentElement,
): Record<RiskLevel | "outline", string> => {
  const style = getComputedStyle(el);
  const read = (name: string): string => style.getPropertyValue(name).trim();
  const colors = Object.fromEntries(
    RISK_LEVELS.map((level) => [level, read(RISK_COLOR[level].cssVar)]),
  ) as Record<RiskLevel, string>;
  return { ...colors, outline: read(RISK_OUTLINE_VAR) };
};
