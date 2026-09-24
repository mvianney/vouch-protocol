import React from "react";

type LiveDotColor = "teal" | "purple" | "red";
type ValueSize = "sm" | "md" | "lg";

interface LiveStatBlockProps {
  /** Short label describing the metric, e.g. "Trust Score" */
  label: string;
  /** The data value — always rendered in monospace */
  value: React.ReactNode;
  /** Optional unit/suffix displayed after the value, e.g. "%" or "SOL" */
  unit?: string;
  /** Whether to show the live status indicator */
  live?: boolean;
  /** Status line text, e.g. "updating every 2s" */
  liveText?: string;
  /** Color of the live pulsing dot */
  dotColor?: LiveDotColor;
  /** Size of the value display */
  valueSize?: ValueSize;
  className?: string;
}

const valueSizeClass: Record<ValueSize, string> = {
  sm: "stat-value-sm",
  md: "stat-value",
  lg: "stat-value-lg",
};

const dotColorClass: Record<LiveDotColor, string> = {
  teal: "live-dot",
  purple: "live-dot-purple",
  red: "live-dot",
};

const dotColorStyle: Record<LiveDotColor, React.CSSProperties> = {
  teal: {},
  purple: {},
  red: {
    background: "var(--red)",
    boxShadow: "0 0 6px var(--red)",
  },
};

/**
 * LiveStatBlock
 *
 * A compact card showing:
 *   - A small all-caps label (sans font)
 *   - A large monospace value (numbers, scores, etc.)
 *   - An optional live-status line with pulsing dot
 *
 * Always renders the value in monospace — never sans-serif.
 */
export function LiveStatBlock({
  label,
  value,
  unit,
  live = false,
  liveText = "live",
  dotColor = "teal",
  valueSize = "md",
  className = "",
}: LiveStatBlockProps) {
  return (
    <div className={`stat-block ${className}`}>
      <p className="stat-label">{label}</p>

      <p className={valueSizeClass[valueSize]}>
        {value}
        {unit && (
          <span
            className="text-[0.45em] font-mono ml-1 align-baseline"
            style={{ color: "var(--text-muted)" }}
          >
            {unit}
          </span>
        )}
      </p>

      {live && (
        <div className="stat-live">
          <span
            className={dotColorClass[dotColor]}
            style={dotColorStyle[dotColor]}
            aria-label="live"
          />
          {liveText}
        </div>
      )}
    </div>
  );
}
