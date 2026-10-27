"use client";

import "lenis/dist/lenis.css";
import { useEffect } from "react";

/**
 * Eased wheel/trackpad scrolling, on mouse-and-trackpad devices only. Phones keep
 * native momentum scrolling and never download Lenis or run its frame loop.
 */
export function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    let lenis: { destroy(): void } | undefined;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (!cancelled) lenis = new Lenis({ lerp: 0.09, autoRaf: true });
    });
    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, []);
  return null;
}
