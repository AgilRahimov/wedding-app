"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { VenueMap } from "@/components/venue-map";
import {
  addTable,
  assignGuest,
  clearTable,
  deleteTable,
  freeDeclinedSeats,
  moveTable,
  seatParty,
  updateTable,
} from "./actions";

export type SeatingGuest = {
  id: string;
  name: string;
  isChild: boolean;
  rsvp: string;
  tableId: string | null;
  householdId: string;
  party: string;
  group: string;
  side: string | null;
};

export type SeatingData = {
  tables: { id: string; name: string; capacity: number; x: number; y: number; shape: string }[];
  guests: SeatingGuest[];
};

const input =
  "rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200";
const btn = "rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50";
const btnPrimary = `${btn} bg-rose-700 text-white hover:bg-rose-800`;
const btnGhost = `${btn} border border-stone-300 text-stone-600 hover:bg-stone-100`;

/** A small coloured dot standing in for a reply, so the lists stay compact. */
function RsvpDot({ rsvp }: { rsvp: string }) {
  const tone =
    rsvp === "yes" ? "bg-emerald-500" : rsvp === "no" ? "bg-rose-500" : "bg-amber-400";
  const label =
    rsvp === "yes" ? "Coming" : rsvp === "no" ? "Has declined" : "Awaiting reply";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${tone}`}
      title={label}
      aria-label={label}
    />
  );
}

export function SeatingBoard({ data }: { data: SeatingData }) {
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  // Defaults to hiding people who have declined — you would never seat them,
  // and they would otherwise clutter the queue as replies come in.
  const [rsvpFilter, setRsvpFilter] = useState("active");
  const [editLayout, setEditLayout] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [freed, setFreed] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Table positions are held locally while dragging so the plan feels instant,
  // then written to the database once the drag settles.
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setPositions({}), [data.tables]);

  const seatedByTable = useMemo(() => {
    const map = new Map<string, SeatingGuest[]>();
    for (const g of data.guests) {
      if (!g.tableId) continue;
      const list = map.get(g.tableId) ?? [];
      list.push(g);
      map.set(g.tableId, list);
    }
    return map;
  }, [data.guests]);

  const groups = useMemo(
    () => [...new Set(data.guests.map((g) => g.group))].sort((a, b) => a.localeCompare(b)),
    [data.guests]
  );

  const unseated = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.guests.filter((g) => {
      if (g.tableId) return false;
      if (groupFilter !== "all" && g.group !== groupFilter) return false;
      if (rsvpFilter === "active" && g.rsvp === "no") return false;
      if (rsvpFilter !== "all" && rsvpFilter !== "active" && g.rsvp !== rsvpFilter)
        return false;
      if (q && !g.name.toLowerCase().includes(q) && !g.party.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data.guests, search, groupFilter, rsvpFilter]);

  // The reconciliation signal: people holding a seat who have since said no.
  const declinedSeated = useMemo(
    () => data.guests.filter((g) => g.tableId && g.rsvp === "no"),
    [data.guests]
  );
  const flaggedTableIds = useMemo(
    () => new Set(declinedSeated.map((g) => g.tableId!)),
    [declinedSeated]
  );

  const mapTables = data.tables.map((t) => ({
    ...t,
    ...(positions[t.id] ?? {}),
    seated: seatedByTable.get(t.id)?.length ?? 0,
    flagged: flaggedTableIds.has(t.id),
  }));

  const totalSeats = data.tables.reduce((n, t) => n + t.capacity, 0);
  const seated = data.guests.filter((g) => g.tableId);
  const seatedYes = seated.filter((g) => g.rsvp === "yes").length;
  const seatedPending = seated.filter((g) => g.rsvp === "pending").length;
  const unseatedTotal = data.guests.length - seated.length;
  const overfull = mapTables.filter((t) => t.seated > t.capacity);
  const shortOfSeats = data.guests.length - totalSeats;

  const selectedGuest = data.guests.find((g) => g.id === selectedGuestId) ?? null;
  const openTable = mapTables.find((t) => t.id === openTableId) ?? null;
  const openTableGuests = openTableId ? (seatedByTable.get(openTableId) ?? []) : [];

  const partyMatesToSeat = selectedGuest
    ? data.guests.filter((g) => g.householdId === selectedGuest.householdId && !g.tableId)
    : [];

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleTableClick(tableId: string) {
    if (selectedGuest) {
      const guestId = selectedGuest.id;
      setSelectedGuestId(null);
      setOpenTableId(tableId);
      run(() => assignGuest(guestId, tableId));
      return;
    }
    setOpenTableId((cur) => (cur === tableId ? null : tableId));
  }

  function handleTableMove(tableId: string, x: number, y: number) {
    setPositions((p) => ({ ...p, [tableId]: { x, y } }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void moveTable(tableId, x, y);
    }, 500);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Seating</h1>
          <p className="text-sm text-stone-500">
            {seated.length} of {data.guests.length} seated · {unseatedTotal} to go ·{" "}
            {data.tables.length} tables, {totalSeats} seats
          </p>
          {seated.length > 0 && (
            <p className="text-xs text-stone-400">
              Of those seated: {seatedYes} confirmed, {seatedPending} awaiting a reply
              {declinedSeated.length > 0 &&
                `, ${declinedSeated.length} ${declinedSeated.length === 1 ? "has" : "have"} declined`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={editLayout ? btnPrimary : btnGhost}
            onClick={() => {
              setEditLayout((v) => !v);
              setSelectedGuestId(null);
            }}
          >
            {editLayout ? "Done moving tables" : "Move tables"}
          </button>
          <button className={btnGhost} onClick={() => setShowAddTable((v) => !v)}>
            + Add table
          </button>
        </div>
      </div>

      {shortOfSeats > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You have {totalSeats} seats for {data.guests.length} invited people —{" "}
          {shortOfSeats} short if everyone comes. Add tables now, or seat only who you
          expect and reconcile once replies are in.
        </p>
      )}

      {declinedSeated.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>
            <strong>{declinedSeated.length}</strong>{" "}
            {declinedSeated.length === 1 ? "person is" : "people are"} still holding a seat
            after declining
            {" — "}
            {[...new Set(declinedSeated.map((g) =>
              data.tables.find((t) => t.id === g.tableId)?.name
            ))]
              .filter(Boolean)
              .join(", ")}
            .
          </span>
          <button
            className={btnGhost}
            onClick={() =>
              run(async () => {
                const n = await freeDeclinedSeats();
                setFreed(n);
                setTimeout(() => setFreed(null), 4000);
              })
            }
          >
            Free their seats
          </button>
        </div>
      )}

      {freed !== null && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Freed {freed} {freed === 1 ? "seat" : "seats"}.
        </p>
      )}

      {overfull.length > 0 && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Over capacity: {overfull.map((t) => `${t.name} (${t.seated}/${t.capacity})`).join(", ")}
        </p>
      )}

      {showAddTable && <AddTablePanel onDone={() => setShowAddTable(false)} />}

      {editLayout && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Drag the tables to match the real room. Positions save by themselves.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          {selectedGuest && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Now click a table to seat <strong>{selectedGuest.name}</strong>.{" "}
              <button className="underline" onClick={() => setSelectedGuestId(null)}>
                cancel
              </button>
            </p>
          )}
          <VenueMap
            tables={mapTables}
            variant="admin"
            selectedTableId={openTableId}
            onTableClick={handleTableClick}
            onTableMove={handleTableMove}
            editLayout={editLayout}
          />
          <p className="mt-3 text-xs text-stone-400">
            Placeholder room layout — we&rsquo;ll redraw it once Buta Palace sends the real
            floor plan. An amber dot marks a table where someone has declined.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {openTable ? (
            <TablePanel
              table={openTable}
              guests={openTableGuests}
              selectedGuest={selectedGuest}
              partyMatesToSeat={partyMatesToSeat}
              onClose={() => setOpenTableId(null)}
              run={run}
            />
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 shadow-sm">
              Click a table on the plan to see who is sitting there.
            </div>
          )}

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="font-medium">Still to seat</h2>
              <span className="text-sm text-stone-500">{unseated.length}</span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Everyone is here, replied or not. Seat the room now; the replies catch up.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a name…"
                className={`${input} w-full`}
              />
              <div className="flex gap-2">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className={`${input} min-w-0 flex-1`}
                >
                  <option value="all">All groups</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <select
                  value={rsvpFilter}
                  onChange={(e) => setRsvpFilter(e.target.value)}
                  className={`${input} min-w-0 flex-1`}
                >
                  <option value="active">Coming or awaiting</option>
                  <option value="yes">Coming</option>
                  <option value="pending">Awaiting</option>
                  <option value="no">Declined</option>
                  <option value="all">Everyone</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex max-h-[420px] flex-col gap-1 overflow-y-auto">
              {unseated.length === 0 && (
                <p className="py-6 text-center text-sm text-stone-400">
                  Nobody left matching this filter.
                </p>
              )}
              {unseated.map((g) => {
                const mates = data.guests.filter(
                  (o) => o.householdId === g.householdId && !o.tableId
                ).length;
                return (
                  <button
                    key={g.id}
                    onClick={() =>
                      setSelectedGuestId((cur) => (cur === g.id ? null : g.id))
                    }
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedGuestId === g.id
                        ? "border-rose-500 bg-rose-50"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <RsvpDot rsvp={g.rsvp} />
                      <span className="font-medium">
                        {g.isChild ? "🧒 " : ""}
                        {g.name}
                      </span>
                    </span>
                    <span className="mt-0.5 block pl-4 text-xs text-stone-500">
                      {g.group}
                      {mates > 1 && ` · ${mates} in this party`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TablePanel({
  table,
  guests,
  selectedGuest,
  partyMatesToSeat,
  onClose,
  run,
}: {
  table: { id: string; name: string; capacity: number; seated: number };
  guests: SeatingGuest[];
  selectedGuest: SeatingGuest | null;
  partyMatesToSeat: SeatingGuest[];
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState(String(table.capacity));

  useEffect(() => {
    setName(table.name);
    setCapacity(String(table.capacity));
    setEditing(false);
  }, [table.id, table.name, table.capacity]);

  const confirmed = guests.filter((g) => g.rsvp === "yes").length;
  const declined = guests.filter((g) => g.rsvp === "no").length;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium">{table.name}</h2>
        <button className="text-sm text-stone-400 hover:underline" onClick={onClose}>
          close
        </button>
      </div>
      <p className="mt-0.5 text-sm text-stone-500">
        {table.seated} of {table.capacity} seats taken
      </p>
      {guests.length > 0 && (
        <p className="text-xs text-stone-400">
          {confirmed} confirmed{declined > 0 && ` · ${declined} declined`}
        </p>
      )}

      {selectedGuest && partyMatesToSeat.length > 1 && (
        <button
          className={`${btnGhost} mt-3 w-full`}
          onClick={() => run(() => seatParty(selectedGuest.householdId, table.id))}
        >
          Seat all {partyMatesToSeat.length} of {selectedGuest.party} here
        </button>
      )}

      <ul className="mt-3 flex flex-col gap-1">
        {guests.length === 0 && (
          <li className="py-3 text-sm text-stone-400">Nobody seated here yet.</li>
        )}
        {guests.map((g) => (
          <li
            key={g.id}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm ${
              g.rsvp === "no" ? "border-amber-200 bg-amber-50" : "border-stone-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <RsvpDot rsvp={g.rsvp} />
              <span>
                <span
                  className={`font-medium ${g.rsvp === "no" ? "text-stone-500 line-through" : ""}`}
                >
                  {g.isChild ? "🧒 " : ""}
                  {g.name}
                </span>
                <span className="block text-xs text-stone-500">{g.party}</span>
              </span>
            </span>
            <button
              className="text-xs text-rose-600 hover:underline"
              onClick={() => run(() => assignGuest(g.id, null))}
            >
              remove
            </button>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            Name
            <input className={`${input} w-32`} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            Seats
            <input
              type="number"
              min={1}
              max={40}
              className={`${input} w-16`}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <button
            className={btnPrimary}
            onClick={() =>
              run(async () => {
                await updateTable(table.id, { name, capacity: Number(capacity) });
                setEditing(false);
              })
            }
          >
            Save
          </button>
          <button className={btnGhost} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-stone-100 pt-3 text-sm">
          <button className="text-stone-600 hover:underline" onClick={() => setEditing(true)}>
            Rename / resize
          </button>
          {guests.length > 0 && (
            <button
              className="text-stone-600 hover:underline"
              onClick={() => run(() => clearTable(table.id))}
            >
              Empty table
            </button>
          )}
          <button
            className="text-rose-600 hover:underline"
            onClick={() => {
              if (!confirm(`Delete ${table.name}? Anyone seated there becomes unseated.`)) return;
              run(async () => {
                await deleteTable(table.id);
                onClose();
              });
            }}
          >
            Delete table
          </button>
        </div>
      )}
    </div>
  );
}

function AddTablePanel({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await addTable(
          String(formData.get("name") ?? ""),
          Number(formData.get("capacity") ?? 10),
          String(formData.get("shape") ?? "round")
        );
        onDone();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not add the table");
      }
    });
  }

  return (
    <form
      action={submit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Table name
        <input name="name" required defaultValue="Table" className={`${input} w-40`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Seats
        <input name="capacity" type="number" min={1} max={40} defaultValue={10} className={`${input} w-20`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Shape
        <select name="shape" className={input} defaultValue="round">
          <option value="round">Round</option>
          <option value="long">Long</option>
        </select>
      </label>
      <button className={btnPrimary} disabled={isPending}>
        {isPending ? "Adding…" : "Add"}
      </button>
      <button type="button" className={btnGhost} onClick={onDone}>
        Close
      </button>
    </form>
  );
}
