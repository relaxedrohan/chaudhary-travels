"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageTitle, Skeleton } from "@/components/AppShell";
import { Button, Field, Group } from "@/components/Form";
import { BusIcon, ChevronRightIcon, PlusIcon, RouteIcon } from "@/components/Icons";
import { Sheet, preloadSheet } from "@/components/LazySheet";
import { useToast } from "@/components/Toast";
import { cachedBuses, cachedRoutes, fetchBuses, fetchRoutes, fleetFresh } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Bus, Route } from "@/lib/types";

type Editing =
  | { kind: "bus"; item: Partial<Bus> }
  | { kind: "route"; item: Partial<Route> }
  | null;

export default function FleetPage() {
  const toast = useToast();
  const [buses, setBuses] = useState<Bus[] | null>(() => cachedBuses() ?? null);
  const [routes, setRoutes] = useState<Route[] | null>(() => cachedRoutes() ?? null);
  const latest = useRef(0);
  const [editing, setEditingState] = useState<Editing>(null);
  const [open, setOpen] = useState(false);
  // Keep the last item rendered while the sheet animates closed.
  const setEditing = (e: NonNullable<Editing>) => {
    setEditingState(e);
    setOpen(true);
  };

  // Newest request wins, so two quick saves can't let an older list overwrite a newer one.
  const load = useCallback(() => {
    const req = ++latest.current;
    return Promise.all([fetchBuses(), fetchRoutes()])
      .then(([b, r]) => {
        if (req !== latest.current) return;
        setBuses(b);
        setRoutes(r);
      })
      .catch(() => {
        if (req !== latest.current) return;
        toast("Couldn't load buses and routes. Check your connection.", "error");
        setBuses((cur) => cur ?? []);
        setRoutes((cur) => cur ?? []);
      });
  }, [toast]);

  useEffect(() => {
    // Loaded within the last minute: reuse it. Our own saves call load() directly.
    if (!fleetFresh()) load();
    preloadSheet();
  }, [load]);

  const close = useCallback(() => setOpen(false), []);
  const done = (message: string) => {
    toast(message);
    setOpen(false);
    load();
  };

  return (
    <>
      <PageTitle>Buses & routes</PageTitle>

      <div className="md:grid md:grid-cols-2 md:gap-x-10">
      <Section
        title="Buses"
        icon={<BusIcon width={18} height={18} />}
        tint="bg-accent"
        empty="No buses yet."
        loading={buses === null}
        onAdd={() => setEditing({ kind: "bus", item: {} })}
        addLabel="Add bus"
        items={(buses ?? []).map((b) => ({
          id: b.id,
          primary: b.name || b.bus_number,
          secondary: [b.name ? b.bus_number : null, b.operator_name].filter(Boolean).join(" · ") || null,
          onClick: () => setEditing({ kind: "bus", item: b }),
        }))}
      />

      <Section
        title="Routes"
        icon={<RouteIcon width={18} height={18} />}
        tint="bg-fg"
        empty="No routes yet."
        loading={routes === null}
        onAdd={() => setEditing({ kind: "route", item: {} })}
        addLabel="Add route"
        items={(routes ?? []).map((r) => ({
          id: r.id,
          primary: `${r.from_place} → ${r.to_place}`,
          secondary: null,
          onClick: () => setEditing({ kind: "route", item: r }),
        }))}
      />

      </div>

      <p className="px-1 text-[0.875rem] text-muted">
        Changing or deleting a bus or route doesn&apos;t affect invoices already saved.
      </p>

      <Sheet
        open={open}
        onClose={close}
        title={
          editing
            ? `${editing.item.id ? "Edit" : "New"} ${editing.kind}`
            : ""
        }
      >
        {editing?.kind === "bus" && (
          <BusForm bus={editing.item} onDone={done} />
        )}
        {editing?.kind === "route" && (
          <RouteForm route={editing.item} onDone={done} />
        )}
      </Sheet>
    </>
  );
}

