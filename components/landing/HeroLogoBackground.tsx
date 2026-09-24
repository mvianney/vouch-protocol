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
      className={`relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[340px] aspect-square rounded-2xl border border-[var(--border-dim)] bg-[var(--void-2)] p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none ${className}`}
    >
      {/* Top Header Label & Dots */}
      <div className="flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ff5f57]/80" />
          <span className="w-2 h-2 rounded-full bg-[#febc2e]/80" />
          <span className="w-2 h-2 rounded-full bg-[#28c840]/80" />
        </div>
        <span className="font-mono text-2xs text-[var(--text-muted)] tracking-wider">
          vouch.asset · 8004
        </span>
      </div>

      {/* Centered Pixelated Logo Canvas with Light Sweep */}
      <div className="relative w-full flex-1 flex items-center justify-center my-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="w-full h-full object-contain [image-rendering:pixelated] [image-rendering:crisp-edges] relative z-10 opacity-90"
        />

        {/* Diagonal Light-Sweep Gradient Animation */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen z-20 overflow-hidden"
        >
          <div
            className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2"
            style={{
              background:
                "linear-gradient(115deg, transparent 25%, rgba(109,90,194,0.12) 42%, rgba(139,115,224,0.45) 48%, rgba(94,234,212,0.55) 51%, rgba(139,115,224,0.45) 54%, rgba(109,90,194,0.12) 60%, transparent 75%)",
              animation: "sweep-diagonal 7s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* Bottom telemetry footer */}
      <div className="flex items-center justify-between pointer-events-none z-20 font-mono text-[10px] text-[var(--text-muted)] pt-1.5 border-t border-[var(--border-faint)]">
        <span className="text-[var(--teal)] flex items-center gap-1.5">
          <span className="live-dot" />
          <span>registry.verified</span>
        </span>
        <span className="text-[var(--text-dim)]">solana:devnet</span>
      </div>
    </div>
  );
}

// Backwards compatibility alias
export { HeroLogo as HeroLogoBackground };
