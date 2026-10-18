// MapLibre runs tile parsing in a web worker. Bundlers can't inline an ESM worker
// that the library locates by URL, so serve it from /public and point MapLibre at
// it with setWorkerUrl (see MapCanvas.tsx). Runs on `npm install`.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/maplibre", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre/maplibre-gl-worker.mjs");
console.log("Copied maplibre-gl-worker.mjs to public/maplibre/");
