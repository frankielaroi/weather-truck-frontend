"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";

import { getHeatmap } from "../api";
import type { Heatmap } from "../types";

type Loaded = { tripId: number; attempt: number; heatmap: Heatmap | null; error: ApiError | null };

export type HeatmapState = {
  status: "idle" | "loading" | "ready" | "error";
  heatmap: Heatmap | null;
  error: ApiError | null;
  /** Try the request again after an error. */
  retry: () => void;
};

/**
 * A trip's heatmap, loaded separately from the trip so the routes show first: `const { status, heatmap } = useHeatmap(trip.id)`.
 * It's fetched once per trip and kept in memory (`getHeatmap`), so showing and hiding it, or moving through
 * the hours, never loads it again. Pass null while there is no trip to load for.
 */
export const useHeatmap = (tripId: number | null): HeatmapState => {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (tripId === null) return;
    let cancelled = false;
    getHeatmap(tripId)
      .then((heatmap) => {
        if (!cancelled) setLoaded({ tripId, attempt, heatmap, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof ApiError ? err : new ApiError("server", "The weather heatmap couldn't be loaded.");
        setLoaded({ tripId, attempt, heatmap: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, attempt]);

  const retry = (): void => setAttempt((n) => n + 1);
  if (tripId === null) return { status: "idle", heatmap: null, error: null, retry };
  // An answer only counts for the trip and attempt it was asked for; anything else is still loading.
  if (!loaded || loaded.tripId !== tripId || loaded.attempt !== attempt) return { status: "loading", heatmap: null, error: null, retry };
  if (loaded.error) return { status: "error", heatmap: null, error: loaded.error, retry };
  return { status: "ready", heatmap: loaded.heatmap, error: null, retry };
};
