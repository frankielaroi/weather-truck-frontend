"use client";

import { useMemo, useSyncExternalStore } from "react";

import { readRiskColors } from "@/components/ui/risk";

export type RiskColors = ReturnType<typeof readRiskColors>;

const DARK_QUERY = "(prefers-color-scheme: dark)";

const subscribe = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/**
 * The F1 risk colours as plain strings for the map, which can't read CSS variables.
 * Re-read when the light/dark setting changes: `const colors = useRiskColors()`. Browser-only.
 */
export const useRiskColors = (): RiskColors => {
  const dark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  return useMemo(() => {
    void dark; // the tokens differ per scheme, so re-read when it flips
    return readRiskColors();
  }, [dark]);
};
