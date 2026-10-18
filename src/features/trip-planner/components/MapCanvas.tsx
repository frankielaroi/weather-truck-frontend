"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_STYLE_URL } from "@/config/map";

type Props = {
  /** Called once with the map when its style has loaded; the route, checkpoint and heatmap layers attach here. */
  onMapReady?: (map: MapLibreMap) => void;
  className?: string;
};

// Copied to /public by scripts/copy-maplibre-worker.mjs on install; the bundler can't locate MapLibre's worker itself.
const WORKER_PATH = "/maplibre/maplibre-gl-worker.mjs";

const hasWebGL = (): boolean => {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
};

/**
 * The base map: pan and zoom by mouse, touch or keyboard (focus it, then arrows and +/-).
 * Browser-only, so load it through `TripMap`: `<MapCanvas onMapReady={addLayers} />`.
 */
const MapCanvas = ({ onMapReady, className = "" }: Props): React.ReactElement => {
  const container = useRef<HTMLDivElement>(null);
  const [supported] = useState(hasWebGL); // runs in the browser only: this module is never server-rendered
  const ready = useRef(onMapReady);

  useEffect(() => {
    ready.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    const element = container.current;
    if (!supported || !element) return;
    setWorkerUrl(new URL(WORKER_PATH, window.location.origin).href);
    const map = new MapLibreMap({
      container: element,
      style: MAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.touchZoomRotate.disableRotation(); // north stays up, so route letters and risk colours read the same
    map.dragRotate.disable();
    map.once("load", () => ready.current?.(map));
    return () => map.remove();
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
