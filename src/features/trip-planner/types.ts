/**
 * Mirrors the backend's responses exactly (MODULES.md B9–B11): field names,
 * nesting and nullability from `apps/routing/responses.py`, `errors.py`,
 * `serializers.py` and `heatmap.py` in weather-truck-backend.
 * Units are in the names: miles, seconds, mph, inches per hour, pounds, °F.
 * Times are ISO 8601 strings in UTC with an offset.
 */

export type IntervalMiles = 10 | 25 | 50;

export type RiskName = "Low" | "Moderate" | "High" | "Severe" | "No Travel" | "Unknown";

/** A risk level sent as both number and name; Unknown is `{ value: null, name: "Unknown" }`. */
export type RiskLevelJson = {
  value: 0 | 1 | 2 | 3 | 4 | null;
  name: RiskName;
};

export type Place = {
  name: string;
  lat: number;
  lng: number;
};

/** GeoJSON LineString; coordinates are [longitude, latitude]. */
export type LineString = {
  type: "LineString";
  coordinates: [number, number][];
};

/** Forecast at the checkpoint's arrival hour; null where the provider had no value. */
export type CheckpointWeather = {
  wind_mph: number | null;
  gust_mph: number | null;
  rain_in_per_hr: number | null;
  snow_in_per_hr: number | null;
  temperature_f: number | null;
  description: string | null;
};

export type Checkpoint = {
  sequence: number;
  mile: number;
  lat: number;
  lng: number;
  arrival_at: string;
  /** The forecast hour used (nearest to arrival); null when there was none. */
  forecast_time: string | null;
  weather: CheckpointWeather;
  risk: {
    level: RiskLevelJson;
    /** e.g. "Wind 47 mph with 32,000 lb load → No Travel". */
    reasons: string[];
    /** Data notes, e.g. "Beyond forecast range". */
    notes: string[];
  };
};

export type RouteRisk = {
  no_travel_miles: number;
  severe_miles: number;
  high_miles: number;
  moderate_miles: number;
  low_miles: number;
  unknown_miles: number;
  worst_level: RiskLevelJson;
  /** Mile-weighted mean of known levels (0–4); null when no stretch has known weather. */
  average_risk: number | null;
};

export type DecidingStep =
  | "no_travel_miles"
  | "severe_miles"
  | "high_miles"
  | "average_risk"
  | "travel_time"
  | "route_order"
  | "only_route";

export type Route = {
  index: number;
  /** "A", "B", "C" — tells routes apart without colour. */
  letter: string;
  /** Short label, e.g. "via I-80". */
  label: string;
  provider: string;
  profile: string;
  notes: string[];
  distance_miles: number;
  duration_seconds: number;
  arrival_at: string;
  path: LineString;
  risk: RouteRisk;
  is_recommended: boolean;
  /** Set on the recommended route, e.g. "Recommended: 1 h 16 min faster than Route B." */
  recommendation_reason: string | null;
  deciding_step: DecidingStep | null;
  warnings: string[];
  checkpoints: Checkpoint[];
};

export type TripStatus = "pending" | "ready" | "failed";

export type TripInputs = {
  origin: Place;
  destination: Place;
  departure_at: string;
  load_weight_lb: number;
  interval_miles: IntervalMiles;
};

export type Trip = {
  id: number;
  status: TripStatus;
  /** Why the trip failed; null when it didn't. */
  error: string | null;
  created_at: string;
  inputs: TripInputs;
  recommended_route_index: number | null;
  routes: Route[];
};

/** Body for `POST /trips/`. Field names match `TripCreateSerializer`. */
export type CreateTripInput = TripInputs;

/** Per point, one value per hour (index 0–48); null where there's no forecast. */
export type HourlyGrid<T> = (T | null)[][];

/**
 * Corridor heatmap (B11/B12, `GET /trips/:id/heatmap/`), compact: positions once, then one list of 49
 * hourly values per point for each field, in the same order as `points`. Checked against a real
 * Chicago → Denver payload (393 points).
 */
export type Heatmap = {
  version: number;
  trip_id: number;
  /** Clock time of hour 0. */
  start_time: string;
  /** Clock time of each hour slot, 49 entries. */
  hours: string[];
  /** Hour index of the departure; null if it falls outside hours 0–48. */
  departure_hour: number | null;
  load_weight_lb: number;
  corridor_miles: number;
  spacing_miles: number;
  /** [longitude, latitude] per grid point. */
  points: [number, number][];
  /** Risk level value (0–4) per point per hour; null is Unknown. */
  levels: HourlyGrid<0 | 1 | 2 | 3 | 4>;
  wind_mph: HourlyGrid<number>;
  rain_in_per_hr: HourlyGrid<number>;
  snow_in_per_hr: HourlyGrid<number>;
  truck: {
    route_index: number;
    /** [longitude, latitude] of the truck at each hour. */
    positions: [number, number][];
  };
};

/** One result of `GET /places/?q=`. */
export type PlaceSuggestion = Place;

export type PlaceSuggestions = {
  results: PlaceSuggestion[];
};
