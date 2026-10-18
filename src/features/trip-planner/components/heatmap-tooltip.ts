/**
 * The tooltip shown while hovering the heatmap (F8): the hour, the level's name, and the weather values for
 * that point and hour. Built from DOM nodes with `textContent`. White in both themes, so text colours are explicit.
 */
import { RISK_COLOR } from "@/components/ui/risk";

import { formatDateTime } from "../format";
import type { HeatReading } from "../heatmap-data";

const text = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, content: string): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = content;
  return el;
};

const measure = (value: number | null, unit: string, digits = 0): string =>
  value === null ? "No data" : `${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`;

/** The tooltip body for one grid point at one hour: `popup.setDOMContent(buildHeatmapTooltip(reading))`. */
export const buildHeatmapTooltip = (reading: HeatReading): HTMLElement => {
  const root = document.createElement("div");
  root.className = "flex min-w-44 flex-col gap-1.5 text-neutral-900";

  const head = document.createElement("div");
  head.className = "flex flex-wrap items-center gap-2";
  head.append(text("span", `rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_COLOR[reading.level].fillClass}`, reading.levelName));
  head.append(text("span", "text-xs text-neutral-600", formatDateTime(reading.time)));
  root.append(head);

  const rows: [string, string][] = [
    ["Wind", measure(reading.windMph, "mph")],
    ["Rain", measure(reading.rainInPerHr, "in/hr", 2)],
    ["Snow", measure(reading.snowInPerHr, "in/hr", 2)],
  ];
  const list = document.createElement("dl");
  list.className = "grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs";
  for (const [label, value] of rows) list.append(text("dt", "text-neutral-600", label), text("dd", "font-mono tabular-nums", value));
  root.append(list);
  return root;
};
