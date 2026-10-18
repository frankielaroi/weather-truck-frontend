"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_STYLE_URL } from "@/config/map";

import { useHeatmapLayer } from "../hooks/useHeatmapLayer";
import { useRiskColors } from "../hooks/useRiskColors";
import { useTripLayers } from "../hooks/useTripLayers";
import type { Heatmap, Trip } from "../types";

type Props = {
  /** The trip to draw; null shows the plain map. */
  trip: Trip | null;
  /** Index of the highlighted route; its line and markers are full size and the others fade. */
  selectedRouteIndex: number;
  /** Called when the driver clicks a route's line on the map. */
  onSelectRoute?: (index: number) => void;
  /** The corridor heatmap once loaded; drawn under the routes. */
  heatmap: Heatmap | null;
  /** The hour (0–48) of the heatmap to show. */
  heatmapHour: number;
  showHeatmap: boolean;
  className?: string;
};

// Copied to /public by scripts/copy-maplibre-worker.mjs on install; the bundler can't locate MapLibre's worker itself.
const WORKER_PATH = "/maplibre/maplibre-gl-worker.mjs";

const hasWebGL = (): boolean => {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
};

/**
 * The map with a trip's routes and checkpoints on it: pan and zoom by mouse, touch or keyboard
 * (focus the map, then arrows and +/-). Browser-only, so load it through `TripMap`.
 */
const MapCanvas = ({ trip, selectedRouteIndex, onSelectRoute, heatmap, heatmapHour, showHeatmap, className = "" }: Props): React.ReactElement => {
  const container = useRef<HTMLDivElement>(null);
  const [supported] = useState(hasWebGL); // runs in the browser only: this module is never server-rendered
  const [map, setMap] = useState<MapLibreMap | null>(null); // set once the base style has loaded (not the tiles, which can be slow)
  const colors = useRiskColors();

  useTripLayers(map, trip, selectedRouteIndex, colors, onSelectRoute);
  useHeatmapLayer(map, heatmap, heatmapHour, showHeatmap, colors); // after the route layers, so it can go under them

  useEffect(() => {
    const element = container.current;
    if (!supported || !element) return;
    setWorkerUrl(new URL(WORKER_PATH, window.location.origin).href);
    const created = new MapLibreMap({
      container: element,
      style: MAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: { compact: true },
    });
    created.addControl(new NavigationControl({ showCompass: false }), "top-right");
    created.touchZoomRotate.disableRotation(); // north stays up, so route letters and risk colours read the same
    created.dragRotate.disable();
    created.once("style.load", () => setMap(created));
    return () => {
      setMap(null);
      created.remove();
    };
  }, [supported]);

  if (!supported) {
    return (
      <div role="alert" className={`flex items-center justify-center p-6 text-center text-sm ${className}`}>
        This browser can’t show the map. Your routes and risk levels are still listed below.
      </div>
    );
  }
  return <div ref={container} className={className} />;
};

export default MapCanvas;
