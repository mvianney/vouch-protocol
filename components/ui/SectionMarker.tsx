import React from "react";

interface SectionMarkerProps {
  /** Two-digit string, e.g. "01", "02", "03" */
  number: string;
  /** Positioning — "top-left" is default for most layouts */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
}

const positionClasses: Record<
  NonNullable<SectionMarkerProps["position"]>,
  string
> = {
  "top-left": "-top-4 -left-2 sm:-top-8 sm:-left-4",
  "top-right": "-top-4 -right-2 sm:-top-8 sm:-right-4",
  "bottom-left": "-bottom-8 -left-2 sm:-bottom-12 sm:-left-4",
  "bottom-right": "-bottom-8 -right-2 sm:-bottom-12 sm:-right-4",
};

/**
 * SectionMarker
 *
 * Renders a large, faint, purple-tinted two-digit number as a background
 * section decorator. Wrap it in a `relative overflow-hidden` container.
 *
 * Example:
 *   <section className="relative overflow-hidden py-24">
 *     <SectionMarker number="01" />
 *     <h2>Section heading</h2>
 *   </section>
 */
export function SectionMarker({
  number,
  position = "top-left",
  className = "",
}: SectionMarkerProps) {
  return (
    <span
      aria-hidden
      className={`section-marker ${positionClasses[position]} ${className}`}
    >
      {number}
    </span>
  );
}
