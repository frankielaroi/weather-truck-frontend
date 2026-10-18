/**
 * Turns a trip into the GeoJSON the map draws (F5). Pure functions: no map, no DOM.
 * The backend already sends paths as GeoJSON LineStrings ([lng, lat]), so lines pass straight through.
 */
import type { Feature, FeatureCollection, LineString, Point } from "geojson";

import { riskLevelFromValue, type RiskLevel } from "@/components/ui/risk";

import type { Trip } from "./types";

export type RouteLineProps = { index: number; letter: string; recommended: boolean };
/** `route` is the route's index, so a marker can be matched back to its checkpoint in the trip. */
export type CheckpointProps = { route: number; sequence: number; level: RiskLevel };
export type RouteBadgeProps = RouteLineProps;

export type LngLat = [number, number];
export type Bounds = [LngLat, LngLat]; // [southwest, northeast]

/** Where along a route (0–1 of its length) its letter badge sits; spread out so badges on shared roads don't stack. */
const BADGE_FRACTIONS = [0.5, 0.35, 0.65] as const;

export const routeLines = (trip: Trip): FeatureCollection<LineString, RouteLineProps> => ({
  type: "FeatureCollection",
  features: trip.routes.map((route) => ({
    type: "Feature",
    properties: { index: route.index, letter: route.letter, recommended: route.is_recommended },
    geometry: route.path,
  })),
});

export const checkpointPoints = (trip: Trip): FeatureCollection<Point, CheckpointProps> => ({
  type: "FeatureCollection",
  features: trip.routes.flatMap((route) =>
    route.checkpoints.map(
      (checkpoint): Feature<Point, CheckpointProps> => ({
        type: "Feature",
        properties: {
          route: route.index,
          sequence: checkpoint.sequence,
          level: riskLevelFromValue(checkpoint.risk.level.value),
        },
        geometry: { type: "Point", coordinates: [checkpoint.lng, checkpoint.lat] },
      }),
    ),
  ),
});

const distance = (a: LngLat, b: LngLat): number => {
  // Equirectangular is plenty for placing a label; only proportions matter.
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  return Math.hypot(dx, b[1] - a[1]);
};

/** The point `fraction` (0–1) of the way along a path, measured along the path itself. */
export const pointAtFraction = (path: readonly LngLat[], fraction: number): LngLat | null => {
  if (path.length === 0) return null;
  if (path.length === 1) return path[0];
  const lengths = path.slice(1).map((point, i) => distance(path[i], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = Math.min(Math.max(fraction, 0), 1) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] === 0 ? 0 : Math.min(remaining / lengths[i], 1);
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t];
    }
    remaining -= lengths[i];
  }
  return path[path.length - 1];
};

/** One point per route carrying its letter ("A", "B", "C"), so routes can be told apart without colour. */
export const routeBadges = (trip: Trip): FeatureCollection<Point, RouteBadgeProps> => ({
  type: "FeatureCollection",
  features: trip.routes.flatMap((route, i): Feature<Point, RouteBadgeProps>[] => {
    const at = pointAtFraction(route.path.coordinates, BADGE_FRACTIONS[i % BADGE_FRACTIONS.length]);
    return at
      ? [
          {
            type: "Feature",
            properties: { index: route.index, letter: route.letter, recommended: route.is_recommended },
            geometry: { type: "Point", coordinates: at },
          },
        ]
      : [];
  }),
});

/** A box around every route and checkpoint; null when the trip has nothing to draw. */
export const tripBounds = (trip: Trip): Bounds | null => {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  const include = (lng: number, lat: number): void => {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  };
  for (const route of trip.routes) {
    for (const [lng, lat] of route.path.coordinates) include(lng, lat);
    for (const checkpoint of route.checkpoints) include(checkpoint.lng, checkpoint.lat);
  }
  return Number.isFinite(west)
    ? [
        [west, south],
        [east, north],
      ]
    : null;
};

/** The route shown as selected until the driver picks another: the recommended one. */
export const defaultSelectedRoute = (trip: Trip): number => trip.recommended_route_index ?? trip.routes[0]?.index ?? 0;
