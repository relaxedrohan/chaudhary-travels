"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyState, PageTitle, Skeleton } from "@/components/AppShell";
import { AlertIcon } from "@/components/Icons";
import { useSession } from "@/components/AuthProvider";
import { Button, Field, Group, Segmented } from "@/components/Form";
import { useToast } from "@/components/Toast";
import { cachedSettings, fetchSettings, rememberSettings, settingsFresh } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Settings, TaxType } from "@/lib/types";

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

type FormState = {
  business_name: string;
  address: string;
  gstin: string;
  state: string;
  gst_rate: string;
  tax_type: TaxType;
  sac_code: string;
};

const toForm = (s: Settings | null): FormState => ({
  business_name: s?.business_name ?? "",
  address: s?.address ?? "",
  gstin: s?.gstin ?? "",
  state: s?.state ?? "",
  gst_rate: String(s?.gst_rate ?? 5),
  tax_type: s?.tax_type ?? "CGST_SGST",
  sac_code: s?.sac_code ?? "9964",
});

export default function SettingsPage() {
  const toast = useToast();
  const session = useSession();
  // Show the last loaded settings instantly. They came from a successful load,
  // never from defaults, so they're safe to display.
  const [form, setForm] = useState<FormState | null>(() => {
    const c = cachedSettings();
    return c === undefined ? null : toForm(c);
  });
  // What's saved in the database, to know whether anything changed.
  const [saved, setSaved] = useState<string>(() => (form ? JSON.stringify(form) : ""));
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  // Save unlocks only once we've confirmed these are the latest values, so a
  // stale copy can't overwrite a colleague's recent change.
  const [confirmed, setConfirmed] = useState(() => settingsFresh());
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Never fall back to defaults on a failed load: saving those would silently
  // overwrite the real GST rate, tax type and GSTIN.
  useEffect(() => {
    if (attempt === 0 && settingsFresh()) return; // loaded within the last minute
    let live = true;
    fetchSettings()
      .then((data) => {
        if (!live) return;
        const f = toForm(data);
        // Keep anything the user already typed; otherwise show the latest values.
        setForm((cur) => (cur && JSON.stringify(cur) !== savedRef.current ? cur : f));
        setSaved(JSON.stringify(f));
        setConfirmed(true);
        setRefreshFailed(false);
      })
      .catch(() => {
        if (!live) return;
        if (cachedSettings() === undefined) setLoadFailed(true);
        else setRefreshFailed(true);
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  if (loadFailed) {
    return (
      <>
        <PageTitle>Settings</PageTitle>
        <EmptyState icon={<AlertIcon width={28} height={28} />} title="Couldn't load settings">
          Check your connection, then try again. Nothing has been changed.
        </EmptyState>
        <div className="mx-auto max-w-xs">
          <Button
            type="button"
            variant="plain"
            onClick={() => {
              setLoadFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (!form) {
    return (
      <>
        <PageTitle>Settings</PageTitle>
        {[4, 3].map((n, g) => (
          <div key={g} className="mb-9">
            <Skeleton className="mb-4 h-4 w-24" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: n }, (_, i) => (
                <div key={i}>
                  <Skeleton className="mb-2 ml-1 h-3 w-20" />
                  <Skeleton className="h-14 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const rate = Number(form.gst_rate);
  const errors = {
    gstin: form.gstin && !GSTIN.test(form.gstin) ? "GSTIN should be 15 characters, e.g. 06ABCDE1234F1Z5." : null,
    gst_rate: form.gst_rate !== "" && rate >= 0 && rate <= 28 ? null : "Enter a rate between 0 and 28.",
  };

  const dirty = JSON.stringify(form) !== saved;
  const hasErrors = Object.values(errors).some(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const values: Settings = {
      id: 1,
      business_name: form.business_name.trim() || null,
      address: form.address.trim() || null,
      gstin: form.gstin.trim() || null,
      state: form.state.trim() || null,
      gst_rate: rate,
      tax_type: form.tax_type,
      sac_code: form.sac_code.trim() || null,
    };
    const { error } = await supabase.from("settings").upsert(values);
    setSaving(false);
    if (!error) {
      setSaved(JSON.stringify(form));
      rememberSettings(values); // New invoice picks up the new rate straight away
    }
    toast(error ? "Couldn't save settings." : "Settings saved", error ? "error" : "ok");
  }

  return (
    <>
      <PageTitle>Settings</PageTitle>
      <form onSubmit={submit} noValidate>
        <Group title="Business">
          {/* Phone: one per row so GSTIN and the address are fully visible.
              Laptop: name | address, GSTIN | state. */}
          <div className="grid gap-2.5 md:grid-cols-2 md:items-start md:gap-x-3 md:gap-y-4">
            <Field label="Business name" placeholder="Registered business name" value={form.business_name} onChange={set("business_name")} />
            <Field
              multiline
              label="Address"
              placeholder="Office address"
              value={form.address}
              onChange={set("address")}
            />
            <Field
              label="GSTIN"
              placeholder="15 characters"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={15}
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase().replace(/\s/g, "") })}
              error={errors.gstin}
            />
            <Field label="State" placeholder="e.g. Delhi" value={form.state} onChange={set("state")} />
          </div>
        </Group>

        <Group
          title="GST"
          footer={<span className="md:hidden">Changes apply to new invoices only.</span>}
        >
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-[1fr_1fr_1.7fr] md:items-end md:gap-3">
            <Field
              label="GST rate (%)"
              inputMode="decimal"
              value={form.gst_rate}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                if (/^\d*\.?\d{0,2}$/.test(v)) setForm({ ...form, gst_rate: v });
              }}
              error={errors.gst_rate}
            />
            <Field label="SAC code" inputMode="numeric" value={form.sac_code} onChange={set("sac_code")} />
            <div className="col-span-2 md:col-span-1">
              <Segmented
                inline
                label="Tax type"
                value={form.tax_type}
                onChange={(tax_type) => setForm({ ...form, tax_type })}
                options={[
                  { value: "CGST_SGST", label: "CGST + SGST" },
                  { value: "IGST", label: "IGST" },
                ]}
              />
            </div>
          </div>
        </Group>

        {!confirmed && (
          <p role="status" className="mb-3 px-1 text-[0.875rem] text-muted">
            {refreshFailed ? (
              <>
                Couldn&apos;t check for the latest settings.{" "}
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="-my-3 inline-flex min-h-11 items-center font-medium text-fg underline underline-offset-2"
                >
                  Try again
                </button>
              </>
            ) : (
              "Checking for the latest settings…"
            )}
          </p>
        )}

        <div className="mb-7 flex flex-col gap-4 md:mb-0 md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="hidden px-1 text-[0.875rem] leading-snug text-muted md:block md:max-w-[22rem]">
            GST changes apply to new invoices only. Saved invoices keep the rate they were created with.
          </p>
          <Button type="submit" disabled={saving || !dirty || hasErrors || !confirmed} arrow className="md:w-auto! md:min-w-60 md:shrink-0 md:gap-8">
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>

      {/* The laptop sidebar already shows the account, so this is phone-only. */}
      <div className="md:hidden">
        <Group variant="list">
          <div className="flex min-h-14 items-center gap-4 px-5 py-3">
            <p className="min-w-0 flex-1 truncate text-[0.9375rem]">
              <span className="text-muted">Signed in as </span>
              {session?.user.email}
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="pressable inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[0.9375rem] font-semibold shadow-[inset_0_0_0_1.5px_var(--fg)] hover:bg-fg hover:text-white"
            >
              Sign out
            </button>
          </div>
        </Group>
      </div>
    </>
  );
}
