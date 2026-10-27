import { supabase } from "./supabase";

// Columns in the order the CA reads them, with plain-English headers.
const COLUMNS = [
  ["invoice_no", "Invoice no."],
  ["invoice_date", "Invoice date"],
  ["customer_name", "Passenger"],
  ["customer_phone", "Phone"],
  ["sac_code", "SAC"],
  ["gst_rate", "GST rate (%)"],
  ["tax_type", "Tax type"],
  ["taxable_value", "Taxable value"],
  ["cgst", "CGST"],
  ["sgst", "SGST"],
  ["igst", "IGST"],
  ["total_amount", "Total"],
  ["bus_number", "Bus"],
  ["operator_name", "Operator"],
  ["route_from", "From"],
  ["route_to", "To"],
  ["travel_date", "Travel date"],
  ["seat_no", "Seat"],
  ["created_by_email", "Created by"],
] as const;

const BATCH = 1000; // Supabase returns at most 1000 rows per request

function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Stop spreadsheet apps from running a cell as a formula.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Downloads every invoice in the date range (inclusive) as a CSV file. Returns the row count. */
export async function exportInvoicesCsv(from: string, to: string) {
  const select = COLUMNS.map(([key]) => key).join(",");
  const rows: Record<string, unknown>[] = [];

  for (let start = 0; ; start += BATCH) {
    let query = supabase
      .from("invoices")
      .select(select)
      .order("invoice_date")
      .order("created_at")
      .range(start, start + BATCH - 1);
    if (from) query = query.gte("invoice_date", from);
    if (to) query = query.lte("invoice_date", to);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < BATCH) break;
  }

  const lines = [
    COLUMNS.map(([, header]) => cell(header)).join(","),
    ...rows.map((r) => COLUMNS.map(([key]) => cell(r[key])).join(",")),
  ];
  // BOM so Excel opens ₹ and Hindi names correctly.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });

  const range = from || to ? `${from || "start"}_to_${to || "today"}` : "all";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `chaudhary-travels-invoices-${range}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari starts the download asynchronously; revoking straight away cancels it.
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  return rows.length;
}
