import { Button } from "@/components/ui";

import { formatDateTime } from "../format";
import type { Trip } from "../types";
import { RoutePanel } from "./RoutePanel";

type Props = {
  trip: Trip;
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  /** Load the trip again, for a trip that is still being planned. */
  onReload: () => void;
};

/** A planned trip's summary and one comparison card per route: `<TripResults trip={trip} selectedRouteIndex={0} onSelectRoute={pick} />`. */
export const TripResults = ({ trip, selectedRouteIndex, onSelectRoute, onReload }: Props): React.ReactElement => {
  if (trip.status === "failed") {
    return (
      <div role="alert" className="rounded-md border border-red-700 bg-red-700/10 p-4 dark:border-red-400">
        <p className="font-semibold">We couldn’t plan this trip.</p>
        <p className="mt-1 text-sm">{trip.error ?? "Something went wrong while planning this trip."}</p>
        <p className="mt-1 text-sm">Change something in the form and plan it again.</p>
      </div>
    );
  }
  if (trip.status === "pending") {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3">
        <p>This trip is still being planned.</p>
        <Button variant="secondary" onClick={onReload} className="px-3 py-1 text-sm">
          Check again
        </Button>
      </div>
    );
  }

  return (
    <section aria-labelledby="results-title" className="flex flex-col gap-4">
      <div>
        <h2 id="results-title" className="text-xl font-semibold">
          {trip.inputs.origin.name} → {trip.inputs.destination.name}
        </h2>
        <p className="text-sm opacity-75">
          Leaves {formatDateTime(trip.inputs.departure_at)} · {trip.inputs.load_weight_lb.toLocaleString("en-US")} lb · weather every{" "}
          {trip.inputs.interval_miles} miles
        </p>
      </div>
      <RoutesNote count={trip.routes.length} />
      <RoutePanel routes={trip.routes} selectedRouteIndex={selectedRouteIndex} onSelectRoute={onSelectRoute} />
    </section>
  );
};

/** Said when there are fewer than the usual three routes, so a short list doesn't look like a mistake. */
const RoutesNote = ({ count }: { count: number }): React.ReactElement | null => {
  if (count >= 3) return null;
  if (count === 0) {
    return (
      <p role="alert" className="rounded-md border border-foreground/40 p-3 text-sm font-medium">
        No routes were found for this trip. Try a different origin or destination.
      </p>
    );
  }
  return (
    <p role="note" className="rounded-md border border-foreground/30 p-3 text-sm">
      {count === 1
        ? "Only one route exists between these places, so there's nothing to compare it with."
        : `Only ${count} distinct routes exist between these places, so that's all we can compare.`}
    </p>
  );
};
