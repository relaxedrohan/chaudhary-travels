"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "./AuthProvider";
import { BusIcon, GearIcon, PlusIcon, ReceiptIcon } from "./Icons";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/new", label: "New invoice", short: "New", Icon: PlusIcon },
  { href: "/invoices", label: "Invoices", short: "Invoices", Icon: ReceiptIcon },
  { href: "/fleet", label: "Buses & routes", short: "Buses", Icon: BusIcon },
  { href: "/settings", label: "Settings", short: "Settings", Icon: GearIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const raw = usePathname();
  const pathname = raw.length > 1 ? raw.replace(/\/$/, "") : raw;
  const session = useSession();

  if (pathname === "/login") return <>{children}</>;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="min-h-dvh md:flex">
      {/* Laptop: sidebar */}
      <aside className="material-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sep px-4 pb-6 pt-8 md:flex">
        <Link href="/new" className="wide block px-2 text-[1.5rem] font-black uppercase leading-[0.86] tracking-[-0.012em] text-accent">
          Chaudhary
          <br />
          Travels
        </Link>
        <p className="mt-2 px-2 text-[0.8125rem] text-muted">Invoices</p>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`pressable flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[0.9375rem] ${
                  active ? "bg-surface font-semibold text-fg" : "text-fg/75 hover:bg-surface/70"
                }`}
              >
                <Icon width={19} height={19} className={active ? "text-accent" : "text-muted"} />
                {label}
              </Link>
            );
          })}
        </nav>
        <AccountCard email={session?.user.email ?? ""} />
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-4 md:max-w-[1180px] md:px-12 md:pb-16 md:pt-12">
        {children}
      </main>

      {/* Phone: bottom tab bar */}
      <nav className="material pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-sep md:hidden">
        <ul className="grid grid-cols-4">
          {NAV.map(({ href, short, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`pressable flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[0.6875rem] font-semibold ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  <Icon width={25} height={25} strokeWidth={active ? 2.1 : 1.7} />
                  {short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Laptop sidebar footer: who's signed in, and a clear way out. */
function AccountCard({ email }: { email: string }) {
  const local = email.split("@")[0] ?? "";
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return (
    <div className="mt-auto rounded-[22px] bg-white p-3 shadow-[0_1px_0_rgba(35,31,32,0.04)] ring-1 ring-sep">
      <div className="flex items-center gap-3 px-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fg text-[0.9375rem] font-bold text-white">
          {name[0] ?? "?"}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.9375rem] font-semibold">{name || "Signed in"}</p>
          <p className="mt-0.5 truncate text-[0.8125rem] text-muted" title={email}>
            {email}
          </p>
        </div>
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        className="pressable mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-surface text-[0.875rem] font-semibold transition-colors hover:bg-fg hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" />
        </svg>
        Sign out
      </button>
    </div>
  );
}

/**
 * Large wide-type title. On phones, a compact bar takes over once the
 * large title scrolls away, so you always know where you are.
 */
export function PageTitle({
  children,
  subtitle,
  action,
}: {
  children: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        aria-hidden
        className={`material fixed inset-x-0 top-0 z-30 flex h-[calc(env(safe-area-inset-top)+2.75rem)] items-end justify-center pb-2.5 text-[1rem] font-bold transition-[opacity,border-color] duration-200 md:hidden ${
          compact ? "border-b border-sep opacity-100" : "pointer-events-none border-b border-transparent opacity-0"
        }`}
      >
        {children}
      </div>
      <header className="mb-6 flex items-end justify-between gap-4 pt-[env(safe-area-inset-top)] md:mb-8">
        <div>
          <h1 className="wide text-[clamp(2.125rem,7vw,2.75rem)] font-extrabold leading-[0.95] tracking-[-0.025em]">{children}</h1>
          {subtitle && <p className="mt-2.5 text-[0.9375rem] text-muted">{subtitle}</p>}
          <div ref={sentinel} className="h-px" />
        </div>
        {action}
      </header>
    </>
  );
}

export function Skeleton({ className }: { className: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} />;
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface text-muted">
        {icon}
      </span>
      <p className="wide text-[1.0625rem] font-extrabold">{title}</p>
      {children && <p className="mt-1 max-w-xs text-[15px] text-muted">{children}</p>}
    </div>
  );
}
