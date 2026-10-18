/**
 * The steps shown while a trip is being planned (F10): routes, then weather, then scoring.
 *
 * The backend plans a trip in one request and reports no progress, so the step shown follows how long the
 * request has been running. The times are rough, from the backend's own step timings on a long trip
 * (routing about 1–2 s, weather about 3–5 s, scoring well under a second); they only decide which message
 * is shown, never anything about the trip.
 */
export const PLANNING_STEPS = [
  { label: "Finding routes", startsAtMs: 0 },
  { label: "Checking the weather along each route", startsAtMs: 2500 },
  { label: "Scoring the routes", startsAtMs: 7000 },
] as const;

/** Index of the step to show after `elapsedMs` of waiting. */
export const planningStepAt = (elapsedMs: number): number => {
  if (!Number.isFinite(elapsedMs)) return 0;
  let step = 0;
  PLANNING_STEPS.forEach((candidate, i) => {
    if (elapsedMs >= candidate.startsAtMs) step = i;
  });
  return step;
};
