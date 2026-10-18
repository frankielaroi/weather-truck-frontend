"use client";

import { useEffect, useId, useState, type ChangeEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui";

import { formatDateTime } from "../format";
import { truckStatus } from "../heatmap-data";
import { useHour, type HourStore } from "../hooks/useHourStore";
import type { Heatmap, Place } from "../types";

type Props = {
  heatmap: Heatmap;
  store: HourStore;
  origin: Place;
  destination: Place;
};

/** How long Play stays on each hour. */
const PLAY_STEP_MS = 400;
/** Page Up / Page Down move this many hours. */
const PAGE_STEP_HOURS = 6;
const THUMB_PX = 16;

/**
 * The 0–48 h forecast slider: moving it changes the hour the heatmap and the truck show, with no network
 * requests. Arrow keys move one hour, Page Up / Page Down six, Home / End to the ends; Play steps through the
 * hours and stops at the last one. The departure hour is marked, and the time and truck are read out:
 * `<HeatmapSlider heatmap={heatmap} store={store} origin={o} destination={d} />`.
 */
export const HeatmapSlider = ({ heatmap, store, origin, destination }: Props): React.ReactElement => {
  const id = useId();
  const hour = useHour(store);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const next = store.get() + 1;
      store.set(next);
      if (next >= store.max) setPlaying(false); // stop at the last hour
    }, PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [playing, store]);

  const move = (next: number): void => {
    setPlaying(false); // moving it by hand takes over from Play
    store.set(next);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>): void => move(Number(e.target.value));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    const target =
      e.key === "PageUp" ? hour + PAGE_STEP_HOURS : e.key === "PageDown" ? hour - PAGE_STEP_HOURS : e.key === "Home" ? 0 : e.key === "End" ? store.max : null;
    if (target === null) return; // arrow keys are the range input's own: one hour each
    e.preventDefault();
    move(target);
  };

  const togglePlay = (): void => {
    if (playing) return setPlaying(false);
    if (hour >= store.max) store.set(0); // Play at the end starts again from the beginning
    setPlaying(true);
  };

  const departure = heatmap.departure_hour;
  const clock = formatDateTime(heatmap.hours[hour]);
  const truck = truckStatus(heatmap, hour, origin, destination);
  const valueText = `${clock}${hour === departure ? ", departure hour" : ""}. Truck ${truck}.`;

  return (
    <section aria-label="Forecast time" className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button variant="secondary" onClick={togglePlay} aria-pressed={playing} className="px-3 py-1 text-sm">
          {playing ? "Pause" : "Play"}
        </Button>
        <label htmlFor={id} className="text-sm font-semibold">
          Forecast time
        </label>
        <output htmlFor={id} className="font-mono text-sm tabular-nums">
          {clock}
          {hour === departure ? " (departure hour)" : ""}
        </output>
      </div>

      <input
        id={id}
        type="range"
        min={0}
        max={store.max}
        step={1}
        value={hour}
        onChange={onChange}
        onKeyDown={onKeyDown}
        aria-valuetext={valueText}
        className="h-5 w-full cursor-pointer accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      />

      {/* A mark under the track at the departure hour, lined up with where the thumb sits for that hour. */}
      {departure !== null ? (
        <div aria-hidden="true" className="relative -mt-1 h-7 text-xs">
          <span
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center leading-tight"
            style={{ left: `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${departure / store.max})` }}
          >
            <span>▲</span>
            <span className="whitespace-nowrap font-semibold">Departs</span>
          </span>
        </div>
      ) : null}

      <div aria-hidden="true" className="flex justify-between text-xs opacity-75">
        <span>{formatDateTime(heatmap.hours[0])}</span>
        <span>{formatDateTime(heatmap.hours[store.max])}</span>
      </div>
      <p className="text-sm">
        <span className="opacity-75">Truck: </span>
        {truck}
      </p>
    </section>
  );
};
