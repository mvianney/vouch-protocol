import React from "react";

/**
 * PixelVLogo
 *
 * An animated, pixelated/low-res stylized "V" logo that sits behind the hero content.
 * Features:
 *   - Chunky pixel matrix forming the iconic "V" shape
 *   - Subtle purple & teal color palette matching the terminal theme
 *   - Continuous slow diagonal light-sweep gradient animation across the pixel grid
 *   - Low contrast & opacity so it never competes with the headline in front
 */
export function PixelVLogo() {
  // 17 columns x 10 rows pixel matrix
  // Each array contains [col, row] of illuminated pixels forming the chunky V
  const pixels: [number, number][] = [
    // Row 0
    [0, 0], [1, 0], [2, 0], [14, 0], [15, 0], [16, 0],
    // Row 1
    [1, 1], [2, 1], [3, 1], [13, 1], [14, 1], [15, 1],
    // Row 2
    [2, 2], [3, 2], [4, 2], [12, 2], [13, 2], [14, 2],
    // Row 3
    [3, 3], [4, 3], [5, 3], [11, 3], [12, 3], [13, 3],
    // Row 4
    [4, 4], [5, 4], [6, 4], [10, 4], [11, 4], [12, 4],
    // Row 5
    [5, 5], [6, 5], [7, 5], [9, 5], [10, 5], [11, 5],
    // Row 6
    [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
    // Row 7
    [7, 7], [8, 7], [9, 7],
    // Row 8
    [8, 8],
  ];

  const cellSize = 22;
  const gap = 4;
  const totalWidth = 17 * (cellSize + gap);
  const totalHeight = 10 * (cellSize + gap);

  return (
    <div
      aria-hidden="true"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 overflow-hidden flex items-center justify-center opacity-30 md:opacity-35"
      style={{
        width: "min(680px, 92vw)",
        height: "min(400px, 60vw)",
      }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="w-full h-auto max-h-full drop-shadow-[0_0_25px_rgba(109,90,194,0.3)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Base pixel fill */}
            <linearGradient id="v-pixel-base" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4338ca" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6d5ac2" stopOpacity="0.25" />
            </linearGradient>

            {/* Diagonal light sweep gradient */}
            <linearGradient id="v-light-sweep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6d5ac2" stopOpacity="0.1" />
              <stop offset="42%" stopColor="#8b73e0" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#5eead4" stopOpacity="0.85" />
              <stop offset="58%" stopColor="#8b73e0" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6d5ac2" stopOpacity="0.1" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from="-1.2 -1.2"
                to="1.2 1.2"
                dur="6.5s"
                repeatCount="indefinite"
              />
            </linearGradient>

            {/* Glowing sweep filter */}
            <filter id="v-pixel-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background grid dots / faint matrix aura */}
          <g opacity="0.18">
            {Array.from({ length: 17 }).map((_, c) =>
              Array.from({ length: 10 }).map((_, r) => (
                <circle
                  key={`dot-${c}-${r}`}
                  cx={c * (cellSize + gap) + cellSize / 2}
                  cy={r * (cellSize + gap) + cellSize / 2}
                  r="1.2"
                  fill="#6d5ac2"
                />
              ))
            )}
          </g>

          {/* Primary illuminated V pixel blocks */}
          {pixels.map(([c, r], idx) => {
            const x = c * (cellSize + gap);
            const y = r * (cellSize + gap);
            return (
              <g key={`pixel-${idx}`}>
                {/* Base pixel block */}
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx="3"
                  fill="url(#v-pixel-base)"
                  stroke="rgba(109, 90, 194, 0.25)"
                  strokeWidth="1"
                />
                {/* Diagonal light-sweep overlay */}
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx="3"
                  fill="url(#v-light-sweep)"
                  style={{ mixBlendMode: "screen" }}
                />
              </g>
            );
          })}
        </svg>

        {/* Ambient radial glow centered behind V */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(109,90,194,0.18) 0%, transparent 75%)",
          }}
        />
      </div>
    </div>
  );
}
