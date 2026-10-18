import { RISK_COLOR, RISK_LEVELS } from "@/components/ui/risk";

import { formatMiles } from "../format";
import { milesByLevel, riskStrip } from "../risk-strip";
import type { Route } from "../types";

type Props = {
  route: Pick<Route, "distance_miles" | "checkpoints">;
};

/** A bar of the risk along a route, start to end, each stretch as long as its miles: `<RiskStrip route={route} />`. */
export const RiskStrip = ({ route }: Props): React.ReactElement => {
  const segments = riskStrip(route);
  const totals = milesByLevel(segments);
  const summary = RISK_LEVELS.filter((level) => totals[level] > 0.05)
    .map((level) => `${RISK_COLOR[level].label} ${formatMiles(totals[level])}`)
    .join(", ");

  return (
    <div>
      <div
        role="img"
        aria-label={`Risk along the route, start to end: ${summary || "no data"}`}
        className="flex h-3 w-full overflow-hidden rounded-full ring-1 ring-risk-outline/40"
      >
        {segments.map((segment) => (
          <span
            key={segment.startMile}
            data-level={segment.level}
            title={`${RISK_COLOR[segment.level].label}: mile ${segment.startMile.toFixed(0)} to ${segment.endMile.toFixed(0)}`}
            // Each stretch is as long as its miles; a 2 px floor keeps a short Severe stretch visible.
            style={{ flexGrow: segment.miles, flexBasis: 0, minWidth: 2 }}
            className={RISK_COLOR[segment.level].fillClass}
          />
        ))}
      </div>
      <div aria-hidden="true" className="mt-1 flex justify-between text-xs opacity-75">
        <span>Start</span>
        <span className="font-mono tabular-nums">{formatMiles(route.distance_miles)}</span>
      </div>
    </div>
  );
};
