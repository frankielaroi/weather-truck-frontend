import { apiGet, apiPost } from "@/lib/api";

import type { CreateTripInput, Heatmap, PlaceSuggestion, PlaceSuggestions, Trip } from "./types";

/** Plans a trip (`POST /trips/`); the backend runs the whole job and returns the full trip. */
export const createTrip = (input: CreateTripInput, signal?: AbortSignal): Promise<Trip> =>
  apiPost<Trip>("/trips/", input, { signal });

/** A saved trip (`GET /trips/:id/`), for reloading or a shared link. */
export const getTrip = (id: number, signal?: AbortSignal): Promise<Trip> => apiGet<Trip>(`/trips/${id}/`, { signal });

const heatmaps = new Map<number, Promise<Heatmap>>();

/**
 * A trip's corridor heatmap (`GET /trips/:id/heatmap/`, B12), fetched once per
 * trip and kept in memory: later calls, and calls while it's loading, share the
 * same request. A failed load is forgotten so it can be retried.
 */
export const getHeatmap = (tripId: number): Promise<Heatmap> => {
  const cached = heatmaps.get(tripId);
  if (cached) return cached;
  const pending = apiGet<Heatmap>(`/trips/${tripId}/heatmap/`).catch((err: unknown) => {
    heatmaps.delete(tripId);
    throw err;
  });
  heatmaps.set(tripId, pending);
  return pending;
};

/** Up to 5 US places matching `query` (`GET /places/?q=`). */
export const searchPlaces = async (query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> => {
  const { results } = await apiGet<PlaceSuggestions>(`/places/?q=${encodeURIComponent(query)}`, { signal });
  return results;
};
