"use client";

import { useId, useState, type KeyboardEvent } from "react";

import { Field, inputClass } from "@/components/ui";

import { usePlaceSearch } from "../hooks/usePlaceSearch";
import { PLACE_SEARCH_MIN_LENGTH } from "../place-search";
import type { Place } from "../types";

type Props = {
  id: string;
  label: string;
  /** What the driver has typed. */
  text: string;
  /** The suggestion they picked; null until they pick one, and again when they edit the text. */
  place: Place | null;
  error?: string;
  onChange: (text: string, place: Place | null) => void;
};

/**
 * A place box with suggestions (ARIA combobox): type 3+ letters, ↑/↓ to move,
 * Enter to pick, Esc to close. A place only counts once it's picked, so it always has coordinates.
 */
export const PlaceField = ({ id, label, text, place, error, onChange }: Props): React.ReactElement => {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const search = usePlaceSearch(text);

  const results = search.query === text.trim().replace(/\s+/g, " ") ? search.results : [];
  const showList = open && !place && results.length > 0;
  const optionId = (i: number): string => `${listId}-${i}`;

  const pick = (chosen: Place): void => {
    onChange(chosen.name, chosen);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "ArrowDown" && results.length > 0 && !place) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (showList ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && showList) {
      e.preventDefault(); // choose the suggestion instead of submitting the form
      pick(results[Math.min(active, results.length - 1)]);
    } else if (e.key === "Escape" && showList) {
      e.preventDefault();
      setOpen(false);
    }
  };

  let status = "";
  if (!place && search.status === "loading") status = "Searching…";
  else if (!place && search.status === "error") status = search.error?.message ?? "Search failed. Try again.";
  else if (!place && search.status === "done" && search.query === text.trim().replace(/\s+/g, " ")) {
    status = results.length === 0 ? "No places found." : `${results.length} suggestions. Use the arrow keys to choose.`;
  }

  return (
    <Field id={id} label={label} hint={`Type at least ${PLACE_SEARCH_MIN_LENGTH} letters, then pick a suggestion.`} error={error}>
      {(aria) => (
        <div className="relative">
          <input
            {...aria}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={showList ? optionId(Math.min(active, results.length - 1)) : undefined}
            value={text}
            onChange={(e) => {
              onChange(e.target.value, null);
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            className={inputClass}
          />
          <ul
            id={listId}
            role="listbox"
            aria-label={`${label} suggestions`}
            hidden={!showList}
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-foreground/40 bg-background shadow-lg"
          >
            {results.map((result, i) => (
              <li
                key={`${result.name}-${result.lat}-${result.lng}`}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: the input's blur would close the list before a click lands
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(result);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-foreground text-background" : ""}`}
              >
                {result.name}
              </li>
            ))}
          </ul>
          <p aria-live="polite" className="sr-only">
            {status}
          </p>
          {place ? (
            <p className="mt-1 text-xs opacity-75">Place selected.</p>
          ) : status ? (
            <p aria-hidden="true" className="mt-1 text-xs opacity-75">
              {status}
            </p>
          ) : null}
        </div>
      )}
    </Field>
  );
};
