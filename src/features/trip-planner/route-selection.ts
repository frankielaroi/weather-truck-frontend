/**
 * Which route is selected, kept in the address as `?route=B` so a shared link or a reload opens the
 * same route (F7). Pure functions: the address is the single source of truth, there is no copy in state.
 * With no (or an unknown) `route`, the recommended route is selected.
 */
import { defaultSelectedRoute } from "./map-data";
import type { Trip } from "./types";

export const ROUTE_PARAM = "route";

/** The route a `?route=` value names (its letter, any case); the recommended route when it names none. */
export const selectedRouteFromParam = (trip: Trip, param: string | null): number => {
  const wanted = param?.trim().toUpperCase();
  const match = wanted ? trip.routes.find((route) => route.letter.toUpperCase() === wanted) : undefined;
  return match ? match.index : defaultSelectedRoute(trip);
};

/**
 * The address query string after selecting `routeIndex`, keeping every other parameter. Selecting the
 * recommended route removes `route`, since that is what no parameter already means.
 */
export const searchWithSelectedRoute = (trip: Trip, currentSearch: string, routeIndex: number): string => {
  const params = new URLSearchParams(currentSearch);
  const route = trip.routes.find((r) => r.index === routeIndex);
  if (!route || routeIndex === defaultSelectedRoute(trip)) params.delete(ROUTE_PARAM);
  else params.set(ROUTE_PARAM, route.letter);
  const query = params.toString();
  return query ? `?${query}` : "";
};
