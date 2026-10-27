"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

export type ParallaxProps = {
  children: React.ReactNode;
  distance: number;
  /** `hero`: at rest at the top, drifts down over the first screen. `view`: drifts +distance → -distance across the viewport. */
  anchor?: "hero" | "view";
  fade?: boolean;
  className?: string;
};

const ParallaxJs = dynamic(() => import("./ParallaxJs"), { ssr: false });

const noop = () => () => {};
const query = (q: string) => () => window.matchMedia(q).matches;
const scrollTimeline = () => CSS.supports("animation-timeline: view()");
const reducedMotion = query("(prefers-reduced-motion: reduce)");

/**
 * Moves its children against the scroll for depth. Most browsers do this in CSS
 * (scroll-driven animations, in step with native scrolling, no JS per frame).
 * Only browsers without that support download the Motion fallback.
 */
export function Parallax(props: ParallaxProps) {
  const native = useSyncExternalStore(noop, scrollTimeline, () => true);
  const reduce = useSyncExternalStore(noop, reducedMotion, () => false);
  const { children, distance, anchor = "view", fade = false, className = "" } = props;

  if (!native && !reduce) return <ParallaxJs {...props} />;

  return (
    <div
      style={{ "--px": `${distance}px` } as React.CSSProperties}
      className={`${anchor === "hero" ? "px-hero" : "px-view"} ${fade ? "px-fade" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
