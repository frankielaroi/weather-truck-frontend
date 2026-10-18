"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button, Field, inputClass } from "@/components/ui";
import { ApiError } from "@/lib/api";

import { createTrip } from "../api";
import {
  DEFAULT_INTERVAL,
  defaultDeparture,
  INTERVALS,
  MAX_LOAD_LB,
  toLocalInputValue,
  TRIP_FORM_FIELDS,
  validateTripForm,
  type TripFormErrors,
  type TripFormField,
  type TripFormValues,
} from "../trip-form";
import type { Trip } from "../types";
import { PlaceField } from "./PlaceField";

type Props = {
  onCreated: (trip: Trip) => void;
};

const initialValues = (): TripFormValues => ({
  origin: null,
  originText: "",
  destination: null,
  destinationText: "",
  // "Now" rounded up to a quarter hour. This renders in the browser only (TripPlanner sits under
  // Suspense and reads the address), so it uses the driver's own clock and can't mismatch the server.
  departureLocal: toLocalInputValue(defaultDeparture(new Date())),
  loadWeight: "",
  interval: DEFAULT_INTERVAL,
});

const FIELD_IDS: Record<TripFormField, string> = {
  origin: "trip-origin",
  destination: "trip-destination",
  departure_at: "trip-departure",
  load_weight_lb: "trip-load",
  interval_miles: "trip-interval",
};

/** The trip form: validates as the backend does, then plans the trip: `<TripForm onCreated={show} />`. */
export const TripForm = ({ onCreated }: Props): React.ReactElement => {
  const [values, setValues] = useState<TripFormValues>(initialValues);
  const [errors, setErrors] = useState<TripFormErrors>({});
  const [banner, setBanner] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof TripFormValues>(patch: Pick<TripFormValues, K>, clears: TripFormField[]): void => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      if (!clears.some((field) => e[field])) return e;
      const next = { ...e };
      for (const field of clears) delete next[field];
      return next;
    });
  };

  const focusFirst = (found: TripFormErrors): void => {
    const first = TRIP_FORM_FIELDS.find((field) => found[field]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#${FIELD_IDS[first]}`)?.focus();
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (submitting.current) return;
    setBanner(null);

    const { errors: found, input } = validateTripForm(values, new Date());
    setErrors(found);
    if (!input) {
      focusFirst(found);
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      onCreated(await createTrip(input));
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError("server", "Something went wrong. Try again.");
      const fromBackend: TripFormErrors = {};
      for (const field of TRIP_FORM_FIELDS) {
        const [message] = error.fieldMessages(field);
        if (message) fromBackend[field] = message;
      }
      setErrors(fromBackend);
      // Messages with no field of their own (and every non-400 error) go in the banner.
      if (error.kind !== "invalid_input" || Object.keys(fromBackend).length === 0) setBanner(error);
      focusFirst(fromBackend);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5" aria-label="Plan a trip">
      {banner ? (
        <div role="alert" className="rounded-md border border-red-700 bg-red-700/10 p-3 text-sm dark:border-red-400">
          <p className="font-semibold">{banner.message}</p>
          {banner.retryable ? <p className="mt-1">Press “Plan route” to try again.</p> : null}
        </div>
      ) : null}

      <PlaceField
        id={FIELD_IDS.origin}
        label="Origin"
        text={values.originText}
        place={values.origin}
        error={errors.origin}
        onChange={(text, place) => set({ originText: text, origin: place }, ["origin", "destination"])}
      />
      <PlaceField
        id={FIELD_IDS.destination}
        label="Destination"
        text={values.destinationText}
        place={values.destination}
        error={errors.destination}
        onChange={(text, place) => set({ destinationText: text, destination: place }, ["destination"])}
      />

      <Field id={FIELD_IDS.departure_at} label="Departure" hint="Your local time, up to 48 hours ahead." error={errors.departure_at}>
        {(aria) => (
          <input
            {...aria}
            type="datetime-local"
            value={values.departureLocal}
            onChange={(e) => set({ departureLocal: e.target.value }, ["departure_at"])}
            className={inputClass}
          />
        )}
      </Field>

      <Field id={FIELD_IDS.load_weight_lb} label="Load weight (lb)" hint={`1 to ${MAX_LOAD_LB.toLocaleString("en-US")} lb.`} error={errors.load_weight_lb}>
        {(aria) => (
          <input
            {...aria}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="32,000"
            value={values.loadWeight}
            onChange={(e) => set({ loadWeight: e.target.value }, ["load_weight_lb"])}
            className={`${inputClass} font-mono tabular-nums`}
          />
        )}
      </Field>

      <Field id={FIELD_IDS.interval_miles} label="Weather check every" hint="How far apart the weather checkpoints are." error={errors.interval_miles}>
        {(aria) => (
          <select
            {...aria}
            value={values.interval}
            onChange={(e) => set({ interval: Number(e.target.value) as TripFormValues["interval"] }, ["interval_miles"])}
            className={inputClass}
          >
            {INTERVALS.map((miles) => (
              <option key={miles} value={miles}>
                {miles} miles
              </option>
            ))}
          </select>
        )}
      </Field>

      <Button type="submit" busy={busy}>
        {busy ? "Planning route…" : "Plan route"}
      </Button>
      <p aria-live="polite" className="sr-only">
        {busy ? "Planning your route. This can take several seconds." : ""}
      </p>
    </form>
  );
};
