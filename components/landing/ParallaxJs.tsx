"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import type { ParallaxProps } from "./Parallax";

/** JS fallback for browsers without CSS scroll-driven animations. Loaded on demand. */
export default function ParallaxJs({ children, distance, anchor = "view", fade = false, className = "" }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const page = useScroll();
  const inView = useScroll({ target: ref, offset: ["start end", "end start"] });
  const heroY = useTransform(page.scrollY, [0, 800], [0, distance]);
  const heroOpacity = useTransform(page.scrollY, [0, 360, 800], [1, 1, fade ? 0.15 : 1]);
  const viewY = useTransform(inView.scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <motion.div
      ref={ref}
      style={anchor === "hero" ? { y: heroY, opacity: heroOpacity } : { y: viewY }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
