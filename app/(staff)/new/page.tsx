"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/AppShell";
import { Button, Field, Group, Row, Select } from "@/components/Form";
import { useToast } from "@/components/Toast";
import { formatINR } from "@/lib/format";
import { splitGst } from "@/lib/gst";
import {
  cachedBuses,
  cachedRoutes,
  cachedSettings,
  fetchBuses,
  fetchRoutes,
  fetchSettings,
  fleetFresh,
  forgetInvoices,
  settingsFresh,
} from "@/lib/data";
import { normalizePhone } from "@/lib/phone";
import { supabase } from "@/lib/supabase";
import type { Bus, NewInvoice, Route, Settings } from "@/lib/types";

const emptyCustomer = { name: "", phone: "", seat: "" };
const todayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

function validate(name: string, phone: string, price: string) {
  const amount = Number(price);
  return {
    name: name.trim() ? null : "Enter the passenger's name.",
    phone: /^\d{10}$/.test(phone) ? null : "Enter a 10-digit phone number.",
    price: price && amount > 0 ? null : "Enter the ticket price.",
  };
}

export default function NewInvoicePage() {
  const toast = useToast();
  // Show the last-loaded values instantly; refresh in the background.
  const [settings, setSettings] = useState<Settings | null>(() => cachedSettings() ?? null);
  const [buses, setBuses] = useState<Bus[]>(() => cachedBuses() ?? []);
  const [routes, setRoutes] = useState<Route[]>(() => cachedRoutes() ?? []);

  const [customer, setCustomer] = useState(emptyCustomer);
  const [price, setPrice] = useState("");
  const [busId, setBusId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only refresh what's older than a minute (e.g. hopping between tabs reuses it).
    let live = true;
    const fail = () => live && toast("Couldn't load buses, routes and GST settings. Check your connection.", "error");
    if (!settingsFresh()) fetchSettings().then((s) => live && setSettings(s), fail);
    if (!fleetFresh())
      Promise.all([fetchBuses(), fetchRoutes()]).then(([b, r]) => {
        if (!live) return;
        setBuses(b);
        setRoutes(r);
      }, fail);
    return () => {
      live = false;
    };
  }, [toast]);

  const busOptions = useMemo(
    () => buses.map((b) => ({ value: b.id, label: [b.name, b.bus_number, b.operator_name].filter(Boolean).join(" · ") })),
    [buses],
  );
  const routeOptions = useMemo(
    () => routes.map((r) => ({ value: r.id, label: `${r.from_place} → ${r.to_place}` })),
    [routes],
  );

  const errors = validate(customer.name, customer.phone, price);
  // Save stays grey until name, phone and price are all valid.
  const ready = !Object.values(errors).some(Boolean);
  const showError = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);

  const breakdown = useMemo(() => {
    const amount = Number(price);
    if (!settings || !(amount > 0)) return null;
    return splitGst(amount, settings.gst_rate, settings.tax_type);
  }, [price, settings]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.values(errors).some(Boolean)) {
      setTouched({ name: true, phone: true, price: true });
      return;
    }
    const bus = buses.find((b) => b.id === busId);
    const route = routes.find((r) => r.id === routeId);
    const invoice: NewInvoice = {
      customer_name: customer.name.trim(),
      customer_phone: customer.phone,
      total_amount: Number(price),
      bus_number: bus?.bus_number ?? null,
      operator_name: bus?.operator_name ?? null,
      route_from: route?.from_place ?? null,
      route_to: route?.to_place ?? null,
      travel_date: travelDate || null,
      seat_no: customer.seat.trim() || null,
    };

    setSaving(true);
    const { data, error } = await supabase
      .from("invoices")
      .insert(invoice)
      .select("invoice_no")
      .single();
    setSaving(false);

    if (error) {
      toast("Couldn't save. Check your connection and try again.", "error");
      return;
    }
    forgetInvoices(); // the Invoices list must show this one next time
    toast(`Saved · Invoice ${data.invoice_no}`);
    // Back to a blank form for the next ticket.
    setCustomer(emptyCustomer);
    setPrice("");
    setBusId("");
    setRouteId("");
    setTravelDate("");
    setTouched({});
  }

  const rate = settings?.gst_rate ?? 0;

  return (
    <>
      <PageTitle subtitle={todayFmt.format(new Date())}>
        New invoice
      </PageTitle>
      <form onSubmit={submit} noValidate>
        {/* Laptop: passenger + fare on the left, trip on the right */}
        <div className="md:grid md:grid-cols-2 md:gap-x-12">
        <div>
        <Group title="Passenger" titleOnPhone={false}>
          <Field
            label="Name"
            placeholder="e.g. Ravi Kumar"
            autoComplete="off"
            autoCapitalize="words"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            error={showError("name")}
          />
          <Field
            label="Phone"
            placeholder="10-digit mobile number"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: normalizePhone(e.target.value) })}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            error={showError("phone")}
          />
        </Group>

        <Group
          title="Fare"
          titleOnPhone={false}
        >
          <Field
            label="Ticket price (incl. GST)"
            placeholder="0.00"
            prefix="₹"
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.]/g, "");
              if (/^\d*\.?\d{0,2}$/.test(v)) setPrice(v);
            }}
            onBlur={() => setTouched((t) => ({ ...t, price: true }))}
            error={showError("price")}
          />
          {breakdown && settings && (
            <div className="divide-y divide-sep overflow-hidden rounded-[22px] bg-surface">
              <Row label="Taxable value" value={formatINR(breakdown.taxable)} />
              {settings.tax_type === "IGST" ? (
                <Row label={`IGST ${rate}%`} value={formatINR(breakdown.igst)} />
              ) : (
                <>
                  <Row label={`CGST ${rate / 2}%`} value={formatINR(breakdown.cgst)} />
                  <Row label={`SGST ${rate / 2}%`} value={formatINR(breakdown.sgst)} />
                </>
              )}
            </div>
          )}
        </Group>
        </div>

        <Group
          title="Trip (optional)"
          titleOnPhone={false}
        >
          <Select
            label="Bus"
            placeholder="None"
            value={busId}
            onValueChange={setBusId}
            options={busOptions}
          />
          <Select
            label="Route"
            placeholder="None"
            value={routeId}
            onValueChange={setRouteId}
            options={routeOptions}
          />
          <Field
            label="Travel date"
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
          />
          <Field
            label="Seat"
            placeholder="e.g. 12A"
            autoComplete="off"
            value={customer.seat}
            onChange={(e) => setCustomer({ ...customer, seat: e.target.value })}
          />
        </Group>
        </div>

        {/* Sticky, not fixed: it rides above the tab bar while you scroll,
            but keeps its own space at the end so it never covers a field. */}
        <div className="tabbar-offset sticky z-30 -mx-4 border-t border-sep bg-bg px-4 py-3 md:static md:mx-0 md:mt-2 md:rounded-[26px] md:border-0 md:bg-surface md:px-6 md:py-5">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-medium text-muted">Total</p>
              <p className="wide truncate text-[1.25rem] font-extrabold leading-tight tracking-[-0.02em] tabular-nums sm:text-[1.625rem]">
                {formatINR(Number(price) || 0)}
              </p>
            </div>
            <Button type="submit" disabled={saving || !ready} arrow className="w-auto! shrink-0 gap-3 px-5 sm:gap-6 sm:px-6">
              {saving ? "Saving…" : "Save invoice"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
