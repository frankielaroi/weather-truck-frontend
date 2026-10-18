import type { Route } from "../types";
import { RouteCard } from "./RouteCard";

type Props = {
  routes: readonly Route[];
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
};

/** One card per route, the recommended route first: `<RoutePanel routes={trip.routes} selectedRouteIndex={0} onSelectRoute={pick} />`. */
export const RoutePanel = ({ routes, selectedRouteIndex, onSelectRoute }: Props): React.ReactElement => {
  const ordered = [...routes].sort((a, b) => Number(b.is_recommended) - Number(a.is_recommended) || a.index - b.index);
  return (
    <ol aria-label="Route options" className="flex flex-col gap-3">
      {ordered.map((route) => (
        <li key={route.index}>
          <RouteCard route={route} selected={route.index === selectedRouteIndex} onSelect={onSelectRoute} />
        </li>
      ))}
    </ol>
  );
};
