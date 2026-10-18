import { RISK_COLOR, riskTitle, type RiskLevel } from "./risk";

type Props = {
  level: RiskLevel;
  className?: string;
};

/** A risk level as a coloured pill that always shows the level's name: `<RiskPill level="severe" />`. */
export const RiskPill = ({ level, className = "" }: Props): React.ReactElement => {
  const { label, fillClass } = RISK_COLOR[level];
  return (
    <span
      title={riskTitle(level)}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${fillClass} ${className}`}
    >
      {label}
    </span>
  );
};
