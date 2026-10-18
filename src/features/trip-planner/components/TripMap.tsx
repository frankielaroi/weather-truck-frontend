"use client";

import dynamic from "next/dynamic";

import type { HourStore } from "../hooks/useHourStore";
import { defaultSelectedRoute } from "../map-data";
import type { Heatmap, Trip } from "../types";

type Props = {
  trip: Trip | null;
  /** Route to highlight; defaults to the recommended one. */
  selectedRouteIndex?: number;
  /** Called when the driver clicks a route's line on the map. */
  onSelectRoute?: (index: number) => void;
  /** The corridor heatmap once it has loaded. */
  heatmap?: Heatmap | null;
  /** The hour the heatmap and the truck show. */
  hourStore: HourStore;
  /** Whether the heatmap is switched on. */
  showHeatmap?: boolean;
};

const MAP_BOX = "h-72 w-full sm:h-96 lg:h-[28rem]";

const MapPlaceholder = (): React.ReactElement => (
  <div role="status" className={`${MAP_BOX} flex animate-pulse items-center justify-center bg-foreground/10 text-sm opacity-75`}>
    Loading map…
  </div>
);

// MapLibre needs the browser (WebGL), so it never renders on the server; the placeholder shows meanwhile.
const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false, loading: MapPlaceholder });

/** The route map with a loading placeholder: `<TripMap trip={trip} />`. */
export const TripMap = ({ trip, selectedRouteIndex, onSelectRoute, heatmap = null, hourStore, showHeatmap = true }: Props): React.ReactElement => (
  <section aria-label="Route map" className="overflow-hidden rounded-md border border-foreground/30">
    <MapCanvas
      trip={trip}
      selectedRouteIndex={selectedRouteIndex ?? (trip ? defaultSelectedRoute(trip) : 0)}
      onSelectRoute={onSelectRoute}
      heatmap={heatmap}
      hourStore={hourStore}
      showHeatmap={showHeatmap}
      className={MAP_BOX}
    />
  </section>
);
