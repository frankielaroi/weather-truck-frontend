import { Suspense } from "react";

import { RiskLegend } from "@/components/ui";
import { TripPlanner } from "@/features/trip-planner";

import { ApiStatus } from "./_components/ApiStatus";

const Home = (): React.ReactElement => (
  <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-4 py-8 sm:px-6">
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-3xl font-semibold">Weather-Aware Truck Routing</h1>
      <p className="max-w-xl opacity-75">Enter a trip to see which route has the safest weather for your load.</p>
      <ApiStatus />
    </div>
    <Suspense fallback={<p>Loading the trip planner…</p>}>
      <TripPlanner />
    </Suspense>
    <RiskLegend className="w-full max-w-md" />
  </main>
);

export default Home;
