"use client";

import { useEffect, useRef } from "react";
import { LngLatBounds, Popup, type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";
import type { ExpressionSpecification, LayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { FeatureCollection } from "geojson";

import { RISK_LEVELS, type RiskLevel } from "@/components/ui/risk";

import { buildCheckpointPopup } from "../components/checkpoint-popup";
import { checkpointPoints, routeBadges, routeLines, tripBounds, type CheckpointProps } from "../map-data";
import type { Trip } from "../types";
import type { RiskColors } from "./useRiskColors";

const LINES = "trip-routes";
const POINTS = "trip-checkpoints";
const BADGES = "trip-route-badges";
const CHECKPOINTS = "checkpoints";

/** Pixels around a click or tap that still count as hitting a marker, so they're easy to hit on a phone. */
const HIT_RADIUS_PX = 8;

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

// The recommended route is always the thickest and sits on top; the selected route grows a little.
const WIDTH = { other: 3.5, otherSelected: 5, recommended: 5.5, recommendedSelected: 7, casing: 3 } as const;

const prefersReducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The sources' layers, bottom to top. Paint values that depend on colours or selection are set by `applyStyle`. */
const layers = (): LayerSpecification[] => [
  { id: "route-casing-other", type: "line", source: LINES, filter: ["!", ["get", "recommended"]], layout: { "line-join": "round" }, paint: { "line-color": "#ffffff" } },
  // Dashed, so the alternatives differ from the recommended route without relying on colour.
  { id: "route-line-other", type: "line", source: LINES, filter: ["!", ["get", "recommended"]], layout: { "line-join": "round" }, paint: { "line-dasharray": [2, 1.4] } },
  { id: "route-casing-recommended", type: "line", source: LINES, filter: ["get", "recommended"], layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ffffff" } },
  { id: "route-line-recommended", type: "line", source: LINES, filter: ["get", "recommended"], layout: { "line-join": "round", "line-cap": "round" }, paint: {} },
  { id: CHECKPOINTS, type: "circle", source: POINTS, paint: {} },
  { id: "route-badge-ring", type: "circle", source: BADGES, paint: { "circle-radius": 11, "circle-color": "#ffffff", "circle-stroke-width": 2 } },
  {
    id: "route-badge-letter",
    type: "symbol",
    source: BADGES,
    layout: { "text-field": ["get", "letter"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true, "text-ignore-placement": true },
    paint: {},
  },
];

/** Colours and sizes that depend on the risk palette or on which route is selected. */
const applyStyle = (map: MapLibreMap, colors: RiskColors, selected: number): void => {
  const line = colors.outline;
  const lineIsSelected: ExpressionSpecification = ["==", ["get", "index"], selected];
  const lineValue = (on: number, off: number): ExpressionSpecification => ["case", lineIsSelected, on, off];
  const pointValue = (on: number, off: number): ExpressionSpecification => ["case", ["==", ["get", "route"], selected], on, off];
  // ["match", level, "low", a, "moderate", b, ..., fallback]: one value per level, Unknown as the fallback.
  // Cast because the style spec's tuple types can't follow a spread of arms.
  const byLevel = <T extends string | number>(pick: (level: RiskLevel) => T): ExpressionSpecification =>
    [
      "match",
      ["get", "level"],
      ...RISK_LEVELS.filter((level) => level !== "unknown").flatMap((level) => [level, pick(level)]),
      pick("unknown"),
    ] as unknown as ExpressionSpecification;

  map.setPaintProperty("route-line-other", "line-color", line);
  map.setPaintProperty("route-line-other", "line-width", lineValue(WIDTH.otherSelected, WIDTH.other));
  map.setPaintProperty("route-line-other", "line-opacity", lineValue(1, 0.65));
  map.setPaintProperty("route-casing-other", "line-width", lineValue(WIDTH.otherSelected + WIDTH.casing, WIDTH.other + WIDTH.casing));
  map.setPaintProperty("route-casing-other", "line-opacity", lineValue(0.95, 0.6));
  map.setPaintProperty("route-line-recommended", "line-color", line);
  map.setPaintProperty("route-line-recommended", "line-width", lineValue(WIDTH.recommendedSelected, WIDTH.recommended));
  map.setPaintProperty("route-casing-recommended", "line-width", lineValue(WIDTH.recommendedSelected + WIDTH.casing, WIDTH.recommended + WIDTH.casing));

  // Markers are filled with the level's colour; Unknown is a hollow ring so it never reads as Low.
  map.setPaintProperty(CHECKPOINTS, "circle-color", byLevel((level) => (level === "unknown" ? "#ffffff" : colors[level])));
  map.setPaintProperty(CHECKPOINTS, "circle-stroke-color", byLevel((level) => (level === "unknown" ? colors.unknown : line)));
  map.setPaintProperty(CHECKPOINTS, "circle-stroke-width", byLevel((level) => (level === "unknown" ? 3 : 1.5)));
  map.setPaintProperty(CHECKPOINTS, "circle-radius", pointValue(7, 4.5));
  map.setPaintProperty(CHECKPOINTS, "circle-opacity", pointValue(1, 0.6));
  map.setPaintProperty(CHECKPOINTS, "circle-stroke-opacity", pointValue(1, 0.6));
  map.setLayoutProperty(CHECKPOINTS, "circle-sort-key", pointValue(1, 0)); // the selected route's markers draw on top

  map.setPaintProperty("route-badge-ring", "circle-stroke-color", line);
  map.setPaintProperty("route-badge-letter", "text-color", line);
};

const setData = (map: MapLibreMap, source: string, data: FeatureCollection): void => {
  map.getSource<GeoJSONSource>(source)?.setData(data);
};

/** The marker nearest to a click or tap, within `HIT_RADIUS_PX`; markers can sit a few pixels apart when zoomed out. */
const checkpointAt = (map: MapLibreMap, e: MapMouseEvent): CheckpointProps | null => {
  const { x, y } = e.point;
  const box: [[number, number], [number, number]] = [
    [x - HIT_RADIUS_PX, y - HIT_RADIUS_PX],
    [x + HIT_RADIUS_PX, y + HIT_RADIUS_PX],
  ];
  let nearest: CheckpointProps | null = null;
  let nearestDistance = Infinity;
  for (const hit of map.queryRenderedFeatures(box, { layers: [CHECKPOINTS] })) {
    if (hit.geometry.type !== "Point") continue;
    const at = map.project(hit.geometry.coordinates as [number, number]);
    const distance = Math.hypot(at.x - x, at.y - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = hit.properties as CheckpointProps;
    }
  }
  return nearest;
};

/**
 * Draws a trip on the map: the route lines (recommended thickest and on top), a marker per checkpoint
 * coloured by risk, a letter badge per route, and a popup with the details when a marker is clicked.
 * Sources and layers are added once and updated in place, so a new trip, a new selection or a colour
 * scheme change never rebuilds the map. `map` is null until its style has loaded.
 */
export const useTripLayers = (map: MapLibreMap | null, trip: Trip | null, selected: number, colors: RiskColors): void => {
  const tripRef = useRef<Trip | null>(trip);
  const popup = useRef<Popup | null>(null);

  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);

  // Once per map: sources, layers and marker clicks.
  useEffect(() => {
    if (!map) return;
    map.addSource(LINES, { type: "geojson", data: EMPTY });
    map.addSource(POINTS, { type: "geojson", data: EMPTY });
    map.addSource(BADGES, { type: "geojson", data: EMPTY });
    for (const layer of layers()) map.addLayer(layer);

    map.on("click", (e) => {
      const hit = checkpointAt(map, e);
      const route = tripRef.current?.routes.find((r) => r.index === hit?.route);
      const checkpoint = route?.checkpoints.find((c) => c.sequence === hit?.sequence);
      if (!route || !checkpoint) return;
      popup.current?.remove();
      popup.current = new Popup({ closeButton: true, maxWidth: "300px", offset: 10 })
        .setLngLat([checkpoint.lng, checkpoint.lat])
        .setDOMContent(buildCheckpointPopup(route, checkpoint))
        .addTo(map);
    });
    map.on("mousemove", (e) => {
      map.getCanvas().style.cursor = checkpointAt(map, e) ? "pointer" : "";
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

  // Colours or selection changed: restyle in place.
  useEffect(() => {
    if (map) applyStyle(map, colors, selected);
  }, [map, colors, selected]);
};
