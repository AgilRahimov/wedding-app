"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { btnGhost, btnPrimary, inputCls, RsvpDot } from "@/components/ui";
import { VenueMap } from "@/components/venue-map";
import { assignGuest, freeDeclinedSeats, moveTable } from "./actions";
import { AddTablePanel } from "./add-table-panel";
import { TablePanel } from "./table-panel";

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

export function SeatingScreen({ data }: { data: SeatingData }) {
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
                className={`${inputCls} w-full`}
              />
              <div className="flex gap-2">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className={`${inputCls} min-w-0 flex-1`}
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
                  className={`${inputCls} min-w-0 flex-1`}
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
