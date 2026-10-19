"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api";

/** Shows whether the backend's health check answers: `<ApiStatus />`. */
export const ApiStatus = (): React.ReactElement => {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    apiGet<{ status: string }>("/health/")
      .then((d) => setStatus(d.status === "ok" ? "ok" : "down"))
      .catch(() => setStatus("down"));
  }, []);

  return (
    <p className="text-zinc-500">
      {/* Backend API:{" "} */}
      {/* <span className={status === "ok" ? "text-green-600" : status === "down" ? "text-red-600" : ""}>
        {status} 
      </span> */}
    </p>
  );
};
