"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // milliseconds
  direction?: "up" | "none";
}

/**
 * ScrollReveal
 *
 * Fades in and slides up slightly when scrolled into view using IntersectionObserver.
 * Supports configurable delay for staggered child animations.
 */
export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const translateStyle =
    direction === "up" && !isVisible ? "translate-y-6" : "translate-y-0";
  const opacityStyle = isVisible ? "opacity-100" : "opacity-0";

  return (
    <div
      ref={elementRef}
      className={`transition-all duration-700 ease-out ${opacityStyle} ${translateStyle} ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
