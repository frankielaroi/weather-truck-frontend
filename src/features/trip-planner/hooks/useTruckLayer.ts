"use client";

import { useEffect } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { FeatureCollection } from "geojson";

import { truckPoints } from "../heatmap-data";
import type { Heatmap } from "../types";
import { HOUR_STATE } from "./useMapHour";
import type { RiskColors } from "./useRiskColors";

const SOURCE = "trip-truck";
const MARKER = "truck";
const LABEL = "truck-label";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** True for the one point whose hour is the shown hour. */
const isShownHour: ExpressionSpecification = ["==", ["get", "hour"], ["global-state", HOUR_STATE]];

/**
 * The truck on the recommended route at the shown hour. All 49 hourly positions are loaded once; the layers
 * show only the point for the current hour (radius and text opacity read the shown hour), so changing the hour
 * moves the truck with no data change. It sits at the origin before departure and at the destination after
 * arrival, because that's where the backend puts it. Add last, so it draws above everything else.
 */
export const useTruckLayer = (map: MapLibreMap | null, heatmap: Heatmap | null, colors: RiskColors): void => {
  // Once per map: the source and its two layers.
  useEffect(() => {
    if (!map) return;
    map.addSource(SOURCE, { type: "geojson", data: EMPTY });
    map.addLayer({
      id: MARKER,
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": ["case", isShownHour, 9, 0],
        "circle-color": "#111418",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["case", isShownHour, 3, 0],
      },
    });
    map.addLayer({
      id: LABEL,
      type: "symbol",
      source: SOURCE,
      layout: {
        "text-field": "Truck",
        "text-font": ["Noto Sans Bold"],
        "text-size": 12,
        "text-anchor": "top",
        "text-offset": [0, 1.1],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": "#111418", "text-halo-color": "#ffffff", "text-halo-width": 2, "text-opacity": ["case", isShownHour, 1, 0] },
    });
  }, [map]);

  // New trip: replace the 49 positions.
  useEffect(() => {
    if (map) map.getSource<GeoJSONSource>(SOURCE)?.setData(heatmap ? truckPoints(heatmap) : EMPTY);
  }, [map, heatmap]);

  useEffect(() => {
    if (!map) return;
    map.setPaintProperty(MARKER, "circle-color", colors.outline);
    map.setPaintProperty(LABEL, "text-color", colors.outline);
  }, [map, colors]);
};
