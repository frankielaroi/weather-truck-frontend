import { Button } from "@/components/ui";

import type { HeatmapState } from "../hooks/useHeatmap";

type Props = {
  status: HeatmapState["status"];
  visible: boolean;
  onToggle: (visible: boolean) => void;
  onRetry: () => void;
};

/** Turns the weather heatmap on or off and says what it's showing: `<HeatmapControl status="ready" visible onToggle={set} ... />`. */
export const HeatmapControl = ({ status, visible, onToggle, onRetry }: Props): React.ReactElement | null => {
  if (status === "idle") return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <label className="flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          checked={visible}
          disabled={status !== "ready"}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-4 accent-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
        Weather heatmap
      </label>
      {status === "loading" ? (
        <span role="status" className="opacity-75">
          Loading the heatmap…
        </span>
      ) : null}
      {status === "error" ? (
        <span role="alert" className="flex items-center gap-2">
          The weather heatmap didn’t load. Your routes are still shown.
          <Button variant="secondary" onClick={onRetry} className="px-3 py-1 text-sm">
            Try again
          </Button>
        </span>
      ) : null}
    </div>
  );
};
