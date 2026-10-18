/**
 * The strip of risk along a route, start to end (F6). The API sends miles per level but not where
 * on the route they fall, so this rebuilds the stretches from the checkpoints with the backend's own
 * layout rule (B2, `summarize_route`): each checkpoint stands for the road from halfway back to the
 * previous checkpoint to halfway on to the next; the first starts at mile 0 and the last ends at the
 * destination. This only lays out what the backend already decided — it never scores anything.
 */
import { riskLevelFromValue, type RiskLevel } from "@/components/ui/risk";

import type { Route } from "./types";

export type StripSegment = {
  level: RiskLevel;
  startMile: number;
  endMile: number;
  miles: number;
};

type Point = { mile: number; value: number | null };

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** The worse of two known levels; Unknown (null) only when both are unknown. */
const worse = (a: number | null, b: number | null): number | null => (a === null ? b : b === null ? a : Math.max(a, b));

/**
 * Stretches along a route in order, each with its level; neighbours with the same level are joined.
 * Positions are clamped to the route and checkpoints at the same mile are merged (worst known level
 * wins), exactly as the backend does, so the lengths add up to the route's distance.
 */
export const riskStrip = (route: Pick<Route, "distance_miles" | "checkpoints">): StripSegment[] => {
  const points: Point[] = route.checkpoints
    .map((c) => ({ mile: finiteOr(c.mile, 0), value: c.risk.level.value }))
    .sort((a, b) => a.mile - b.mile);
  const furthest = points.length > 0 ? points[points.length - 1].mile : 0;
  const distance = Math.max(finiteOr(route.distance_miles, furthest), 0);
  if (distance === 0) return [];
  if (points.length === 0) return [{ level: "unknown", startMile: 0, endMile: distance, miles: distance }];

  const merged: Point[] = [];
  for (const point of points) {
    const mile = Math.min(Math.max(point.mile, 0), distance);
    const last = merged[merged.length - 1];
    if (last && last.mile === mile) last.value = worse(last.value, point.value);
    else merged.push({ mile, value: point.value });
  }

  const segments: StripSegment[] = [];
  merged.forEach((point, i) => {
    const startMile = i === 0 ? 0 : (merged[i - 1].mile + point.mile) / 2;
    const endMile = i === merged.length - 1 ? distance : (point.mile + merged[i + 1].mile) / 2;
    const level = riskLevelFromValue(point.value);
    const previous = segments[segments.length - 1];
    if (previous && previous.level === level) {
      previous.endMile = endMile;
      previous.miles = previous.endMile - previous.startMile;
    } else {
      segments.push({ level, startMile, endMile, miles: endMile - startMile });
    }
  });
  return segments.filter((segment) => segment.miles > 0);
};

/** Total miles per level across a strip; levels with no stretch are 0. */
export const milesByLevel = (segments: readonly StripSegment[]): Record<RiskLevel, number> => {
  const totals: Record<RiskLevel, number> = { low: 0, moderate: 0, high: 0, severe: 0, no_travel: 0, unknown: 0 };
  for (const segment of segments) totals[segment.level] += segment.miles;
  return totals;
};
