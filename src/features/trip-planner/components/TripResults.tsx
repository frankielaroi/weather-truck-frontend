import { RiskPill, riskLevelFromValue } from "@/components/ui";

import { formatDateTime, formatDuration, formatMiles } from "../format";
import type { Trip } from "../types";

type Props = {
  trip: Trip;
};

/** A first look at a planned trip's routes (the map and comparison cards come in F4–F6): `<TripResults trip={trip} />`. */
export const TripResults = ({ trip }: Props): React.ReactElement => {
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

  const recommended = [...trip.routes].sort((a, b) => Number(b.is_recommended) - Number(a.is_recommended));
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
      <ol className="flex flex-col gap-3">
        {recommended.map((route) => (
          <li key={route.index} className="rounded-md border border-foreground/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">
                Route {route.letter}: {route.label}
              </span>
              {route.is_recommended ? <span className="rounded-full border border-foreground px-2 py-0.5 text-xs font-semibold">Recommended</span> : null}
              <RiskPill level={riskLevelFromValue(route.risk.worst_level.value)} />
            </div>
            <p className="mt-1 font-mono text-sm tabular-nums">
              {formatMiles(route.distance_miles)} · {formatDuration(route.duration_seconds)} · arrives {formatDateTime(route.arrival_at)}
            </p>
            {route.recommendation_reason ? <p className="mt-1 text-sm">{route.recommendation_reason}</p> : null}
            {route.warnings.map((warning) => (
              <p key={warning} className="mt-1 text-sm font-medium">
                ⚠ {warning}
              </p>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
};
