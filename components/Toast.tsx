"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertIcon, CheckCircleIcon } from "./Icons";

type Toast = { id: number; message: string; tone: "ok" | "error"; leaving?: boolean };

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const VISIBLE_MS = { ok: 3000, error: 7000 };
const EXIT_MS = 200;

/**
 * One toast at a time, animated in CSS (no animation library on staff pages).
 * Errors use role="alert" and stay longer; hovering or focusing pauses them.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismissLater = useCallback((t: Toast, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setToast((cur) => (cur?.id === t.id ? { ...cur, leaving: true } : cur));
      timer.current = setTimeout(() => setToast((cur) => (cur?.id === t.id ? null : cur)), EXIT_MS);
    }, ms);
  }, []);

  const show = useCallback(
    (message: string, tone: Toast["tone"] = "ok") => {
      const t = { id: Date.now(), message, tone };
      setToast(t);
      dismissLater(t, VISIBLE_MS[tone]);
    },
    [dismissLater],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const pause = () => clearTimeout(timer.current);
  const resume = () => toast && !toast.leaving && dismissLater(toast, 2000);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] flex justify-center px-4 md:bottom-8 md:top-auto">
        {toast && (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            onPointerEnter={pause}
            onPointerLeave={resume}
            onFocus={pause}
            onBlur={resume}
            className={`toast pointer-events-auto flex items-center gap-2 rounded-full bg-fg py-3 pl-3.5 pr-5 text-[0.9375rem] font-medium text-white shadow-[0_10px_30px_rgba(35,31,32,0.25)] ${
              toast.leaving ? "toast-out" : ""
            }`}
          >
            {toast.tone === "error" ? (
              <AlertIcon width={20} height={20} className="shrink-0 text-[#ff6b6b]" />
            ) : (
              <CheckCircleIcon width={20} height={20} className="shrink-0 text-[#4ade80]" />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
