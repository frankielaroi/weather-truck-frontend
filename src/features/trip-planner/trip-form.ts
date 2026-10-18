/**
 * Trip form rules (F3). They match the backend's `TripCreateSerializer` (B10)
 * and its messages, so mistakes show before sending; the backend still checks.
 */
import type { CreateTripInput, IntervalMiles, Place } from "./types";

export const INTERVALS: readonly IntervalMiles[] = [10, 25, 50];
export const DEFAULT_INTERVAL: IntervalMiles = 25;
export const MIN_LOAD_LB = 1;
export const MAX_LOAD_LB = 200_000;
const DEPARTURE_GRACE_MS = 60 * 60 * 1000;
const DEPARTURE_HORIZON_MS = 48 * 60 * 60 * 1000;
const SAME_PLACE_KM = 0.05;

/** Form fields, named like the backend's inputs so its field errors land on them. */
export type TripFormField = "origin" | "destination" | "departure_at" | "load_weight_lb" | "interval_miles";

/** Ordered top to bottom, for focusing the first invalid field. */
export const TRIP_FORM_FIELDS: readonly TripFormField[] = [
  "origin",
  "destination",
  "departure_at",
  "load_weight_lb",
  "interval_miles",
];

export type TripFormErrors = Partial<Record<TripFormField, string>>;

export type TripFormValues = {
  origin: Place | null;
  originText: string;
  destination: Place | null;
  destinationText: string;
  /** `<input type="datetime-local">` value in the driver's time zone, e.g. "2026-10-18T14:15". */
  departureLocal: string;
  loadWeight: string;
  interval: IntervalMiles;
};

const pad = (n: number): string => String(n).padStart(2, "0");

/** A date as a `datetime-local` value in the browser's time zone. */
export const toLocalInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Parses a `datetime-local` value as local time; null if it isn't one. */
export const parseLocalInputValue = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  // Rejects impossible dates like Feb 30, which Date would roll over.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

/** Now, rounded up to the next quarter hour (14:00 stays 14:00; 14:00:30 becomes 14:15). */
export const defaultDeparture = (now: Date): Date => {
  const quarter = 15 * 60 * 1000;
  return new Date(Math.ceil(now.getTime() / quarter) * quarter);
};

/** "32,000" or "32000 " → 32000; null when it isn't a number. */
export const parseLoadWeight = (raw: string): number | null => {
  const cleaned = raw.replace(/[\s,]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
};

const distanceKm = (a: Place, b: Place): number => {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const placeError = (place: Place | null, text: string, emptyMessage: string): string | undefined => {
  if (place) return undefined;
  return text.trim() ? "Pick a place from the suggestions." : emptyMessage;
};

export type TripFormResult = { errors: TripFormErrors; input: CreateTripInput | null };

/** Checks the form against the backend's rules. `input` is set only when there are no errors. */
export const validateTripForm = (values: TripFormValues, now: Date): TripFormResult => {
  const errors: TripFormErrors = {};

  const originError = placeError(values.origin, values.originText, "Enter where the trip starts.");
  if (originError) errors.origin = originError;
  const destinationError = placeError(values.destination, values.destinationText, "Enter where the trip ends.");
  if (destinationError) errors.destination = destinationError;
  if (values.origin && values.destination && distanceKm(values.origin, values.destination) < SAME_PLACE_KM) {
    errors.destination = "Destination must be different from the origin.";
  }

  const departure = parseLocalInputValue(values.departureLocal);
  if (!departure) {
    errors.departure_at = "Enter a departure date and time.";
  } else if (departure.getTime() < now.getTime() - DEPARTURE_GRACE_MS) {
    errors.departure_at = "Departure can't be more than 1 hour in the past.";
  } else if (departure.getTime() > now.getTime() + DEPARTURE_HORIZON_MS) {
    errors.departure_at = "Departure can't be more than 48 hours ahead (the forecast's range).";
  }

  const load = parseLoadWeight(values.loadWeight);
  if (!values.loadWeight.trim()) {
    errors.load_weight_lb = "Enter the load weight in pounds.";
  } else if (load === null || !Number.isInteger(load)) {
    errors.load_weight_lb = "Load must be a whole number of pounds.";
  } else if (load < MIN_LOAD_LB) {
    errors.load_weight_lb = `Load must be at least ${MIN_LOAD_LB.toLocaleString("en-US")} lb.`;
  } else if (load > MAX_LOAD_LB) {
    errors.load_weight_lb = `Load can't be more than ${MAX_LOAD_LB.toLocaleString("en-US")} lb.`;
  }

  if (!INTERVALS.includes(values.interval)) {
    errors.interval_miles = "Interval must be 10, 25 or 50 miles.";
  }

  if (Object.keys(errors).length > 0 || !values.origin || !values.destination || !departure || load === null) {
    return { errors, input: null };
  }
  return {
    errors,
    input: {
      origin: values.origin,
      destination: values.destination,
      departure_at: departure.toISOString(),
      load_weight_lb: load,
      interval_miles: values.interval,
    },
  };
};
