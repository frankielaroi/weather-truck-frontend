/** Display helpers for trip results. Times arrive as UTC ISO strings and show in the browser's time zone. */

export const formatMiles = (miles: number): string =>
  `${miles.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;

/** 56673 → "15 h 45 min"; under an hour → "42 min". */
export const formatDuration = (seconds: number): string => {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes} min` : `${hours} h ${String(minutes).padStart(2, "0")} min`;
};

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
