"use client";

import React, { useEffect, useRef } from "react";

/**
 * HeroLogoBackground
 *
 * Renders the real brand logo (/brand/vouch-logo.png) as a low-res pixelated
 * background graphic with a continuous diagonal light-sweep animation.
 *
 * Techniques:
 *   - Canvas-based downsampling to 64x64 and crisp nearest-neighbor upscale
 *     so the actual metallic 3D V logo is rendered as chunky retro-terminal pixels.
 *   - Radial vignette mask so the edges smoothly dissolve into the void background.
 *   - GPU-accelerated diagonal light-sweep gradient animating across the logo.
 *   - Subtle opacity (28-34%) ensuring foreground headline legibility.
 */
export function HeroLogoBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/brand/vouch-logo.png";

    img.onload = () => {
      // Offscreen low-res canvas for genuine pixelation
      const lowResSize = 64;
      const offscreen = document.createElement("canvas");
      offscreen.width = lowResSize;
      offscreen.height = lowResSize;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      offCtx.drawImage(img, 0, 0, lowResSize, lowResSize);

      // Disable image smoothing for chunky pixel rendering
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 overflow-hidden flex items-center justify-center opacity-30 md:opacity-35"
      style={{
        width: "min(520px, 88vw)",
        height: "min(520px, 88vw)",
        maskImage: "radial-gradient(circle at 50% 50%, black 42%, transparent 72%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 42%, transparent 72%)",
      }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Pixelated Canvas of the Real Logo */}
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="w-full h-full object-contain [image-rendering:pixelated] [image-rendering:crisp-edges]"
        />

        {/* Diagonal Light-Sweep Gradient Animation */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{
            overflow: "hidden",
          }}
        >
          <div
            className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2"
            style={{
              background:
                "linear-gradient(115deg, transparent 20%, rgba(109,90,194,0.1) 40%, rgba(139,115,224,0.45) 48%, rgba(94,234,212,0.6) 51%, rgba(139,115,224,0.45) 54%, rgba(109,90,194,0.1) 60%, transparent 80%)",
              animation: "sweep-diagonal 7s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
