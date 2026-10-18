"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";

import { getTrip } from "../api";
import { defaultSelectedRoute } from "../map-data";
import type { Trip } from "../types";
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
  const [picked, setPicked] = useState<{ tripId: number; route: number } | null>(null); // the route the driver chose

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
  // Until the driver picks one, the recommended route is the selected one; a pick belongs to its own trip.
  const selectedRoute = shown ? (picked?.tripId === shown.id ? picked.route : defaultSelectedRoute(shown)) : 0;

  return (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <TripForm onCreated={onCreated} />
      {/* On a phone the map and route cards come first once there is a trip, with the form below them. */}
      <div className={`flex min-w-0 flex-col gap-6 ${shown ? "order-first lg:order-none" : ""}`}>
        <TripMap trip={shown?.status === "ready" ? shown : null} selectedRouteIndex={selectedRoute} />
        <div aria-live="polite">
        {shown ? (
          <div className="flex flex-col gap-4">
            <TripResults trip={shown} selectedRouteIndex={selectedRoute} onSelectRoute={(route) => setPicked({ tripId: shown.id, route })} />
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
