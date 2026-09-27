"use client";

import React, { useEffect, useRef } from "react";

interface HeroLogoProps {
  className?: string;
}

/**
 * HeroLogo
 *
 * Contained, modest-scale visual widget displaying the real brand logo
 * (/brand/vouch-logo.png) with canvas-based retro pixelation and
 * a continuous diagonal light-sweep animation.
 */
export function HeroLogo({ className = "" }: HeroLogoProps) {
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
      className={`relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-[340px] lg:h-[340px] aspect-square flex items-center justify-center select-none pointer-events-none ${className}`}
    >
      {/* Soft ambient radial glow directly around/behind the mascot logo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(139,115,224,0.28)_0%,rgba(109,90,194,0.15)_45%,transparent_70%)] blur-xl pointer-events-none"
      />

      {/* Floating Mascot Logo with Drop-Shadow Glow directly on the image */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          filter: "drop-shadow(0 0 28px rgba(139, 115, 224, 0.45)) drop-shadow(0 0 10px rgba(109, 90, 194, 0.3))",
        }}
      >
        {/* Pixelated Canvas of the Real Logo */}
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="w-full h-full object-contain [image-rendering:pixelated] [image-rendering:crisp-edges] relative z-10"
        />

        {/* Diagonal Light-Sweep Gradient Animation */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen z-20 overflow-hidden"
          style={{
            maskImage: "radial-gradient(circle at 50% 50%, black 50%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 50%, transparent 75%)",
          }}
        >
          <div
            className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2"
            style={{
              background:
                "linear-gradient(115deg, transparent 25%, rgba(109,90,194,0.15) 42%, rgba(139,115,224,0.5) 48%, rgba(94,234,212,0.65) 51%, rgba(139,115,224,0.5) 54%, rgba(109,90,194,0.15) 60%, transparent 75%)",
              animation: "sweep-diagonal 7s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Backwards compatibility alias
export { HeroLogo as HeroLogoBackground };
