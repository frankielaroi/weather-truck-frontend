"use client";

import dynamic from "next/dynamic";
import type { Map as MapLibreMap } from "maplibre-gl";

type Props = {
  onMapReady?: (map: MapLibreMap) => void;
};

const MAP_BOX = "h-72 w-full sm:h-96 lg:h-[28rem]";

const MapPlaceholder = (): React.ReactElement => (
  <div role="status" className={`${MAP_BOX} flex animate-pulse items-center justify-center bg-foreground/10 text-sm opacity-75`}>
    Loading map…
  </div>
);

// MapLibre needs the browser (WebGL), so it never renders on the server; the placeholder shows meanwhile.
const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false, loading: MapPlaceholder });

/** The route map with a loading placeholder: `<TripMap onMapReady={addLayers} />`. */
export const TripMap = ({ onMapReady }: Props): React.ReactElement => (
  <section aria-label="Route map" className="overflow-hidden rounded-md border border-foreground/30">
    <MapCanvas onMapReady={onMapReady} className={MAP_BOX} />
  </section>
);
