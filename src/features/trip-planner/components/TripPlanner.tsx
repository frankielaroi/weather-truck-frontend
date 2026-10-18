"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";

import { getTrip } from "../api";
import { formatDateTime } from "../format";
import { defaultHeatmapHour } from "../heatmap-data";
import { useHeatmap } from "../hooks/useHeatmap";
import { ROUTE_PARAM, searchWithSelectedRoute, selectedRouteFromParam } from "../route-selection";
import type { Trip } from "../types";
import { HeatmapControl } from "./HeatmapControl";
import { TripForm } from "./TripForm";
import { TripMap } from "./TripMap";
import { TripResults } from "./TripResults";

const parseTripId = (raw: string | null): number | null => {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/**
 * The trip form plus its results. The planned trip's id lives in the address (`?trip=3`),
 * so reloading or sharing the link reopens the same trip: `<TripPlanner />` (inside Suspense).
 */
export const TripPlanner = (): React.ReactElement => {
  const searchParams = useSearchParams();
  const tripId = parseTripId(searchParams.get("trip"));

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loadError, setLoadError] = useState<{ id: number; error: ApiError } | null>(null);
  const known = useRef<number | null>(null); // the trip we already hold, so a fresh submit isn't fetched again
  const [heatmapOn, setHeatmapOn] = useState(true); // on by default once it has loaded

  useEffect(() => {
    if (tripId === null || known.current === tripId) return;
    const controller = new AbortController();
    getTrip(tripId, controller.signal)
      .then((loaded) => {
        known.current = loaded.id;
        setTrip(loaded);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError({ id: tripId, error: err instanceof ApiError ? err : new ApiError("server", "Couldn't load this trip.") });
      });
    return () => controller.abort();
  }, [tripId]);

  const onCreated = (created: Trip): void => {
    known.current = created.id;
    setTrip(created);
    setLoadError(null);
    window.history.pushState(null, "", `?trip=${created.id}`);
  };

  const startOver = (): void => {
    window.history.pushState(null, "", window.location.pathname);
  };

  const shown = tripId !== null && trip?.id === tripId ? trip : null;
  const failed = tripId !== null && loadError?.id === tripId ? loadError.error : null;
  // The selected route lives in the address (`?route=B`); with none, it's the recommended route.
  const selectedRoute = shown ? selectedRouteFromParam(shown, searchParams.get(ROUTE_PARAM)) : 0;

  // replaceState, not pushState: picking a route shouldn't add a history entry, and it makes no server request.
  const selectRoute = (index: number): void => {
    if (!shown) return;
    window.history.replaceState(null, "", `${window.location.pathname}${searchWithSelectedRoute(shown, window.location.search, index)}`);
  };

  // The heatmap loads after the trip, on its own, so the routes show first and a failed heatmap never hides them.
  const readyTrip = shown?.status === "ready" ? shown : null;
  const { status: heatmapStatus, heatmap, retry: retryHeatmap } = useHeatmap(readyTrip ? readyTrip.id : null);
  const heatmapHour = heatmap ? defaultHeatmapHour(heatmap) : 0;
  const heatmapShownLabel = heatmap
    ? `${formatDateTime(heatmap.hours[heatmapHour])}${heatmapHour === heatmap.departure_hour ? " (departure hour)" : ""}`
    : null;

  return (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <TripForm onCreated={onCreated} />
      {/* On a phone the map and route cards come first once there is a trip, with the form below them. */}
      <div className={`flex min-w-0 flex-col gap-6 ${shown ? "order-first lg:order-none" : ""}`}>
        <HeatmapControl status={heatmapStatus} visible={heatmapOn} onToggle={setHeatmapOn} shownLabel={heatmapShownLabel} onRetry={retryHeatmap} />
        <TripMap
          trip={readyTrip}
          selectedRouteIndex={selectedRoute}
          onSelectRoute={selectRoute}
          heatmap={heatmap}
          heatmapHour={heatmapHour}
          showHeatmap={heatmapOn}
        />
        <div aria-live="polite">
        {shown ? (
          <div className="flex flex-col gap-4">
            <TripResults trip={shown} selectedRouteIndex={selectedRoute} onSelectRoute={selectRoute} />
            <Button variant="secondary" onClick={startOver} className="self-start">
              Clear result
            </Button>
          </div>
        ) : failed ? (
          <div role="alert" className="rounded-md border border-red-700 bg-red-700/10 p-4 dark:border-red-400">
            <p className="font-semibold">{failed.kind === "not_found" ? "We couldn’t find that trip." : failed.message}</p>
            <p className="mt-1 text-sm">Plan a new trip with the form.</p>
          </div>
        ) : tripId !== null ? (
          <p>Loading your trip…</p>
        ) : (
          <p className="opacity-75">Your routes will show here once you plan a trip.</p>
        )}
        </div>
      </div>
    </div>
  );
};
