/**
 * Base map settings (F4). Tiles are OpenFreeMap's free vector tiles (no key); the
 * attribution comes with the tiles and the map shows it. To use another provider,
 * set NEXT_PUBLIC_MAP_STYLE_URL to a MapLibre style URL and keep its credit visible.
 */
export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

/** [longitude, latitude] and zoom that show the lower 48 states before a trip is planned. */
export const DEFAULT_MAP_CENTER: [number, number] = [-96, 38.5];
export const DEFAULT_MAP_ZOOM = 3.2;