function Section({
  title,
  icon,
  tint,
  empty,
  loading,
  items,
  onAdd,
  addLabel,
}: {
  title: string;
  icon: React.ReactNode;
  tint: string;
  empty: string;
  loading: boolean;
  items: { id: string; primary: string; secondary: string | null; onClick: () => void }[];
  onAdd: () => void;
  addLabel: string;
}) {
  const tile = (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white ${tint}`}>
      {icon}
    </span>
  );
  return (
    <Group title={title} variant="list">
      {loading ? (
        Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 px-5">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))
      ) : items.length === 0 ? (
        <p className="px-5 py-4 text-[0.9375rem] text-muted">{empty}</p>
      ) : (
        items.map((it) => (
          <button
            key={it.id}
            onClick={it.onClick}
            className="flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left transition-colors active:bg-fill md:hover:bg-fill"
          >
            {tile}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[1rem] font-medium">{it.primary}</span>
              {it.secondary && (
                <span className="block truncate text-[0.8125rem] text-muted">{it.secondary}</span>
              )}
            </span>
            <ChevronRightIcon width={16} height={16} className="text-muted/70" />
          </button>
        ))
      )}
      <button
        onClick={onAdd}
        className="flex min-h-14 w-full items-center gap-3 px-5 text-[1rem] font-semibold text-fg transition-colors active:bg-fill md:hover:bg-fill"
      >
        <span className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-sep text-accent">
          <PlusIcon width={20} height={20} strokeWidth={2.2} />
        </span>
        {addLabel}
      </button>
    </Group>
  );
}

function useSave(table: "buses" | "routes", onDone: (m: string) => void) {
  const toast = useToast();
  // Which action is in flight, so the right button says "Saving…" / "Deleting…".
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The "Tap again to delete" state expires, so a stray tap later can't delete.
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  async function run(kind: "save" | "delete", work: () => PromiseLike<{ error: unknown }>, ok: string, fail: string) {
    setBusy(kind);
    const { error } = await work();
    setBusy(null);
    if (error) return toast(fail, "error");
    onDone(ok);
  }

  const save = (id: string | undefined, values: Record<string, string | null>) =>
    run(
      "save",
      () => (id ? supabase.from(table).update(values).eq("id", id) : supabase.from(table).insert(values)),
      "Saved",
      "Couldn't save. Try again.",
    );

  const remove = (id: string) => {
    if (!confirmDelete) return setConfirmDelete(true);
    return run("delete", () => supabase.from(table).delete().eq("id", id), "Deleted", "Couldn't delete. Try again.");
  };

  /** Adds new rows in one go (used for a route and its return trip). */
  const insertMany = (values: Record<string, string>[], message: string) =>
    run("save", () => supabase.from(table).insert(values), message, "Couldn't save. Try again.");

  return { busy, setBusy, save, insertMany, remove, confirmDelete, toast };
}

const routeKey = (from: string, to: string) => `${from.trim().toLowerCase()}→${to.trim().toLowerCase()}`;

function BusForm({ bus, onDone }: { bus: Partial<Bus>; onDone: (m: string) => void }) {
  const [number, setNumber] = useState(bus.bus_number ?? "");
  const [operator, setOperator] = useState(bus.operator_name ?? "");
  const [name, setName] = useState(bus.name ?? "");
  const [touched, setTouched] = useState(false);
  const { busy, save, remove, confirmDelete } = useSave("buses", onDone);
  const error = number.trim() ? null : "Enter the bus number.";

  return (
    <form
      className="pt-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!error)
          save(bus.id, {
            name: name.trim() || null,
            bus_number: number.trim().toUpperCase(),
            operator_name: operator.trim() || null,
          });
      }}
    >
      <Group>
        <Field
          label="Name"
          autoComplete="off"
          placeholder="Anything, e.g. Volvo sleeper (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Bus number"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="e.g. HR 26 AB 1234"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? error : null}
        />
        <Field
          label="Operator"
          autoComplete="off"
          placeholder="Optional"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        />
      </Group>
      <FormActions busy={busy} id={bus.id} onDelete={remove} confirmDelete={confirmDelete} />
    </form>
  );
}

function RouteForm({ route, onDone }: { route: Partial<Route>; onDone: (m: string) => void }) {
  const [from, setFrom] = useState(route.from_place ?? "");
  const [to, setTo] = useState(route.to_place ?? "");
  const [touched, setTouched] = useState({ from: false, to: false });
  const { busy, setBusy, save, insertMany, remove, confirmDelete, toast } = useSave("routes", onDone);
  const isNew = !route.id;
  const errors = {
    from: from.trim() ? null : "Enter where the route starts.",
    to: !to.trim()
      ? "Enter where the route ends."
      : routeKey(from, "") === routeKey(to, "")
        ? "From and To can't be the same place."
        : null,
  };

  // New route: save it and its return trip, skipping any direction that already exists.
  async function addWithReturn() {
    if (busy) return; // a double-tap must not add the pair twice
    setBusy("save");
    const f = from.trim();
    const t = to.trim();
    const { data, error } = await supabase.from("routes").select("from_place,to_place");
    if (error) {
      setBusy(null);
      return toast("Couldn't save. Try again.", "error");
    }
    const existing = new Set((data ?? []).map((r) => routeKey(r.from_place, r.to_place)));
    const toAdd = [
      { from_place: f, to_place: t },
      { from_place: t, to_place: f },
    ].filter((r) => !existing.has(routeKey(r.from_place, r.to_place)));
    if (toAdd.length === 0) {
      setBusy(null);
      return toast(`${f} → ${t} and its return already exist.`, "error");
    }
    insertMany(
      toAdd,
      toAdd.length === 2 ? `Added ${f} → ${t} and ${t} → ${f}` : `Added ${toAdd[0].from_place} → ${toAdd[0].to_place}`,
    );
  }

  return (
    <form
      className="pt-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched({ from: true, to: true });
        if (errors.from || errors.to) return;
        if (isNew) addWithReturn();
        else save(route.id, { from_place: from.trim(), to_place: to.trim() });
      }}
    >
      <Group
        footer={
          isNew && from.trim() && to.trim() && !errors.to
            ? `${to.trim()} → ${from.trim()} will be added too.`
            : isNew
              ? "The return trip is added automatically."
              : undefined
        }
      >
        <Field
          label="From"
          autoComplete="off"
          autoCapitalize="words"
          placeholder="e.g. Delhi"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, from: true }))}
          error={touched.from ? errors.from : null}
        />
        <Field
          label="To"
          autoComplete="off"
          autoCapitalize="words"
          placeholder="e.g. Jaipur"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, to: true }))}
          error={touched.to ? errors.to : null}
        />
      </Group>
      <FormActions busy={busy} id={route.id} onDelete={remove} confirmDelete={confirmDelete} />
    </form>
  );
}

function FormActions({
  busy,
  id,
  onDelete,
  confirmDelete,
}: {
  busy: "save" | "delete" | null;
  id?: string;
  onDelete: (id: string) => void;
  confirmDelete: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button type="submit" disabled={busy !== null}>
        {busy === "save" ? "Saving…" : "Save"}
      </Button>
      {id && (
        <Button
          type="button"
          variant={confirmDelete ? "primary" : "danger"}
          disabled={busy !== null}
          onClick={() => onDelete(id)}
        >
          {busy === "delete" ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete"}
        </Button>
      )}
    </div>
  );
}
