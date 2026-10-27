"use client";

import { useEffect } from "react";

/** Marks the landing intro as played for this browser session (read by the root layout's head script). */
export function IntroSeen() {
  useEffect(() => {
    try {
      sessionStorage.setItem("ct-intro", "1");
    } catch {}
  }, []);
  return null;
}
