import { RISK_LEVELS, RiskLegend, RiskPill } from "@/components/ui";

import { ApiStatus } from "./_components/ApiStatus";

const Home = (): React.ReactElement => (
  <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
    <div className="flex flex-col items-center gap-2">
      <h1 className="text-3xl font-semibold">Weather-Aware Truck Routing</h1>
      <ApiStatus />
    </div>
    <div className="flex flex-wrap justify-center gap-2">
      {RISK_LEVELS.map((level) => (
        <RiskPill key={level} level={level} />
      ))}
    </div>
    <RiskLegend className="w-full max-w-md" />
  </main>
);

export default Home;
