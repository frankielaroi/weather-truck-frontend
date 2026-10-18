"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { HourStore } from "./useHourStore";

/** The map's global-state name for the shown hour; layers read it with `["global-state", HOUR_STATE]`. */
export const HOUR_STATE = "heatHour";

/**
 * Keeps the map's shown hour in step with the store: one number, set directly, so moving through the hours
 * loads nothing, rebuilds nothing, and never goes through a React render. Call it before the layer hooks.
 */
export const useMapHour = (map: MapLibreMap | null, store: HourStore): void => {
  useEffect(() => {
    if (!map) return;
    const apply = (): void => {
      map.setGlobalStateProperty(HOUR_STATE, store.get());
    };
    apply();
    return store.subscribe(apply);
  }, [map, store]);
};
