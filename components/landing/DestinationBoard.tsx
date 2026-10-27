"use client";

import { useEffect, useRef } from "react";

// Classic 5×7 dot-matrix font, column-major, bit 0 = top row.
const FONT: Record<string, number[]> = {
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e], B: [0x7f, 0x49, 0x49, 0x49, 0x36],
  C: [0x3e, 0x41, 0x41, 0x41, 0x22], D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41], F: [0x7f, 0x09, 0x09, 0x09, 0x01],
  G: [0x3e, 0x41, 0x49, 0x49, 0x7a], H: [0x7f, 0x08, 0x08, 0x08, 0x7f],
  I: [0x00, 0x41, 0x7f, 0x41, 0x00], J: [0x20, 0x40, 0x41, 0x3f, 0x01],
  K: [0x7f, 0x08, 0x14, 0x22, 0x41], L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 0x02, 0x0c, 0x02, 0x7f], N: [0x7f, 0x04, 0x08, 0x10, 0x7f],
  O: [0x3e, 0x41, 0x41, 0x41, 0x3e], P: [0x7f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e], R: [0x7f, 0x09, 0x19, 0x29, 0x46],
  S: [0x46, 0x49, 0x49, 0x49, 0x31], T: [0x01, 0x01, 0x7f, 0x01, 0x01],
  U: [0x3f, 0x40, 0x40, 0x40, 0x3f], V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x3f, 0x40, 0x38, 0x40, 0x3f], X: [0x63, 0x14, 0x08, 0x14, 0x63],
  Y: [0x07, 0x08, 0x70, 0x08, 0x07], Z: [0x61, 0x51, 0x49, 0x45, 0x43],
  "0": [0x3e, 0x51, 0x49, 0x45, 0x3e], "1": [0x00, 0x42, 0x7f, 0x40, 0x00],
  "2": [0x42, 0x61, 0x51, 0x49, 0x46], "3": [0x21, 0x41, 0x45, 0x4b, 0x31],
  "4": [0x18, 0x14, 0x12, 0x7f, 0x10], "5": [0x27, 0x45, 0x45, 0x45, 0x39],
  "6": [0x3c, 0x4a, 0x49, 0x49, 0x30], "7": [0x01, 0x71, 0x09, 0x05, 0x03],
  "8": [0x36, 0x49, 0x49, 0x49, 0x36], "9": [0x06, 0x49, 0x49, 0x29, 0x1e],
  " ": [0, 0, 0, 0, 0], ".": [0x00, 0x60, 0x60, 0x00, 0x00],
  "*": [0x00, 0x08, 0x1c, 0x08, 0x00],
};

const ROWS = 7;
const PAD = 1; // unlit rows above and below the text

/** Turns text into columns of 7-bit dot patterns, one blank column between letters. */
function rasterize(text: string) {
  const cols: number[] = [];
  for (const ch of text.toUpperCase()) {
    cols.push(...(FONT[ch] ?? FONT[" "]), 0);
  }
  return cols;
}

/**
 * An Indian bus destination board: red LEDs that power on, then scroll.
 * Drawn on a canvas and stepped one dot-column at a time, like the real thing.
 */
export function DestinationBoard({ text, label }: { text: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Reserve the final size before JS runs (same rule as size() below), so the
  // board never paints at the canvas default 300×150 and shifts the page.
  const fitCols = rasterize(text.trim().split("*")[0].trim()).length + 1;
  const boxStyle = {
    aspectRatio: `${fitCols} / ${ROWS + PAD * 2}`,
    maxHeight: `${(ROWS + PAD * 2) * 10}px`,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const message = rasterize(text);
    // Size the dots so the first phrase ("All India routes") fits on one screen,
    // and start with it in view, one blank column from the left edge.
    const leading = text.length - text.trimStart().length;
    const phraseCols = rasterize(text.trim().split("*")[0].trim()).length;
    const rows = ROWS + PAD * 2;

    let pitch = 8; // CSS px per dot column
    let dpr = 1;
    let visible = 0;
    let xPad = 0;
    let offset = Math.max(0, leading * 6 - 1);
    let poweredCols = reduce ? Infinity : 0;
    let raf = 0;
    let last = 0;
    let holdUntil = 0;
    let onScreen = true;
    // Two pre-rendered layers, so each step is a couple of image copies
    // instead of redrawing ~900 dots.
    const unlit = document.createElement("canvas"); // the dark board, every dot off
    const lit = document.createElement("canvas"); // the whole message, lit dots only

    // Wait for the landing intro to lift before powering on.
    const introPlaying =
      !reduce &&
      !document.documentElement.classList.contains("no-intro") &&
      document.querySelector(".intro") !== null;
    const startAt = performance.now() + (introPlaying ? 1700 : 0);

    const dot = (c: CanvasRenderingContext2D, x: number, y: number, r: number, on: boolean) => {
      if (on) {
        c.fillStyle = "rgba(255, 70, 60, 0.22)";
        c.beginPath();
        c.arc(x, y, r * 1.7, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = on ? "#ff4a3d" : "#3a3334";
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    };

    const size = () => {
      const w = canvas.clientWidth;
      pitch = Math.min(10, w / (phraseCols + 1));
      visible = Math.floor(w / pitch);
      xPad = (w - visible * pitch) / 2;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const h = rows * pitch;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;

      const p = pitch * dpr; // device px per column
      const r = p * 0.34;

      unlit.width = canvas.width;
      unlit.height = canvas.height;
      const u = unlit.getContext("2d")!;
      u.fillStyle = "#231f20";
      u.fillRect(0, 0, unlit.width, unlit.height);
      for (let c = 0; c < visible; c++)
        for (let row = 0; row < rows; row++) dot(u, xPad * dpr + c * p + p / 2, row * p + p / 2, r, false);

      lit.width = Math.ceil(message.length * p);
      lit.height = canvas.height;
      const l = lit.getContext("2d")!;
      l.clearRect(0, 0, lit.width, lit.height);
      message.forEach((col, c) => {
        for (let bit = 0; bit < ROWS; bit++)
          if ((col >> bit) & 1) dot(l, c * p + p / 2, (bit + PAD) * p + p / 2, r, true);
      });
    };

    const draw = () => {
      ctx.drawImage(unlit, 0, 0);
      const p = pitch * dpr;
      const cols = Math.min(visible, poweredCols);
      // Copy the lit message window starting at `offset`, wrapping at the end.
      const first = Math.min(cols, message.length - offset);
      const x0 = xPad * dpr;
      if (first > 0) ctx.drawImage(lit, offset * p, 0, first * p, lit.height, x0, 0, first * p, lit.height);
      const rest = cols - first;
      if (rest > 0) ctx.drawImage(lit, 0, 0, rest * p, lit.height, x0 + first * p, 0, rest * p, lit.height);
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t < startAt || t - last < 55) return; // LED boards step, they don't glide
      last = t;
      if (poweredCols < visible) {
        poweredCols += Math.ceil(visible / 18);
        if (poweredCols >= visible) holdUntil = t + 1400;
      } else if (t > holdUntil) {
        offset = (offset + 1) % message.length;
      }
      draw();
    };

    // Only run the frame loop while the board is on screen and the tab is visible.
    const start = () => {
      if (!reduce && !raf && onScreen && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    size();
    draw();
    const ro = new ResizeObserver(() => {
      size();
      draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [text]);

  return (
    <div className="rounded-[14px] bg-[#231f20] p-2.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.08)] sm:p-3.5">
      <canvas ref={canvasRef} role="img" aria-label={label} className="block w-full" style={boxStyle} />
    </div>
  );
}
