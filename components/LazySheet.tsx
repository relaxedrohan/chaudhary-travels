"use client";

import dynamic from "next/dynamic";

const load = () => import("./Sheet");

/**
 * The bottom sheet (and the animation library it uses) loads separately from
 * the page. Pages call preloadSheet() once idle so the first tap is instant.
 */
export const Sheet = dynamic(() => load().then((m) => m.Sheet), { ssr: false });

export function preloadSheet() {
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300));
  idle(() => void load());
}
