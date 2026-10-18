import { RISK_COLOR, RiskPill, riskLevelFromValue, type RiskLevel } from "@/components/ui";

import { formatDateTime, formatDuration, formatMiles } from "../format";
import type { Route } from "../types";
import { RiskStrip } from "./RiskStrip";

type Props = {
  route: Route;
  selected: boolean;
  onSelect: (index: number) => void;
};

const MILE_STATS: { level: RiskLevel; read: (route: Route) => number }[] = [
  { level: "no_travel", read: (r) => r.risk.no_travel_miles },
  { level: "severe", read: (r) => r.risk.severe_miles },
  { level: "high", read: (r) => r.risk.high_miles },
  { level: "unknown", read: (r) => r.risk.unknown_miles },
];

/**
 * One route's summary: distance, time, risk miles by level, a strip of risk along the road, and the
 * recommendation reason and warnings. The title selects the route: `<RouteCard route={r} selected onSelect={pick} />`.
 */
export const RouteCard = ({ route, selected, onSelect }: Props): React.ReactElement => {
  const { risk } = route;
  return (
    <article
      className={`relative flex flex-col gap-3 rounded-md border p-4 ${selected ? "border-foreground ring-2 ring-foreground" : "border-foreground/30"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">
          {/* The stretched link area makes the whole card clickable while the title stays the accessible name. */}
          <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(route.index)}
            className="text-left after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Route {route.letter}: {route.label}
          </button>
        </h3>
        {route.is_recommended ? (
          <span className="rounded-full border border-foreground px-2 py-0.5 text-xs font-semibold">Recommended</span>
        ) : null}
        <span className="flex items-center gap-1 text-xs">
          Worst <RiskPill level={riskLevelFromValue(risk.worst_level.value)} />
        </span>
      </div>

      {route.recommendation_reason ? <p className="text-sm">{route.recommendation_reason}</p> : null}

      <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm">
        <div>
          <dt className="text-xs opacity-75">Distance</dt>
          <dd className="font-mono tabular-nums">{formatMiles(route.distance_miles)}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-75">Travel time</dt>
          <dd className="font-mono tabular-nums">{formatDuration(route.duration_seconds)}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-75">Arrives</dt>
          <dd className="font-mono text-xs tabular-nums">{formatDateTime(route.arrival_at)}</dd>
        </div>
      </dl>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-4">
        {MILE_STATS.map(({ level, read }) => (
          <div key={level} data-level={level}>
            <dt className="flex items-center gap-1.5 text-xs">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-sm ring-1 ring-risk-outline/40 ${RISK_COLOR[level].fillClass}`} />
              {RISK_COLOR[level].label} miles
            </dt>
            <dd className="font-mono tabular-nums">{formatMiles(read(route))}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm">
        <span className="text-xs opacity-75">Average risk </span>
        <span className="font-mono tabular-nums">{risk.average_risk === null ? "No data" : `${risk.average_risk.toFixed(2)} of 4`}</span>
      </p>

      <RiskStrip route={route} />

      {route.warnings.length > 0 ? (
        <ul aria-label="Warnings" className="flex flex-col gap-1">
          {route.warnings.map((warning) => (
            <li key={warning} className="text-sm font-medium">
              <span aria-hidden="true">⚠ </span>
              <span className="sr-only">Warning: </span>
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
};
