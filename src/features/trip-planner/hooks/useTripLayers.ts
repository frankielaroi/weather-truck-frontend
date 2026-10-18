"use client";

import { useEffect, useRef } from "react";
import { LngLatBounds, Popup, type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";
import type { ExpressionSpecification, LayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { FeatureCollection } from "geojson";

import { RISK_LEVELS, type RiskLevel } from "@/components/ui/risk";

import { buildCheckpointPopup } from "../components/checkpoint-popup";
import { checkpointPoints, routeBadges, routeLines, tripBounds, type CheckpointProps, type RouteLineProps } from "../map-data";
import type { Trip } from "../types";
import type { RiskColors } from "./useRiskColors";

const LINES = "trip-routes";
const POINTS = "trip-checkpoints";
const BADGES = "trip-route-badges";
const CHECKPOINTS = "checkpoints";

/** Marker radii in pixels: the selected route's markers are bigger. */
const MARKER_RADIUS = { selected: 7, other: 4.5 } as const;
/** How far past a marker's edge, and a route line's edge, a click or tap still counts, so they're easy to hit on a phone. */
const MARKER_SLACK_PX = 4;
const LINE_HIT_PX = 6;

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

// Every route has a faded base line. The selected route is drawn again on top, full strength, so its line
// comes to the front; the recommended route is always the thickest.
const WIDTH = { other: 3.5, otherSelected: 5, recommended: 5.5, recommendedSelected: 7, casing: 3 } as const;
const DASH = [2, 1.4]; // alternatives are dashed, so they differ from the recommended route without relying on colour

const BASE_LINES = ["route-line-other", "route-line-recommended"] as const;
const LINE_LAYERS = [...BASE_LINES, "selected-line-other", "selected-line-recommended"] as const;

const prefersReducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const OTHER: ExpressionSpecification = ["!", ["get", "recommended"]];
const RECOMMENDED: ExpressionSpecification = ["get", "recommended"];

const line = (
  id: string,
  filter: ExpressionSpecification,
  paint: Extract<LayerSpecification, { type: "line" }>["paint"],
  rounded: boolean,
): LayerSpecification => ({
  id,
  type: "line",
  source: LINES,
  filter,
  layout: { "line-join": "round", ...(rounded ? { "line-cap": "round" as const } : {}) },
  paint,
});

const casing = (width: number, opacity: number): Extract<LayerSpecification, { type: "line" }>["paint"] => ({
  "line-width": width + WIDTH.casing,
  "line-color": "#ffffff",
  "line-opacity": opacity,
});

/** The layers, bottom to top. Colours and the selection are applied afterwards by `applyColors` / `applySelection`. */
const layers = (): LayerSpecification[] => [
  line("route-casing-other", OTHER, casing(WIDTH.other, 0.6), false),
  line("route-line-other", OTHER, { "line-width": WIDTH.other, "line-dasharray": DASH, "line-opacity": 0.65 }, false),
  line("route-casing-recommended", RECOMMENDED, casing(WIDTH.recommended, 0.6), true),
  line("route-line-recommended", RECOMMENDED, { "line-width": WIDTH.recommended, "line-opacity": 0.85 }, true),
  // The selected route again, on top of everything else; its filter follows the selection.
  line("selected-casing-other", OTHER, casing(WIDTH.otherSelected, 0.95), false),
  line("selected-line-other", OTHER, { "line-width": WIDTH.otherSelected, "line-dasharray": DASH }, false),
  line("selected-casing-recommended", RECOMMENDED, casing(WIDTH.recommendedSelected, 0.95), true),
  line("selected-line-recommended", RECOMMENDED, { "line-width": WIDTH.recommendedSelected }, true),
  { id: CHECKPOINTS, type: "circle", source: POINTS, paint: {} },
  { id: "route-badge-ring", type: "circle", source: BADGES, paint: { "circle-color": "#ffffff" } },
  {
    id: "route-badge-letter",
    type: "symbol",
    source: BADGES,
    layout: { "text-field": ["get", "letter"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true, "text-ignore-placement": true },
    paint: {},
  },
];

/** Colours from the risk palette: they change with the light/dark setting, never with the selection. */
const applyColors = (map: MapLibreMap, colors: RiskColors): void => {
  const outline = colors.outline;
  // ["match", level, "low", a, "moderate", b, ..., fallback]: one value per level, Unknown as the fallback.
  // Cast because the style spec's tuple types can't follow a spread of arms.
  const byLevel = <T extends string | number>(pick: (level: RiskLevel) => T): ExpressionSpecification =>
    [
      "match",
      ["get", "level"],
      ...RISK_LEVELS.filter((level) => level !== "unknown").flatMap((level) => [level, pick(level)]),
      pick("unknown"),
    ] as unknown as ExpressionSpecification;

  for (const id of LINE_LAYERS) map.setPaintProperty(id, "line-color", outline);
  // Markers are filled with the level's colour; Unknown is a hollow ring so it never reads as Low.
  map.setPaintProperty(CHECKPOINTS, "circle-color", byLevel((level) => (level === "unknown" ? "#ffffff" : colors[level])));
  map.setPaintProperty(CHECKPOINTS, "circle-stroke-color", byLevel((level) => (level === "unknown" ? colors.unknown : outline)));
  map.setPaintProperty(CHECKPOINTS, "circle-stroke-width", byLevel((level) => (level === "unknown" ? 3 : 1.5)));
  map.setPaintProperty("route-badge-ring", "circle-stroke-color", outline);
  map.setPaintProperty("route-badge-letter", "text-color", outline);
};

/** Everything that depends on which route is selected, and nothing else. */
const applySelection = (map: MapLibreMap, selected: number): void => {
  const isSelected: ExpressionSpecification = ["==", ["get", "index"], selected];
  map.setFilter("selected-casing-other", ["all", isSelected, OTHER]);
  map.setFilter("selected-line-other", ["all", isSelected, OTHER]);
  map.setFilter("selected-casing-recommended", ["all", isSelected, RECOMMENDED]);
  map.setFilter("selected-line-recommended", ["all", isSelected, RECOMMENDED]);

  const point = (on: number, off: number): ExpressionSpecification => ["case", ["==", ["get", "route"], selected], on, off];
  map.setPaintProperty(CHECKPOINTS, "circle-radius", point(MARKER_RADIUS.selected, MARKER_RADIUS.other));
  map.setPaintProperty(CHECKPOINTS, "circle-opacity", point(1, 0.6));
  map.setPaintProperty(CHECKPOINTS, "circle-stroke-opacity", point(1, 0.6));
  map.setLayoutProperty(CHECKPOINTS, "circle-sort-key", point(1, 0)); // the selected route's markers draw on top
  map.setPaintProperty("route-badge-ring", "circle-radius", ["case", isSelected, 13, 10]);
  map.setPaintProperty("route-badge-ring", "circle-stroke-width", ["case", isSelected, 3, 2]);
};

const setData = (map: MapLibreMap, source: string, data: FeatureCollection): void => {
  map.getSource<GeoJSONSource>(source)?.setData(data);
};

const box = (e: MapMouseEvent, radius: number): [[number, number], [number, number]] => [
  [e.point.x - radius, e.point.y - radius],
  [e.point.x + radius, e.point.y + radius],
];

/**
 * The marker a click or tap is on (within `MARKER_SLACK_PX` of its edge), nearest first. Markers can sit a
 * few pixels apart when zoomed out, so a click between them falls through to the route line underneath.
 */
const checkpointAt = (map: MapLibreMap, e: MapMouseEvent, selected: number): CheckpointProps | null => {
  const reach = MARKER_RADIUS.selected + MARKER_SLACK_PX;
  let nearest: CheckpointProps | null = null;
  let nearestDistance = Infinity;
  for (const hit of map.queryRenderedFeatures(box(e, reach), { layers: [CHECKPOINTS] })) {
    if (hit.geometry.type !== "Point") continue;
    const props = hit.properties as CheckpointProps;
    const radius = props.route === selected ? MARKER_RADIUS.selected : MARKER_RADIUS.other;
    const at = map.project(hit.geometry.coordinates as [number, number]);
    const distance = Math.hypot(at.x - e.point.x, at.y - e.point.y);
    if (distance <= radius + MARKER_SLACK_PX && distance < nearestDistance) {
      nearestDistance = distance;
      nearest = props;
    }
  }
  return nearest;
};

/** The routes whose line passes under a click or tap. */
const routesAt = (map: MapLibreMap, e: MapMouseEvent): number[] => {
  const hits = map.queryRenderedFeatures(box(e, LINE_HIT_PX), { layers: [...BASE_LINES] });
  return [...new Set(hits.map((hit) => (hit.properties as RouteLineProps).index))];
};

/**
 * Draws a trip on the map: the route lines (the selected route on top, the recommended one thickest), a marker
 * per checkpoint coloured by risk, a letter badge per route, a popup with the details when a marker is clicked,
 * and `onSelectRoute` when a route's line is clicked. Sources and layers are added once and updated in place:
 * a new trip calls `setData`, a new selection only changes filters and style, a colour-scheme change only
 * colours. `map` is null until its style has loaded.
 */
export const useTripLayers = (
  map: MapLibreMap | null,
  trip: Trip | null,
  selected: number,
  colors: RiskColors,
  onSelectRoute?: (index: number) => void,
): void => {
  const tripRef = useRef<Trip | null>(trip);
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelectRoute);
  const popup = useRef<Popup | null>(null);

  useEffect(() => {
    tripRef.current = trip;
    selectedRef.current = selected;
    onSelectRef.current = onSelectRoute;
  }, [trip, selected, onSelectRoute]);

  // Once per map: sources, layers, and clicks.
  useEffect(() => {
    if (!map) return;
    map.addSource(LINES, { type: "geojson", data: EMPTY });
    map.addSource(POINTS, { type: "geojson", data: EMPTY });
    map.addSource(BADGES, { type: "geojson", data: EMPTY });
    for (const layer of layers()) map.addLayer(layer);

    map.on("click", (e) => {
      const hit = checkpointAt(map, e, selectedRef.current);
      if (hit) {
        const route = tripRef.current?.routes.find((r) => r.index === hit.route);
        const checkpoint = route?.checkpoints.find((c) => c.sequence === hit.sequence);
        if (!route || !checkpoint) return;
        popup.current?.remove();
        popup.current = new Popup({ closeButton: true, maxWidth: "300px", offset: 10 })
          .setLngLat([checkpoint.lng, checkpoint.lat])
          .setDOMContent(buildCheckpointPopup(route, checkpoint))
          .addTo(map);
        return;
      }
      // Where routes share a road, clicking again picks the next one, so every route can be reached.
      const routes = routesAt(map, e);
      const next = routes.find((index) => index !== selectedRef.current) ?? routes[0];
      if (next !== undefined && next !== selectedRef.current) onSelectRef.current?.(next);
    });
    map.on("mousemove", (e) => {
      map.getCanvas().style.cursor = checkpointAt(map, e, selectedRef.current) || routesAt(map, e).length > 0 ? "pointer" : "";
    });
  }, [map]);

  // New trip: replace the data, close any popup, and fit the view to every route.
  useEffect(() => {
    if (!map) return;
    popup.current?.remove();
    setData(map, LINES, trip ? routeLines(trip) : EMPTY);
    setData(map, POINTS, trip ? checkpointPoints(trip) : EMPTY);
    setData(map, BADGES, trip ? routeBadges(trip) : EMPTY);
    const bounds = trip ? tripBounds(trip) : null;
    if (bounds) {
      map.fitBounds(new LngLatBounds(bounds[0], bounds[1]), { padding: 48, maxZoom: 12, duration: prefersReducedMotion() ? 0 : 700 });
    }
  }, [map, trip]);

  // The effects below are separate so each runs only when its own input changes.
  useEffect(() => {
    if (map) applyColors(map, colors);
  }, [map, colors]);

  useEffect(() => {
    if (map) applySelection(map, selected);
  }, [map, selected]);
};
