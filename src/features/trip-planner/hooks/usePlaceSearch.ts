"use client";

import { useEffect, useRef, useState } from "react";

import { searchPlaces } from "../api";
import { createPlaceSearcher, IDLE_PLACE_SEARCH, type PlaceSearcher, type PlaceSearchState } from "../place-search";

/** Place suggestions for what the driver is typing: `const { status, results } = usePlaceSearch(text)`. */
export const usePlaceSearch = (query: string): PlaceSearchState => {
  const [state, setState] = useState<PlaceSearchState>(IDLE_PLACE_SEARCH);
  const searcher = useRef<PlaceSearcher | null>(null);

  useEffect(() => {
    const created = createPlaceSearcher(searchPlaces, setState);
    searcher.current = created;
    return () => {
      created.dispose();
      searcher.current = null;
    };
  }, []);

  useEffect(() => {
    searcher.current?.setQuery(query);
  }, [query]);

  return state;
};
