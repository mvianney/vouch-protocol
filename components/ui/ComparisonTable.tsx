import React from "react";

export type DeltaDirection = "pos" | "neg" | "neutral";

export interface CompareRow {
  /** Row label — rendered in sans */
  label: string;
  /** 'Before' value — always mono */
  before: string | number;
  /** 'After' value — always mono */
  after: string | number;
  /** Delta display value, e.g. "+12.4" or "-3.1" */
  delta?: string | number;
  /** Direction controls teal (pos) or red (neg) colouring */
  direction?: DeltaDirection;
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
                <td className="cell-mono">{row.before}</td>
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
                  {row.after}
                </td>
                {showDelta && (
                  <td
                    className={`cell-mono ${deltaClass}`}
                    style={{ paddingRight: "1.25rem" }}
                  >
                    {row.delta ?? "—"}
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
