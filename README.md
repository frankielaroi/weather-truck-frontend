# Weather-Aware Truck Routing — Web App

Next.js 16 (App Router, TypeScript, Tailwind) app that shows route options, weather checkpoints, risk levels, ETAs and a 0–48 h weather heatmap on a map.

Backend: [weather-truck-backend](https://github.com/frankielaroi/weather-truck-backend)

## Running locally (http://localhost:3000)

```bash
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL points at the backend
npm run dev
```

The home page shows whether it can reach the backend's `/api/health/` endpoint.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the Django API (default `http://localhost:8000/api`) |
