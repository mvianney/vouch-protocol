import React from "react";

export type DeltaDirection = "pos" | "neg" | "neutral";

export interface CompareRow {
  /** Row label — rendered in sans */
  label: string;
  /** 'Before' value — always mono (optional for single-verdict rows) */
  before?: string | number;
  /** 'After' value — always mono (optional for single-verdict rows) */
  after?: string | number;
  /** Delta display value, e.g. "+12.4" or "-3.1" */
  delta?: string | number;
  /** Direction controls teal (pos) or red (neg) colouring */
  direction?: DeltaDirection;
  /** If true, renders as a single-verdict row spanning data columns without a before/after delta */
  isVerdict?: boolean;
  /** Optional single verdict score or value */
  verdictValue?: string | number;
  /** Optional rubric breakdown or detail note */
  details?: string;
}

interface ComparisonTableProps {
  /** Column headers */
  headers?: {
    label?: string;
    before?: string;
    after?: string;
    delta?: string;
  };
  rows: CompareRow[];
  /** Whether to show the delta column */
  showDelta?: boolean;
  className?: string;
}

/**
 * ComparisonTable
 *
 * A sparse, mono-values table for before/after data, outcomes, or agent comparisons.
 *
 * Positive deltas → teal  (var(--teal))
 * Negative deltas → red   (var(--red))
 * Neutral         → muted grey
 *
 * The label column uses sans; all data cells use monospace.
 */
export function ComparisonTable({
  headers = {
    label: "Metric",
    before: "Before",
    after: "After",
    delta: "Δ",
  },
  rows,
  showDelta = true,
  className = "",
}: ComparisonTableProps) {
  return (
    <div className={`terminal-card overflow-hidden ${className}`}>
      <table className="compare-table">
        <thead>
          <tr>
            <th style={{ paddingLeft: "1.25rem" }}>{headers.label}</th>
            <th>{headers.before}</th>
            <th>{headers.after}</th>
            {showDelta && <th style={{ paddingRight: "1.25rem" }}>{headers.delta}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.isVerdict) {
              return (
                <tr key={i} className="hover:bg-[var(--purple-faint)] transition-colors">
                  <td
                    className="cell-label"
                    style={{ paddingLeft: "1.25rem", color: "var(--text-primary)" }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                      <span className="font-semibold text-sm">{row.label}</span>
                      {row.verdictValue && (
                        <span className="font-mono font-bold text-[var(--teal)] text-sm">
                          {row.verdictValue}
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    colSpan={showDelta ? 3 : 2}
                    className="cell-mono"
                    style={{ paddingRight: "1.25rem" }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-[var(--text-secondary)] font-mono">
                        {row.details || row.after}
                      </span>
                      {row.delta && (
                        <span
                          className={`tag ${
                            row.direction === "pos"
                              ? "tag-teal"
                              : row.direction === "neg"
                              ? "tag-red"
                              : ""
                          }`}
                        >
                          {row.delta}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }

            const deltaClass =
              row.direction === "pos"
                ? "delta-pos"
                : row.direction === "neg"
                ? "delta-neg"
                : "";

            return (
              <tr key={i}>
                <td
                  className="cell-label"
                  style={{ paddingLeft: "1.25rem", color: "var(--text-primary)" }}
                >
                  {row.label}
                </td>
                <td className="cell-mono">{row.before ?? "-"}</td>
                <td
                  className="cell-mono"
                  style={{
                    color:
                      row.direction === "pos"
                        ? "var(--teal)"
                        : row.direction === "neg"
                        ? "var(--red)"
                        : "var(--text-secondary)",
                  }}
                >
                  {row.after ?? "-"}
                </td>
                {showDelta && (
                  <td
                    className={`cell-mono ${deltaClass}`}
                    style={{ paddingRight: "1.25rem" }}
                  >
                    {typeof row.delta === "string"
                      ? row.delta.replace(/^\++/, "+")
                      : row.delta ?? "-"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
