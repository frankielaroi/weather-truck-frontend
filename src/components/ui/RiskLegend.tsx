import { RISK_COLOR, RISK_LEVELS } from "./risk";

type Props = {
  className?: string;
};

/** Key for every risk state, lowest to highest, then Unknown: `<RiskLegend />`. */
export const RiskLegend = ({ className = "" }: Props): React.ReactElement => (
  <section aria-labelledby="risk-legend-title" className={className}>
    <h2 id="risk-legend-title" className="mb-2 text-sm font-semibold">
      Risk levels
    </h2>
    <ul className="flex flex-col gap-2">
      {RISK_LEVELS.map((level) => {
        const { label, description, fillClass } = RISK_COLOR[level];
        return (
          <li key={level} className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className={`mt-0.5 size-4 shrink-0 rounded-sm ring-1 ring-risk-outline/40 ${fillClass}`}
            />
            <span>
              <span className="font-semibold">{label}</span>
              <span className="opacity-75"> — {description}</span>
            </span>
          </li>
        );
      })}
    </ul>
  </section>
);
