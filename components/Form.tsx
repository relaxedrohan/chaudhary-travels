"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/**
 * A titled section. `form` stacks pill fields with space between them;
 * `list` puts rows in one grey card with hairline dividers.
 */
export function Group({
  title,
  footer,
  variant = "form",
  titleOnPhone = true,
  children,
}: {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "form" | "list";
  /** false: heading shows on laptops only (kept for screen readers on phones). */
  titleOnPhone?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7 md:mb-8">
      {title && (
        <h2
          className={`wide mb-3 text-[1.0625rem] font-extrabold tracking-[-0.01em] ${
            titleOnPhone ? "" : "max-md:sr-only"
          }`}
        >
          {title}
        </h2>
      )}
      <div
        className={
          variant === "list"
            ? "divide-y divide-sep overflow-hidden rounded-[22px] bg-surface"
            : "flex flex-col gap-2.5 md:gap-3"
        }
      >
        {children}
      </div>
      {footer && <div className="mt-2.5 px-1 text-[0.875rem] leading-snug text-muted">{footer}</div>}
    </section>
  );
}

type FieldProps = {
  label: string;
  error?: string | null;
  prefix?: string;
  /** Grows to fit its text, so long values like an address stay fully visible. */
  multiline?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> &
  Pick<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows">;

const labelClass = "mb-1.5 block px-5 text-[0.8125rem] font-medium text-muted";

/** Label above a grey pill — the label never sits inside the field. */
export function Field({ label, error, prefix, multiline, className, onChange, value, ...input }: FieldProps) {
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);

  // Keep a multiline field exactly as tall as its text.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, multiline]);

  const shared = {
    id,
    value,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${id}-err` : undefined,
    className: `min-w-0 flex-1 bg-transparent text-[1.0625rem] outline-none placeholder:text-muted ${className ?? ""}`,
  };

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="pill-input" data-invalid={error ? "" : undefined} data-multiline={multiline ? "" : undefined}>
        {prefix && <span className="text-[1.0625rem] text-muted">{prefix}</span>}
        {multiline ? (
          <textarea
            ref={area}
            rows={1}
            {...shared}
            {...(input as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            onChange={onChange as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
            className={`${shared.className} resize-none overflow-hidden leading-snug`}
          />
        ) : (
          <input {...shared} {...input} onChange={onChange} />
        )}
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1.5 px-5 text-[0.875rem] text-danger">
          <ErrorDot />
          {error}
        </p>
      )}
    </div>
  );
}

type SelectProps = {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Brand dropdown. The browser's native menu can't be styled, so it flashed a
 * system-looking list before our styles; this one is ours from the first frame.
 */
export function Select({ label, placeholder, options, value, onValueChange }: SelectProps) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [active, setActive] = useState(0);

  // "None" first, then the real options.
  const all = [{ value: "", label: placeholder }, ...options];
  const current = all.find((o) => o.value === value) ?? all[0];

  function openMenu() {
    const r = root.current?.getBoundingClientRect();
    // Flip upward when the menu wouldn't fit above the tab bar / save bar.
    setUp(Boolean(r && window.innerHeight - r.bottom < 300 && r.top > 300));
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(v: string) {
    onValueChange(v);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Tab") return setOpen(false);
    // Handle Escape here so it closes only the menu, not the sheet around it.
    e.preventDefault();
    if (e.key === "Escape") {
      e.stopPropagation();
      return setOpen(false);
    }
    if (e.key === "ArrowDown") setActive((i) => Math.min(all.length - 1, i + 1));
    if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    if (e.key === "Home") setActive(0);
    if (e.key === "End") setActive(all.length - 1);
    if (e.key === "Enter" || e.key === " ") choose(all[active].value);
  }

  return (
    <div ref={root} className="relative">
      <span id={`${id}-label`} className={labelClass}>
        {label}
      </span>
      <div className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className="pill-input w-full cursor-pointer justify-between text-left"
        data-open={open ? "" : undefined}
      >
        <span className={`truncate text-[1.0625rem] ${value ? "" : "text-muted"}`}>{current.label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className={`absolute inset-x-0 z-50 max-h-72 overflow-auto rounded-[22px] bg-white p-1.5 shadow-[0_18px_40px_-12px_rgba(35,31,32,0.35)] ring-1 ring-sep ${
            up ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {all.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value || "none"}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-full px-4 text-[1rem] ${
                  i === active ? "bg-surface" : ""
                } ${o.value ? "" : "text-muted"} ${selected ? "font-semibold" : ""}`}
              >
                <span className="truncate">{o.label}</span>
                {selected && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-accent">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </div>
  );
}

export function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex min-h-12 items-center justify-between gap-4 px-5 py-3 text-[0.9375rem] ${
        strong ? "font-semibold" : ""
      }`}
    >
      <span className={strong ? "" : "text-muted"}>{label}</span>
      <span className="min-w-0 truncate text-right tabular-nums">{value}</span>
    </div>
  );
}

export function Button({
  variant = "primary",
  arrow = false,
  className,
  children,
  ...props
}: {
  variant?: "primary" | "plain" | "danger";
  arrow?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-accent text-accent-fg enabled:hover:bg-[#d4141b] disabled:bg-[#e8e8ea] disabled:text-[#9b9798]",
    plain: "bg-surface text-fg enabled:hover:bg-[#ebebec]",
    // Destructive actions stay ink, so red keeps meaning "go".
    danger: "text-fg shadow-[inset_0_0_0_2px_var(--fg)] enabled:hover:bg-fg enabled:hover:text-white",
  }[variant];
  return (
    <button
      className={`pressable flex min-h-14 w-full items-center rounded-full px-7 text-[1.0625rem] font-semibold disabled:cursor-not-allowed ${
        arrow ? "justify-between" : "justify-center"
      } ${styles} ${className ?? ""}`}
      {...props}
    >
      <span>{children}</span>
      {arrow && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  inline = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  /** Same height as the floating-label pills, with the label for screen readers only. */
  inline?: boolean;
}) {
  const index = options.findIndex((o) => o.value === value);
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
  }

  return (
    <div>
      {!inline && (
        <span aria-hidden className="mb-1.5 block px-1 text-[0.875rem] font-medium">
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`flex rounded-full bg-surface p-1.5 ${inline ? "h-14 md:h-16 [&>button]:min-h-0" : ""}`}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            data-value={o.value}
            aria-checked={value === o.value}
            tabIndex={value === o.value ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`min-h-11 flex-1 rounded-full px-3 text-[0.9375rem] font-semibold transition-colors duration-200 ${
              value === o.value ? "bg-fg text-white" : "text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ErrorDot() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16v.5" />
    </svg>
  );
}
