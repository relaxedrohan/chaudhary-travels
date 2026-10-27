"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, PageTitle, Skeleton } from "@/components/AppShell";
import { Button, Field, Group, Row, Select } from "@/components/Form";
import { AlertIcon, ChevronLeftIcon, ChevronRightIcon, ReceiptIcon } from "@/components/Icons";
import { Sheet, preloadSheet } from "@/components/LazySheet";
import { useToast } from "@/components/Toast";
import { exportInvoicesCsv } from "@/lib/exportCsv";
import { formatDate, formatDay, formatINR, formatRoute, initials } from "@/lib/format";
import {
  INVOICE_PAGE_SIZE,
  cachedBuses,
  cachedInvoicePage,
  cachedRoutes,
  fetchBuses,
  fetchInvoicePage,
  fetchRoutes,
  forgetInvoices,
  invoicePageFresh,
  invoiceView,
} from "@/lib/data";
import { normalizePhone } from "@/lib/phone";
import { supabase } from "@/lib/supabase";
import type { Bus, Invoice, Route } from "@/lib/types";

function groupByDay(rows: Invoice[]) {
  const groups: { day: string; items: Invoice[]; sum: number }[] = [];
  for (const inv of rows) {
    const last = groups.at(-1);
    if (last?.day === inv.invoice_date) {
      last.items.push(inv);
      last.sum += Number(inv.total_amount);
    } else {
      groups.push({ day: inv.invoice_date, items: [inv], sum: Number(inv.total_amount) });
    }
  }
  return groups;
}

