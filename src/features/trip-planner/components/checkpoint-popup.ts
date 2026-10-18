/**
 * The popup shown when a checkpoint marker is clicked (F5). Built from DOM nodes with
 * `textContent`, never HTML strings, because the reasons and notes come from the backend.
 * Popups are white in both themes, so text colours are explicit rather than theme tokens.
 */
import { RISK_COLOR, riskLevelFromValue } from "@/components/ui/risk";

import { formatDateTime } from "../format";
import type { Checkpoint, Route } from "../types";

const NO_DATA = "No data";

const text = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, content: string): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = content;
  return el;
};

const measure = (value: number | null, unit: string, digits = 0): string =>
  value === null ? NO_DATA : `${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`;

/** The popup body for one checkpoint: `popup.setDOMContent(buildCheckpointPopup(route, checkpoint))`. */
export const buildCheckpointPopup = (route: Route, checkpoint: Checkpoint): HTMLElement => {
  const { weather, risk } = checkpoint;
  const level = riskLevelFromValue(risk.level.value);

  const root = document.createElement("div");
  root.className = "flex min-w-56 flex-col gap-2 text-neutral-900";

  const head = document.createElement("div");
  head.className = "flex flex-wrap items-center gap-2 pr-5";
  head.append(text("strong", "text-sm", `Route ${route.letter} · mile ${checkpoint.mile.toFixed(1)}`));
  head.append(text("span", `rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_COLOR[level].fillClass}`, risk.level.name));
  root.append(head);

  const rows: [string, string][] = [
    ["Arrives", formatDateTime(checkpoint.arrival_at)],
    ["Wind", measure(weather.wind_mph, "mph")],
    ["Gusts", measure(weather.gust_mph, "mph")],
    ["Rain", measure(weather.rain_in_per_hr, "in/hr", 2)],
    ["Snow", measure(weather.snow_in_per_hr, "in/hr", 2)],
    ["Temperature", measure(weather.temperature_f, "°F")],
  ];
  if (weather.description) rows.push(["Conditions", weather.description]);

  const list = document.createElement("dl");
  list.className = "grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs";
  for (const [label, value] of rows) {
    list.append(text("dt", "text-neutral-600", label), text("dd", "font-mono tabular-nums", value));
  }
  root.append(list);

  for (const [items, className] of [
    [risk.reasons, "text-xs font-medium"],
    [risk.notes, "text-xs italic text-neutral-600"],
  ] as const) {
    if (items.length === 0) continue;
    const ul = document.createElement("ul");
    ul.className = "list-disc pl-4";
    for (const item of items) ul.append(text("li", className, item));
    root.append(ul);
  }
  return root;
};
