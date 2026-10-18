"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";

import { getTrip } from "../api";
import { useHeatmap } from "../hooks/useHeatmap";
import { useHourStore } from "../hooks/useHourStore";
import { ROUTE_PARAM, searchWithSelectedRoute, selectedRouteFromParam } from "../route-selection";
import type { Trip } from "../types";
import { HeatmapControl } from "./HeatmapControl";
import { HeatmapSlider } from "./HeatmapSlider";
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
  const [loadAttempt, setLoadAttempt] = useState(0); // bumped to load the trip again
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
  }, [tripId, loadAttempt]);

  const onCreated = (created: Trip): void => {
    known.current = created.id;
    setTrip(created);
    setLoadError(null);
    window.history.pushState(null, "", `?trip=${created.id}`);
  };

  const reloadTrip = (): void => {
    known.current = null;
    setLoadError(null);
    setLoadAttempt((n) => n + 1);
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
  // The shown hour lives in a store, not in state: dragging the slider updates only the slider and the map.
  const hourStore = useHourStore(heatmap);

  return (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <TripForm onCreated={onCreated} intro={tripId === null} />
      {/* On a phone the map and route cards come first once there is a trip, with the form below them. */}
      <div className={`flex min-w-0 flex-col gap-6 ${shown ? "order-first lg:order-none" : ""}`}>
        <HeatmapControl status={heatmapStatus} visible={heatmapOn} onToggle={setHeatmapOn} onRetry={retryHeatmap} />
        {heatmap && readyTrip ? (
          <HeatmapSlider heatmap={heatmap} store={hourStore} origin={readyTrip.inputs.origin} destination={readyTrip.inputs.destination} />
        ) : null}
        <TripMap
          trip={readyTrip}
          selectedRouteIndex={selectedRoute}
          onSelectRoute={selectRoute}
          heatmap={heatmap}
          hourStore={hourStore}
          showHeatmap={heatmapOn}
        />
        <div aria-live="polite">
        {shown ? (
          <div className="flex flex-col gap-4">
            <TripResults trip={shown} selectedRouteIndex={selectedRoute} onSelectRoute={selectRoute} onReload={reloadTrip} />
            <Button variant="secondary" onClick={startOver} className="self-start">
              Clear result
            </Button>
          </div>
        ) : failed ? (
          <div role="alert" className="rounded-md border border-red-700 bg-red-700/10 p-4 dark:border-red-400">
            <p className="font-semibold">{failed.kind === "not_found" ? "We couldn’t find that trip." : failed.message}</p>
            {failed.retryable ? (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span>{failed.nextStep}</span>
                <Button variant="secondary" onClick={reloadTrip} className="px-3 py-1 text-sm">
                  Try again
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-sm">Plan a new trip with the form.</p>
            )}
          </div>
        ) : tripId !== null ? (
          <p role="status">Loading your trip…</p>
        ) : (
          <p className="opacity-75">Your routes will show here once you plan a trip.</p>
        )}
        </div>
      </div>
    </div>
  );
};
