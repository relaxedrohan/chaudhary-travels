"use client";

import Link from "next/link";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which field the error is about, so the red ring lands on the right one.
  const [badField, setBadField] = useState<"email" | "password" | "both" | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError(!email.trim() && !password ? "Enter your email and password." : !email.trim() ? "Enter your email." : "Enter your password.");
      setBadField(!email.trim() && !password ? "both" : !email.trim() ? "email" : "password");
      return;
    }
    setBusy(true);
    setError(null);
    setBadField(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // On success, AuthProvider redirects to the app.
    if (error) {
      setError(error.code === "invalid_credentials" ? "Wrong email or password." : error.message);
      setBadField("both");
      setBusy(false);
    }
  }

  return (
    <div className="landing flex min-h-dvh flex-col">
      <header className="border-b border-[var(--ink)]/10">
        <div className="mx-auto flex max-w-[1180px] items-center px-5 py-6 sm:px-10 sm:py-8">
          <Link href="/" className="login-mark" aria-label="Chaudhary Travels home">
            Chaudhary
            <br />
            Travels
          </Link>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-5 pt-10 sm:items-center sm:pt-0">
        <form onSubmit={submit} className="w-full max-w-[460px] sm:-mt-16" noValidate>
          <h1 className="login-title">Sign in</h1>
          <p className="mt-3 text-[1rem] text-[var(--ink)]/60">Staff access to invoices.</p>

          <div className="mt-8 flex flex-col gap-2.5">
            <label className="sr-only" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              aria-invalid={badField === "email" || badField === "both"}
              aria-describedby={badField === "email" || badField === "both" ? "login-error" : undefined}
            />
            <div className="relative">
              <label className="sr-only" htmlFor="password">Password</label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input pr-16"
                aria-invalid={badField === "password" || badField === "both"}
                aria-describedby={badField === "password" || badField === "both" ? "login-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--ink)]/50 hover:text-[var(--ink)]"
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>

            {error && (
              <p id="login-error" role="alert" className="px-6 pt-1 text-[0.9375rem] text-[var(--red)]">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="login-submit mt-2">
              <span>{busy ? "Signing in…" : "Sign in"}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <p className="mt-6 px-1 text-[0.9375rem] text-[var(--ink)]/70">
            Forgot your password? Ask the admin to reset it.
          </p>
        </form>
      </main>

      <footer className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-5 py-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-[0.875rem] text-[var(--ink)]/70">
        <span>© {new Date().getFullYear()} {BRAND.name}</span>
        <a href={`tel:${BRAND.phones[0].tel}`} className="-my-3 inline-flex min-h-11 items-center hover:text-[var(--ink)]">
          Call us
        </a>
        <a
          href={`https://wa.me/${BRAND.phones[0].tel.replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="-my-3 inline-flex min-h-11 items-center hover:text-[var(--ink)]"
        >
          WhatsApp
        </a>
      </footer>
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}
