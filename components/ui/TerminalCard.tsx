import React from "react";

interface TerminalCardProps {
  /** Monospace label shown in the header bar, e.g. "agent.search · devnet" */
  label: string;
  /** Optional badge text shown at the right of the header (e.g. network name) */
  badge?: string;
  /** Optional showDots kept as optional boolean for backwards compatibility */
  showDots?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * TerminalCard
 *
 * A dark bordered card with a terminal-style header bar containing:
 *   - Optional macOS-style window dots (red / yellow / green)
 *   - A monospace label (e.g. "agent.search · devnet")
 *   - An optional badge (e.g. network name, status)
 *
 * Body content goes in the slot. All data values inside should use
 * font-mono or the .mono-* utility classes.
 */
export function TerminalCard({
  label,
  badge,
  className = "",
  children,
}: TerminalCardProps) {
  return (
    <div className={`terminal-card ${className}`}>
      {/* Header bar */}
      <div className="terminal-card-header">
        <span className="terminal-label">{label}</span>
        {badge && <span className="terminal-badge">{badge}</span>}
      </div>

      {/* Body */}
      <div className="terminal-card-body">{children}</div>
    </div>
  );
}
