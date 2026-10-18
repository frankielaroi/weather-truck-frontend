"use client";

import { useEffect, useState } from "react";

import { PLANNING_STEPS, planningStepAt } from "../planning-progress";

const TICK_MS = 500;

/**
 * What's happening while a trip is planned: routes, then weather, then scoring. Mount it when planning starts
 * and unmount it when it ends; it starts counting from mounting: `{busy ? <PlanningProgress /> : null}`.
 */
export const PlanningProgress = (): React.ReactElement => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - start), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const current = planningStepAt(elapsed);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-foreground/30 p-3 text-sm">
      {/* Announced as the step changes; the list below is for looking at. */}
      <p role="status" className="sr-only">
        {PLANNING_STEPS[current].label}…
      </p>
      <ol className="flex flex-col gap-1" aria-hidden="true">
        {PLANNING_STEPS.map((step, i) => (
          <li key={step.label} className={i === current ? "font-semibold" : i < current ? "opacity-75" : "opacity-50"}>
            <span className="inline-block w-5">{i < current ? "✓" : i === current ? "›" : ""}</span>
            {step.label}
            {i === current ? "…" : ""}
          </li>
        ))}
      </ol>
      <p aria-hidden="true" className="text-xs opacity-75">
        This usually takes under ten seconds.
      </p>
    </div>
  );
};
