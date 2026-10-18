"use client";

import { useMemo, useSyncExternalStore } from "react";

import { defaultHeatmapHour } from "../heatmap-data";
import type { Heatmap } from "../types";

/**
 * The hour (0–48) the heatmap and the truck are showing, kept outside React state on purpose: dragging the
 * slider changes it dozens of times a second, and only the slider's own text and the map need to know. The
 * slider re-renders through `useHour`; the map is updated directly (`useMapHour`), with no page re-render.
 */
export type HourStore = {
  get: () => number;
  /** Sets the hour (rounded and kept inside 0–max; anything that isn't a number is ignored). Listeners run only if it changed. */
  set: (hour: number) => void;
  /** The last valid hour. */
  max: number;
  subscribe: (listener: () => void) => () => void;
};

export const createHourStore = (initial: number, max = 48): HourStore => {
  const clamp = (value: number): number => Math.min(Math.max(Math.round(value), 0), max);
  let hour = Number.isFinite(initial) ? clamp(initial) : 0;
  const listeners = new Set<() => void>();
  return {
    get: () => hour,
    set: (next) => {
      if (!Number.isFinite(next)) return; // not a number: keep the current hour
      const clamped = clamp(next);
      if (clamped === hour) return;
      hour = clamped;
      for (const listener of [...listeners]) listener();
    },
    max,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

/** A store for one heatmap's hour, starting at the departure hour; a new trip's heatmap gets a fresh store. */
export const useHourStore = (heatmap: Heatmap | null): HourStore =>
  useMemo(
    () => createHourStore(heatmap ? defaultHeatmapHour(heatmap) : 0, heatmap ? heatmap.hours.length - 1 : 48),
    [heatmap],
  );

/** The current hour, re-rendering the caller when it changes: `const hour = useHour(store)`. */
export const useHour = (store: HourStore): number => useSyncExternalStore(store.subscribe, store.get, store.get);
