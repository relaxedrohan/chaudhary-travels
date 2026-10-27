"use client";

import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { Loader } from "./Loader";

const AuthContext = createContext<Session | null>(null);

export const useSession = () => useContext(AuthContext);

const normalize = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = normalize(usePathname());
  const router = useRouter();
  const onLogin = pathname === "/login";

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session && !onLogin) router.replace("/login");
    if (session && onLogin) router.replace("/new");
  }, [ready, session, onLogin, router]);

  if (!supabaseConfigured) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold tracking-tight">Setup needed</h1>
        <p className="mt-2 text-muted">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          to .env.local, then restart.
        </p>
      </Centered>
    );
  }

  // The branded loader covers only the first session check. A pending redirect
  // (just signed in or out) renders nothing for that instant instead of
  // bringing the loader back over the app.
  const redirecting = ready && ((!session && !onLogin) || (session && onLogin));

  return (
    <AuthContext.Provider value={session}>
      {ready && !redirecting && children}
      {!ready && <DelayedLoader />}
    </AuthContext.Provider>
  );
}

/**
 * Signed-in reloads resolve the session in a few milliseconds, so showing the
 * loader then just flashed a fading ghost over the app. Only show it when the
 * check is genuinely slow; until then the page stays plain white.
 */
function DelayedLoader() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(t);
  }, []);
  return show ? <Loader /> : <div className="fixed inset-0 z-[100] bg-bg" aria-hidden />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div className="max-w-sm">{children}</div>
    </div>
  );
}
