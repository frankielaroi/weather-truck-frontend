import { ApiError } from "@/lib/api";

import type { PlaceSuggestion } from "./types";

export const PLACE_SEARCH_DELAY_MS = 250;
/** Same rule as the backend: fewer than 3 letters returns nothing, so don't ask. */
export const PLACE_SEARCH_MIN_LENGTH = 3;

export type PlaceSearchState = {
  status: "idle" | "loading" | "done" | "error";
  /** The query these results are for. */
  query: string;
  results: PlaceSuggestion[];
  error: ApiError | null;
};

export const IDLE_PLACE_SEARCH: PlaceSearchState = { status: "idle", query: "", results: [], error: null };

type Search = (query: string, signal: AbortSignal) => Promise<PlaceSuggestion[]>;

export type PlaceSearcher = {
  setQuery: (raw: string) => void;
  dispose: () => void;
};

/** Trim and collapse spaces, like the backend, so "denver  co" and "denver co" are one search. */
export const normalizePlaceQuery = (raw: string): string => raw.trim().replace(/\s+/g, " ");

/**
 * Runs a search only once typing pauses for `delayMs`, and aborts the previous
 * search when a new one starts, so results never arrive out of order.
 */
export const createPlaceSearcher = (
  search: Search,
  onChange: (state: PlaceSearchState) => void,
  { delayMs = PLACE_SEARCH_DELAY_MS, minLength = PLACE_SEARCH_MIN_LENGTH } = {},
): PlaceSearcher => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let current = "";

  const cancel = (): void => {
    clearTimeout(timer);
    controller?.abort();
    controller = undefined;
  };

  const run = async (query: string): Promise<void> => {
    controller = new AbortController();
    const { signal } = controller;
    try {
      const results = await search(query, signal);
      if (!signal.aborted) onChange({ status: "done", query, results, error: null });
    } catch (err) {
      if (signal.aborted) return;
      const error = err instanceof ApiError ? err : new ApiError("server", "Place search failed. Try again.");
      onChange({ status: "error", query, results: [], error });
    }
  };

  return {
    setQuery: (raw) => {
      const query = normalizePlaceQuery(raw);
      if (query === current) return;
      current = query;
      cancel();
      if (query.replace(/ /g, "").length < minLength) {
        onChange({ ...IDLE_PLACE_SEARCH, query });
        return;
      }
      onChange({ status: "loading", query, results: [], error: null });
      timer = setTimeout(() => void run(query), delayMs);
    },
    dispose: cancel,
  };
};
