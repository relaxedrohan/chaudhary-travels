import { Archivo } from "next/font/google";

// "block", not "swap": the wide wordmark looks wrong in any fallback font,
// so wait the ~100ms for the preloaded file instead of flashing a substitute.
export const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "block",
});
