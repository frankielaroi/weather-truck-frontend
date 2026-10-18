"use client";

import { useEffect, useRef } from "react";
import { Popup, type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";
import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { FeatureCollection } from "geojson";

import { buildHeatmapTooltip } from "../components/heatmap-tooltip";
import { heatmapPoints, heatReading, heatRadiusAtZoom0, type HeatPointProps } from "../heatmap-data";
import type { Heatmap } from "../types";
import type { HourStore } from "./useHourStore";
import { HOUR_STATE } from "./useMapHour";
import type { RiskColors } from "./useRiskColors";

const SOURCE = "trip-heatmap";
const LAYER = "heatmap";
/** The first route layer; the heatmap goes just under it, below every route line and marker. */
const BELOW = "route-casing-other";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

// Each level's strength: the worse the weather, the stronger the shading. All semi-transparent so the base map reads through.
const OPACITY = { low: 0.22, moderate: 0.34, high: 0.42, severe: 0.5, noTravel: 0.56, unknown: 0.4 } as const;

/** The risk level (0–4, or -1 for Unknown) of the hour being shown, read from the point's own `h<N>` property. */
const levelNow: ExpressionSpecification = ["get", ["concat", "h", ["to-string", ["global-state", HOUR_STATE]]]];

// The style spec's tuple types can't follow built-up arms, so these expressions are cast.
const byLevel = (low: string | number, moderate: string | number, high: string | number, severe: string | number, noTravel: string | number, unknown: string | number): ExpressionSpecification =>
  ["match", levelNow, 0, low, 1, moderate, 2, high, 3, severe, 4, noTravel, unknown] as unknown as ExpressionSpecification;

const radiusExpression = (heatmap: Heatmap): ExpressionSpecification => {
  const c0 = heatRadiusAtZoom0(heatmap);
  // Exponential (base 2) from zoom 0 to zoom 20 is exactly c0 * 2^zoom: the circles cover the same ground at every zoom.
  return ["interpolate", ["exponential", 2], ["zoom"], 0, c0, 20, c0 * 2 ** 20];
};

const setData = (map: MapLibreMap, data: FeatureCollection): void => {
  map.getSource<GeoJSONSource>(SOURCE)?.setData(data);
};

/**
 * Draws the corridor heatmap for one hour under the routes: a soft, semi-transparent circle per grid point,
 * coloured by its risk level with the F1 colours, blending into one shaded area. All 49 hours of level are
 * uploaded once; the shown hour is a global-state value that the colour reads (set by `useMapHour`), so moving
 * through the hours loads and re-tiles nothing. Hovering shows the point's level and weather for the shown
 * hour, and follows the hour while the slider moves. `visible` shows or hides it instantly.
 * Add after `useTripLayers`, so the route layers already exist.
 */
export const useHeatmapLayer = (map: MapLibreMap | null, heatmap: Heatmap | null, hourStore: HourStore, visible: boolean, colors: RiskColors): void => {
  const heatmapRef = useRef<Heatmap | null>(heatmap);
  const storeRef = useRef(hourStore);
  const visibleRef = useRef(visible);
  const tooltip = useRef<Popup | null>(null);
  const refreshTooltip = useRef<(() => void) | null>(null);

  useEffect(() => {
    heatmapRef.current = heatmap;
    storeRef.current = hourStore;
    visibleRef.current = visible;
  }, [heatmap, hourStore, visible]);

  // Once per map: the source, the layer, and the hover tooltip.
  useEffect(() => {
    if (!map) return;
    map.addSource(SOURCE, { type: "geojson", data: EMPTY });
    map.addLayer(
      { id: LAYER, type: "circle", source: SOURCE, layout: { visibility: "none" }, paint: { "circle-blur": 1, "circle-radius": 8 } },
      map.getLayer(BELOW) ? BELOW : undefined,
    );

    let frame = 0;
    let shown = "";
    let last: MapMouseEvent | null = null; // where the mouse is, so the tooltip can follow the hour
    const hide = (): void => {
      tooltip.current?.remove();
      shown = "";
    };
    const update = (e: MapMouseEvent): void => {
      frame = 0;
      const data = heatmapRef.current;
      // The cursor is a pointer over a marker or a route line; leave those to their own click handling.
      if (!data || !visibleRef.current || map.getCanvas().style.cursor === "pointer") return hide();
      const { x, y } = e.point;
      let nearest = -1;
      let nearestDistance = Infinity;
      for (const hit of map.queryRenderedFeatures([[x - 1, y - 1], [x + 1, y + 1]], { layers: [LAYER] })) {
        if (hit.geometry.type !== "Point") continue;
        const at = map.project(hit.geometry.coordinates as [number, number]);
        const distance = Math.hypot(at.x - x, at.y - y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = (hit.properties as HeatPointProps).i;
        }
      }
      const hour = storeRef.current.get();
      const reading = nearest >= 0 ? heatReading(data, nearest, hour) : null;
      if (!reading) return hide();
      const key = `${nearest}:${hour}`;
      tooltip.current ??= new Popup({ closeButton: false, closeOnClick: false, closeOnMove: false, offset: 14, maxWidth: "240px", className: "heat-tip" });
      tooltip.current.setLngLat(e.lngLat);
      if (key !== shown) tooltip.current.setDOMContent(buildHeatmapTooltip(reading));
      shown = key;
      tooltip.current.addTo(map);
    };
    map.on("mousemove", (e) => {
      last = e;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => update(e)); // at most one update per frame while the mouse moves
    });
    map.on("mouseout", () => {
      last = null;
      cancelAnimationFrame(frame);
      hide();
    });
    refreshTooltip.current = () => {
      if (!last || shown === "") return;
      const event = last;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => update(event));
    };
  }, [map]);

  // New trip: replace the points and size the circles to its grid spacing.
  useEffect(() => {
    if (!map) return;
    tooltip.current?.remove();
    setData(map, heatmap ? heatmapPoints(heatmap) : EMPTY);
    if (heatmap) map.setPaintProperty(LAYER, "circle-radius", radiusExpression(heatmap));
  }, [map, heatmap]);

  // The F1 colours, re-read when the light/dark setting changes.
  useEffect(() => {
    if (!map) return;
    map.setPaintProperty(LAYER, "circle-color", byLevel(colors.low, colors.moderate, colors.high, colors.severe, colors.no_travel, colors.unknown));
    map.setPaintProperty(LAYER, "circle-opacity", byLevel(OPACITY.low, OPACITY.moderate, OPACITY.high, OPACITY.severe, OPACITY.noTravel, OPACITY.unknown));
  }, [map, colors]);

  // While the slider moves, an open tooltip shows the new hour's values.
  useEffect(() => hourStore.subscribe(() => refreshTooltip.current?.()), [hourStore]);

  // On or off, instantly.
  useEffect(() => {
    if (!map) return;
    map.setLayoutProperty(LAYER, "visibility", visible && heatmap ? "visible" : "none");
    if (!visible) tooltip.current?.remove();
  }, [map, visible, heatmap]);
};
