import { formatDateTime } from "../format";
import type { Trip } from "../types";
import { RoutePanel } from "./RoutePanel";

type Props = {
  trip: Trip;
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
};

/** A planned trip's summary and one comparison card per route: `<TripResults trip={trip} selectedRouteIndex={0} onSelectRoute={pick} />`. */
export const TripResults = ({ trip, selectedRouteIndex, onSelectRoute }: Props): React.ReactElement => {
  if (trip.status === "failed") {
    return (
      <div role="alert" className="rounded-md border border-red-700 bg-red-700/10 p-4 dark:border-red-400">
        <p className="font-semibold">We couldn’t plan this trip.</p>
        <p className="mt-1 text-sm">{trip.error ?? "Try again in a moment."}</p>
      </div>
    );
  }
  if (trip.status === "pending") {
    return <p aria-live="polite">This trip is still being planned. Reload in a moment.</p>;
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
      <RoutePanel routes={trip.routes} selectedRouteIndex={selectedRouteIndex} onSelectRoute={onSelectRoute} />
    </section>
  );
};
