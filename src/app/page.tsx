"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    apiGet<{ status: string }>("/health/")
      .then((d) => setStatus(d.status === "ok" ? "ok" : "down"))
      .catch(() => setStatus("down"));
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">Weather-Aware Truck Routing</h1>
      <p className="text-zinc-500">
        Backend API:{" "}
        <span className={status === "ok" ? "text-green-600" : status === "down" ? "text-red-600" : ""}>
          {status}
        </span>
      </p>
    </main>
  );
}
