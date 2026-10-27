import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Keep only the origin: a pasted ".../rest/v1/" URL breaks every auth request
// with "Invalid path specified in request URL".
const url = (() => {
  try {
    return rawUrl ? new URL(rawUrl.trim()).origin : undefined;
  } catch {
    return undefined;
  }
})();

export const supabaseConfigured = Boolean(url && key);

// Placeholders keep the static build working before env vars are set;
// the app shows a setup message instead of making requests in that case.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder",
);
