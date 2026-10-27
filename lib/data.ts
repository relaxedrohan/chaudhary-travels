import { supabase } from "./supabase";
import type { Bus, Invoice, Route, Settings } from "./types";

/**
 * Small in-memory cache shared by the staff screens (cleared on a full reload).
 *
 * - Anything fetched in the last FRESH_MS is reused without asking the database.
 * - Older data is shown instantly and refreshed in the background.
 * - Our own writes clear or update the cache, so changes show straight away.
 *
 * Fetches throw on error, so screens can show a real message instead of empty
 * lists or default settings.
 */
export const FRESH_MS = 60_000;

type Entry<T> = { value: T; at: number };
const entry = <T>(value: T): Entry<T> => ({ value, at: Date.now() });
const fresh = (e?: { at: number }) => Boolean(e && Date.now() - e.at < FRESH_MS);

const store: {
  settings?: Entry<Settings | null>;
  buses?: Entry<Bus[]>;
  routes?: Entry<Route[]>;
} = {};

// ── Settings, buses, routes ─────────────────────────────────────────────

export const cachedSettings = () => store.settings?.value;
export const cachedBuses = () => store.buses?.value;
export const cachedRoutes = () => store.routes?.value;
export const settingsFresh = () => fresh(store.settings);
export const fleetFresh = () => fresh(store.buses) && fresh(store.routes);

export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  store.settings = entry(data as Settings | null);
  return store.settings.value;
}

export async function fetchBuses() {
  const { data, error } = await supabase.from("buses").select("*").order("bus_number");
  if (error) throw error;
  store.buses = entry((data ?? []) as Bus[]);
  return store.buses.value;
}

export async function fetchRoutes() {
  const { data, error } = await supabase.from("routes").select("*").order("from_place");
  if (error) throw error;
  store.routes = entry((data ?? []) as Route[]);
  return store.routes.value;
}

export const rememberSettings = (s: Settings) => {
  store.settings = entry(s);
};

// ── Invoices list ───────────────────────────────────────────────────────

export const INVOICE_PAGE_SIZE = 20;

/** The last page and date filter, so coming back to Invoices restores the same view. */
export const invoiceView = { page: 0, from: "", to: "" };

type InvoicePage = { rows: Invoice[]; total: number };
const invoicePages = new Map<string, Entry<InvoicePage>>();
const pageKey = (page: number, from: string, to: string) => `${page}|${from}|${to}`;

export const cachedInvoicePage = (page: number, from: string, to: string) =>
  invoicePages.get(pageKey(page, from, to));
export const invoicePageFresh = (page: number, from: string, to: string) =>
  fresh(invoicePages.get(pageKey(page, from, to)));

/** Fetches one page of invoices (with the total) and remembers it. */
export async function fetchInvoicePage(page: number, from: string, to: string) {
  let query = supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * INVOICE_PAGE_SIZE, page * INVOICE_PAGE_SIZE + INVOICE_PAGE_SIZE - 1);
  if (from) query = query.gte("invoice_date", from);
  if (to) query = query.lte("invoice_date", to);
  const { data, count, error } = await query;
  if (error) throw error;
  const value = { rows: (data ?? []) as Invoice[], total: count ?? 0 };
  invoicePages.set(pageKey(page, from, to), entry(value));
  return value;
}

/** Call after creating, editing or deleting an invoice. */
export const forgetInvoices = () => invoicePages.clear();
