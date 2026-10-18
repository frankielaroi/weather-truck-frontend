/**
 * Turns the backend's heatmap payload (B11) into what the map draws (F8). Pure functions: no map, no DOM.
 *
 * The payload is compact: positions once, then 49 hourly values per grid point. All 49 hours of risk level go
 * onto each point as properties `h0`…`h48` in one upload, so changing the shown hour never reloads data: the
 * layer's colour reads the property for the current hour (see `useHeatmapLayer`).
 */
import type { Feature, FeatureCollection, Point } from "geojson";

import { riskLevelFromValue, type RiskLevel } from "@/components/ui/risk";

import type { Heatmap } from "./types";

/** `i` is the point's index into the payload arrays; `h<N>` is its risk level at hour N (-1 = Unknown). */
export type HeatPointProps = { i: number } & { [hour: `h${number}`]: number };

export const UNKNOWN_LEVEL_VALUE = -1;

const METERS_PER_MILE = 1609.344;
const WORLD_METERS_PER_PIXEL_AT_ZOOM_0 = 78271.517; // MapLibre's 512 px tiles: the equator's length / 512
/** Circles are this many grid spacings wide (as a radius), so neighbours overlap and blend into one shaded area. */
const RADIUS_IN_SPACINGS = 1.0;

export const hourKey = (hour: number): `h${number}` => `h${hour}`;

export const heatmapPoints = (heatmap: Heatmap): FeatureCollection<Point, HeatPointProps> => ({
  type: "FeatureCollection",
  features: heatmap.points.map(([lng, lat], i): Feature<Point, HeatPointProps> => {
    const properties: HeatPointProps = { i };
    heatmap.levels[i]?.forEach((level, hour) => {
      properties[hourKey(hour)] = level ?? UNKNOWN_LEVEL_VALUE;
    });
    return { type: "Feature", id: i, properties, geometry: { type: "Point", coordinates: [lng, lat] } };
  }),
});

/** The hour to show first: the departure hour, or hour 0 when the departure is outside the 0–48 h range. */
export const defaultHeatmapHour = (heatmap: Heatmap): number => {
  const hour = heatmap.departure_hour;
  return hour !== null && hour >= 0 && hour < heatmap.hours.length ? hour : 0;
};

/** Keeps an hour inside the payload's range. */
export const clampHeatmapHour = (heatmap: Heatmap, hour: number): number =>
  Math.min(Math.max(Math.round(hour), 0), Math.max(heatmap.hours.length - 1, 0));

/**
 * Circle radius in pixels at zoom 0, for a circle `RADIUS_IN_SPACINGS` grid spacings wide at this latitude.
 * It doubles with every zoom level, so the shading keeps covering the same ground; the map's exponential
 * (base 2) interpolation from zoom 0 to zoom 20 reproduces that exactly.
 */
export const heatRadiusAtZoom0 = (heatmap: Heatmap): number => {
  const lats = heatmap.points.map((p) => p[1]);
  const midLat = lats.length > 0 ? (Math.min(...lats) + Math.max(...lats)) / 2 : 40;
  const meters = RADIUS_IN_SPACINGS * heatmap.spacing_miles * METERS_PER_MILE;
  return meters / (WORLD_METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos((midLat * Math.PI) / 180));
};

export type HeatReading = {
  level: RiskLevel;
  /** Name for display, as the backend sends it ("Severe", "No Travel", "Unknown"). */
  levelName: string;
  time: string;
  windMph: number | null;
  rainInPerHr: number | null;
  snowInPerHr: number | null;
};

const LEVEL_NAMES = ["Low", "Moderate", "High", "Severe", "No Travel"] as const;

/** One grid point's level and weather at one hour, straight from the payload; null if either index is out of range. */
export const heatReading = (heatmap: Heatmap, point: number, hour: number): HeatReading | null => {
  const levels = heatmap.levels[point];
  const time = heatmap.hours[hour];
  if (!levels || time === undefined || hour < 0 || hour >= levels.length) return null;
  const value = levels[hour] ?? null;
  return {
    level: riskLevelFromValue(value),
    levelName: value === null ? "Unknown" : (LEVEL_NAMES[value] ?? "Unknown"),
    time,
    windMph: heatmap.wind_mph[point]?.[hour] ?? null,
    rainInPerHr: heatmap.rain_in_per_hr[point]?.[hour] ?? null,
    snowInPerHr: heatmap.snow_in_per_hr[point]?.[hour] ?? null,
  };
};

/** `hour` is the hour (0–48) the truck is at this position. */
export type TruckProps = { hour: number };

/** One point per hour at the truck's position then, so the map can show the current one with no data change. */
export const truckPoints = (heatmap: Heatmap): FeatureCollection<Point, TruckProps> => ({
  type: "FeatureCollection",
  features: heatmap.truck.positions.map(
    ([lng, lat], hour): Feature<Point, TruckProps> => ({
      type: "Feature",
      properties: { hour },
      geometry: { type: "Point", coordinates: [lng, lat] },
    }),
  ),
});

const NEAR_DEGREES = 0.01; // about 1 km: the backend places the truck exactly on the origin or destination

const isNear = (position: readonly [number, number], place: { lat: number; lng: number }): boolean =>
  Math.abs(position[0] - place.lng) < NEAR_DEGREES && Math.abs(position[1] - place.lat) < NEAR_DEGREES;

export type TruckStatus = "waiting at the origin" | "on the road" | "arrived at the destination";

/**
 * Where the truck is at `hour`, in words (the marker is only visual). The backend holds it at the origin
 * before departure and at the destination after arrival.
 */
export const truckStatus = (
  heatmap: Heatmap,
  hour: number,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): TruckStatus => {
  const position = heatmap.truck.positions[hour];
  if (!position) return "on the road";
  if (isNear(position, origin)) return "waiting at the origin";
  if (isNear(position, destination)) return "arrived at the destination";
  return "on the road";
};