export default function InvoicesPage() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  // Coming back to Invoices restores the same page and dates.
  const [page, setPage] = useState(invoiceView.page);
  const [from, setFrom] = useState(invoiceView.from);
  const [to, setTo] = useState(invoiceView.to);
  const [loaded, setLoaded] = useState<{ key: string; rows: Invoice[]; total: number } | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelectedState] = useState<Invoice | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reload, setReload] = useState(0);
  const setSelected = (inv: Invoice) => {
    setSelectedState(inv);
    setEditing(false);
    setOpen(true);
  };

  // Show what we already have for this page straight away (no spinner);
  // fresh data replaces it when it arrives.
  const key = `${page}|${from}|${to}`;
  const cached = cachedInvoicePage(page, from, to)?.value;
  const current = loaded?.key === key ? loaded : cached ? { key, ...cached } : null;
  const rows = current?.rows ?? null;
  const total = current?.total ?? loaded?.total ?? 0;

  useEffect(() => {
    preloadSheet();
  }, []);

  useEffect(() => {
    Object.assign(invoiceView, { page, from, to });
    // Seen in the last minute and nothing changed since: don't ask again.
    if (invoicePageFresh(page, from, to)) return;

    let live = true;
    fetchInvoicePage(page, from, to)
      .then((result) => {
        if (!live) return;
        // A delete can leave us past the last page; step back instead of showing "empty".
        const lastPage = Math.max(0, Math.ceil(result.total / INVOICE_PAGE_SIZE) - 1);
        if (page > lastPage) return setPage(lastPage);
        setError(false);
        setLoaded({ key: `${page}|${from}|${to}`, ...result });
      })
      .catch((e: { code?: string }) => {
        if (!live) return;
        if (e?.code === "PGRST103" && page > 0) return setPage((p) => p - 1); // past the end
        // Keep showing what we have; only an empty screen becomes an error screen.
        if (cachedInvoicePage(page, from, to)) toast("Couldn't refresh invoices. Showing the last loaded list.", "error");
        setError(true);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable
  }, [page, from, to, reload]);

  const close = useCallback(() => setOpen(false), []);

  // After an edit or delete: close the sheet and refresh the list.
  function changed(message: string) {
    toast(message);
    setOpen(false);
    forgetInvoices();
    setReload((n) => n + 1);
  }
  const pages = Math.max(1, Math.ceil(total / INVOICE_PAGE_SIZE));
  const setFilter = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setPage(0);
  };
  const filtered = Boolean(from || to);

  async function exportCsv() {
    setExporting(true);
    try {
      const count = await exportInvoicesCsv(from, to);
      toast(`Exported ${count} ${count === 1 ? "invoice" : "invoices"}`);
    } catch {
      toast("Couldn't export. Check your connection and try again.", "error");
    } finally {
      setExporting(false);
    }
  }

  const filters = (
    <>
      <DateFilter label="From" value={from} onChange={setFilter(setFrom)} />
      <DateFilter label="To" value={to} onChange={setFilter(setTo)} />
    </>
  );

  return (
    // Laptop: the page is exactly one screen tall; only the table scrolls.
    <div className="md:flex md:h-[calc(100dvh-7rem)] md:flex-col">
      <PageTitle
        subtitle={
          rows ? (
            <>
              {total} {total === 1 ? "invoice" : "invoices"}
              {filtered && (
                <button
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setPage(0);
                  }}
                  className="-my-3 ml-3 inline-flex min-h-11 items-center font-medium text-fg underline underline-offset-2"
                >
                  Clear dates
                </button>
              )}
            </>
          ) : (
            "\u00a0"
          )
        }
        action={
          <div className="flex items-end gap-2.5">
            <div className="hidden w-[25rem] grid-cols-2 gap-2.5 md:grid">{filters}</div>
            <button
              onClick={exportCsv}
              disabled={exporting || total === 0}
              className="pressable flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-fg px-5 text-[0.9375rem] font-semibold text-white disabled:opacity-40 md:h-16 md:px-6"
            >
              <DownloadIcon />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        }
      >
        Invoices
      </PageTitle>

      <div className="mb-7 grid grid-cols-2 gap-2.5 md:hidden">{filters}</div>

      {error && rows === null ? (
        <EmptyState icon={<AlertIcon width={28} height={28} />} title="Couldn't load invoices">
          Check your connection and try again.
        </EmptyState>
      ) : rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ReceiptIcon width={28} height={28} />} title={filtered ? "No matches" : "No invoices yet"}>
          {filtered ? "No invoices in these dates." : "Invoices you save will show up here."}
        </EmptyState>
      ) : (
        <>
          {/* Phone: grouped by day */}
          <div className="md:hidden">
            {groupByDay(rows).map((g) => (
              <section key={g.day} className="mb-7">
                <div className="mb-2 flex items-baseline justify-between px-4">
                  <h2 className="wide text-[1rem] font-extrabold tracking-[-0.01em]">{formatDay(g.day)}</h2>
                  <p className="text-[0.8125rem] tabular-nums text-muted">
                    {g.items.length} · {formatINR(g.sum)}
                  </p>
                </div>
                <ul className="divide-y divide-sep overflow-hidden rounded-[22px] bg-surface">
                  {g.items.map((inv) => (
                    <li key={inv.id}>
                      <InvoiceRow inv={inv} onOpen={() => setSelected(inv)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Laptop: full-width table that scrolls inside its card */}
          <div className="hidden min-h-0 flex-1 overflow-hidden rounded-[22px] bg-surface md:flex md:flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-[0.9375rem]">
                <thead className="sticky top-0 z-10 bg-surface text-[0.8125rem] text-muted">
                  <tr className="shadow-[inset_0_-1px_0_var(--sep)]">
                    <th className="px-6 py-3.5 font-medium">Invoice no.</th>
                    <th className="px-4 py-3.5 font-medium">Date</th>
                    <th className="px-4 py-3.5 font-medium">Passenger</th>
                    <th className="px-4 py-3.5 font-medium">Phone</th>
                    <th className="px-4 py-3.5 text-right font-medium">Taxable</th>
                    <th className="px-4 py-3.5 text-right font-medium">GST</th>
                    <th className="px-6 py-3.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sep">
                  {rows.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => setSelected(inv)}
                      className="cursor-pointer transition-colors hover:bg-white"
                    >
                      <td className="px-6 py-3.5 tabular-nums">
                        <button onClick={() => setSelected(inv)} className="font-medium">
                          {inv.invoice_no}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-muted">{formatDate(inv.invoice_date)}</td>
                      <td className="max-w-[16rem] truncate px-4 py-3.5 font-medium">{inv.customer_name}</td>
                      <td className="px-4 py-3.5 tabular-nums text-muted">{inv.customer_phone}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{formatINR(inv.taxable_value)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted">
                        {formatINR(Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst))}
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold tabular-nums">{formatINR(inv.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pages > 1 && (
            <div className="flex shrink-0 items-center justify-between pt-4 text-[0.9375rem]">
              <PagerButton label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeftIcon width={18} height={18} />
              </PagerButton>
              <span className="tabular-nums text-muted">
                Page {page + 1} of {pages}
              </span>
              <PagerButton label="Next page" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRightIcon width={18} height={18} />
              </PagerButton>
            </div>
          )}
        </>
      )}

      <Sheet
        open={open}
        onClose={close}
        title={selected ? `${editing ? "Edit " : ""}${selected.invoice_no}` : "Invoice"}
      >
        {selected &&
          (editing ? (
            <EditInvoice key={selected.id} inv={selected} onCancel={() => setEditing(false)} onDone={changed} />
          ) : (
            <InvoiceDetail inv={selected} onEdit={() => setEditing(true)} onDeleted={() => changed("Invoice deleted")} />
          ))}
      </Sheet>
    </div>
  );
}

function InvoiceRow({ inv, onOpen }: { inv: Invoice; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-fill md:hover:bg-fill"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[0.875rem] font-bold text-accent">
        {initials(inv.customer_name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1rem] font-medium">{inv.customer_name}</span>
        <span className="block truncate text-[0.8125rem] tabular-nums text-muted">{inv.invoice_no}</span>
      </span>
      <span className="hidden w-28 shrink-0 text-[0.875rem] tabular-nums text-muted md:block">
        {inv.customer_phone}
      </span>
      <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatINR(inv.total_amount)}</span>
      <ChevronRightIcon width={16} height={16} className="shrink-0 text-muted/70" />
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="mb-7">
      <Skeleton className="mx-4 mb-3 h-4 w-24" />
      <div className="divide-y divide-sep overflow-hidden rounded-[22px] bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoiceDetail({
  inv,
  onEdit,
  onDeleted,
}: {
  inv: Invoice;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);

  async function remove() {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    setBusy(false);
    if (error) return toast("Couldn't delete. Check your connection and try again.", "error");
    onDeleted();
  }

  const route = formatRoute(inv.route_from, inv.route_to);
  const bus = [inv.bus_number, inv.operator_name].filter(Boolean).join(" · ");
  const rate = Number(inv.gst_rate);

  return (
    <div className="flex flex-col gap-6 pt-1">
      {/* Who and when on the left, how much on the right — one compact row */}
      <div className="flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[1.1875rem] font-semibold leading-tight">{inv.customer_name}</p>
          <p className="mt-1 whitespace-nowrap text-[0.875rem] text-muted">
            <a
            href={`tel:+91${inv.customer_phone}`}
            className="-my-3 inline-flex min-h-11 items-center tabular-nums underline-offset-2 hover:underline"
          >
              {inv.customer_phone}
            </a>
            <span aria-hidden> · </span>
            <span className="whitespace-nowrap">{formatDate(inv.invoice_date)}</span>
          </p>
        </div>
        <p className="wide shrink-0 text-[clamp(1.25rem,6.2vw,1.625rem)] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
          {formatINR(inv.total_amount)}
        </p>
      </div>

      {/* Tax and trip details in one card */}
      <div className="divide-y divide-sep overflow-hidden rounded-[22px] bg-surface">
        <Row label="Taxable value" value={formatINR(inv.taxable_value)} />
        {inv.tax_type === "IGST" ? (
          <Row label={`IGST ${rate}%`} value={formatINR(inv.igst)} />
        ) : (
          <>
            <Row label={`CGST ${rate / 2}%`} value={formatINR(inv.cgst)} />
            <Row label={`SGST ${rate / 2}%`} value={formatINR(inv.sgst)} />
          </>
        )}
        {bus && <Row label="Bus" value={bus} />}
        {route && <Row label="Route" value={route} />}
        {inv.travel_date && <Row label="Travel date" value={formatDate(inv.travel_date)} />}
        {inv.seat_no && <Row label="Seat" value={inv.seat_no} />}
      </div>

      <p className="px-1 text-[0.8125rem] leading-relaxed text-muted">
        Created by {inv.created_by_email ?? "—"}
        {inv.updated_at && (
          <>
            <br />
            Edited {formatDate(inv.updated_at)} by {inv.updated_by_email ?? "—"}
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="plain" onClick={onEdit}>
          Edit
        </Button>
        <Button type="button" variant={confirm ? "primary" : "danger"} disabled={busy} onClick={remove}>
          {busy ? "Deleting…" : confirm ? "Confirm delete" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

const KEEP = "__keep"; // the trip text saved on the invoice, when it no longer matches a listed bus/route

function EditInvoice({
  inv,
  onCancel,
  onDone,
}: {
  inv: Invoice;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const toast = useToast();
  // Only re-point at a listed bus/route when it's exactly what the invoice saved;
  // otherwise keep the invoice's own text (a renamed bus mustn't rewrite old invoices).
  const matchBus = (list: Bus[]) =>
    list.find((b) => b.bus_number === inv.bus_number && (b.operator_name ?? null) === (inv.operator_name ?? null));
  const matchRoute = (list: Route[]) =>
    list.find((r) => r.from_place === inv.route_from && r.to_place === inv.route_to);

  const [buses, setBuses] = useState<Bus[]>(() => cachedBuses() ?? []);
  const [routes, setRoutes] = useState<Route[]>(() => cachedRoutes() ?? []);
  const [name, setName] = useState(inv.customer_name);
  const [phone, setPhone] = useState(inv.customer_phone);
  const [price, setPrice] = useState(String(Number(inv.total_amount)));
  const [busId, setBusId] = useState(() =>
    inv.bus_number ? (matchBus(cachedBuses() ?? [])?.id ?? KEEP) : "",
  );
  const [routeId, setRouteId] = useState(() =>
    inv.route_from || inv.route_to ? (matchRoute(cachedRoutes() ?? [])?.id ?? KEEP) : "",
  );
  const [travelDate, setTravelDate] = useState(inv.travel_date ?? "");
  const [seat, setSeat] = useState(inv.seat_no ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([fetchBuses(), fetchRoutes()])
      .then(([bs, rs]) => {
        if (!live) return;
        setBuses(bs);
        setRoutes(rs);
        const bus = matchBus(bs);
        if (bus) setBusId((cur) => (cur === KEEP ? bus.id : cur));
        const route = matchRoute(rs);
        if (route) setRouteId((cur) => (cur === KEEP ? route.id : cur));
      })
      .catch(() => live && toast("Couldn't load buses and routes. Check your connection.", "error"));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per invoice
  }, [inv.id]);

  const amount = Number(price);
  const errors = {
    name: name.trim() ? null : "Enter the passenger's name.",
    phone: /^\d{10}$/.test(phone) ? null : "Enter a 10-digit phone number.",
    price: price && amount > 0 ? null : "Enter the ticket price.",
  };
  const valid = !Object.values(errors).some(Boolean);

  const keptBus = [inv.bus_number, inv.operator_name].filter(Boolean).join(" · ");
  const keptRoute = formatRoute(inv.route_from, inv.route_to);
  const busOptions = [
    ...(busId === KEEP && keptBus ? [{ value: KEEP, label: keptBus }] : []),
    ...buses.map((b) => ({ value: b.id, label: [b.name, b.bus_number, b.operator_name].filter(Boolean).join(" · ") })),
  ];
  const routeOptions = [
    ...(routeId === KEEP && keptRoute ? [{ value: KEEP, label: keptRoute }] : []),
    ...routes.map((r) => ({ value: r.id, label: `${r.from_place} → ${r.to_place}` })),
  ];

  function tripFields() {
    const bus = buses.find((b) => b.id === busId);
    const route = routes.find((r) => r.id === routeId);
    return {
      ...(busId === KEEP
        ? {}
        : { bus_number: bus?.bus_number ?? null, operator_name: bus?.operator_name ?? null }),
      ...(routeId === KEEP
        ? {}
        : { route_from: route?.from_place ?? null, route_to: route?.to_place ?? null }),
    };
  }

  const next = {
    customer_name: name.trim(),
    customer_phone: phone,
    total_amount: amount,
    travel_date: travelDate || null,
    seat_no: seat.trim() || null,
    ...tripFields(),
  };
  const before = {
    customer_name: inv.customer_name,
    customer_phone: inv.customer_phone,
    total_amount: Number(inv.total_amount),
    travel_date: inv.travel_date,
    seat_no: inv.seat_no,
    ...(busId === KEEP ? {} : { bus_number: inv.bus_number, operator_name: inv.operator_name }),
    ...(routeId === KEEP ? {} : { route_from: inv.route_from, route_to: inv.route_to }),
  };
  const dirty = JSON.stringify(next) !== JSON.stringify(before);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !dirty) return;
    setSaving(true);
    // GST is recalculated in the database from the new total, at the invoice's original rate.
    const { error } = await supabase.from("invoices").update(next).eq("id", inv.id);
    setSaving(false);
    if (error) return toast("Couldn't save. Check your connection and try again.", "error");
    onDone(`Saved changes to ${inv.invoice_no}`);
  }

  return (
    <form onSubmit={save} noValidate className="pt-2">
      <Group title="Passenger">
        <Field label="Name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Field
          label="Phone"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          value={phone}
          onChange={(e) => setPhone(normalizePhone(e.target.value))}
          error={errors.phone}
        />
      </Group>
      <Group title="Fare" footer={`GST stays at ${inv.gst_rate}% and is recalculated from the new price.`}>
        <Field
          label="Ticket price (incl. GST)"
          prefix="₹"
          inputMode="decimal"
          value={price}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.]/g, "");
            if (/^\d*\.?\d{0,2}$/.test(v)) setPrice(v);
          }}
          error={errors.price}
        />
      </Group>
      <Group title="Trip (optional)">
        <Select label="Bus" placeholder="None" value={busId} onValueChange={setBusId} options={busOptions} />
        <Select label="Route" placeholder="None" value={routeId} onValueChange={setRouteId} options={routeOptions} />
        <Field label="Travel date" type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
        <Field label="Seat" placeholder="e.g. 12A" autoComplete="off" value={seat} onChange={(e) => setSeat(e.target.value)} />
      </Group>
      <div className="flex flex-col gap-3">
        <Button type="submit" arrow disabled={saving || !valid || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="plain" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return <Field label={label} type="date" value={value} onChange={onChange} className="[color-scheme:light]" />;
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable flex size-11 items-center justify-center rounded-full bg-surface text-fg disabled:text-muted disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}
