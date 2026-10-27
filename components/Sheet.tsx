"use client";

import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "./Icons";

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

// Apple's momentum projection: where a flick would come to rest.
const project = (velocity: number, rate = 0.998) =>
  ((velocity / 1000) * rate) / (1 - rate);

/** Bottom sheet on phones (swipe down to close), side panel on laptops. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);

  // Modal behaviour: lock scroll, move focus inside, keep Tab inside, Escape
  // closes (unless a control inside already handled it), and give focus back.
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFirst = requestAnimationFrame(() => {
      panel.current?.querySelector<HTMLElement>("[data-autofocus], button")?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) return onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(focusFirst);
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      returnTo?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const hidden = reduce ? { opacity: 0 } : desktop ? { x: "100%" } : { y: "100%" };
  const shown = reduce ? { opacity: 1 } : { x: 0, y: 0 };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-[var(--scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            drag={!desktop && !reduce ? "y" : false}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 1 }}
            ref={panel}
            onDragEnd={(_, info) => {
              const height = panel.current?.clientHeight ?? 400;
              if (info.offset.y + project(info.velocity.y) > height * 0.35) onClose();
            }}
            className={
              desktop
                ? "fixed inset-y-0 right-0 z-50 flex w-[420px] flex-col bg-bg shadow-2xl"
                : "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] bg-bg shadow-2xl"
            }
          >
            <div
              onPointerDown={(e) => {
                if (!(e.target as HTMLElement).closest("button")) drag.start(e);
              }}
              className="shrink-0 touch-none select-none px-4 pb-2 pt-2 md:pt-5"
            >
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-sep md:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="wide text-[1.25rem] font-extrabold tracking-[-0.015em]">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="pressable -mr-1.5 flex size-11 items-center justify-center rounded-full bg-surface text-fg"
                >
                  <CloseIcon width={18} height={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
