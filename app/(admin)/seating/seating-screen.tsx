"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { btnGhost, btnPrimary, inputCls, RsvpDot } from "@/components/ui";
import { VenueMap } from "@/components/venue-map";
import { assignGuest, freeDeclinedSeats, moveTable, seatGuests } from "./actions";
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
  tables: {
    id: string;
    name: string;
    capacity: number;
    x: number;
    y: number;
    shape: string;
    rotation: number;
  }[];
  guests: SeatingGuest[];
  coupleNames: string;
};

export function SeatingScreen({ data }: { data: SeatingData }) {
  // Families sit together, so the queue works in whole parties; a party can
  // still be opened up to seat its people one by one when it must split.
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  // The queue, party by party, in the order the guests already have.
  const parties = useMemo(() => {
    const map = new Map<string, SeatingGuest[]>();
    for (const g of unseated) {
      const list = map.get(g.householdId) ?? [];
      list.push(g);
      map.set(g.householdId, list);
    }
    return [...map.entries()].map(([householdId, members]) => ({
      householdId,
      party: members[0].party,
      group: members[0].group,
      members,
    }));
  }, [unseated]);

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

  const selectedParty = parties.find((p) => p.householdId === selectedHouseholdId) ?? null;
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

  function clearSelection() {
    setSelectedHouseholdId(null);
    setSelectedGuestId(null);
  }

  function handleTableClick(tableId: string) {
    const table = mapTables.find((t) => t.id === tableId);
    if (!table) return;
    const free = table.capacity - table.seated;

    if (selectedParty) {
      const n = selectedParty.members.length;
      if (
        n > free &&
        !confirm(
          `${table.name} has ${Math.max(free, 0)} free ${free === 1 ? "seat" : "seats"} for ${n} people — seat them anyway? You can squeeze in an extra chair from the table's panel.`
        )
      )
        return;
      const ids = selectedParty.members.map((m) => m.id);
      clearSelection();
      setOpenTableId(tableId);
      run(() => seatGuests(ids, tableId));
      return;
    }

    if (selectedGuest) {
      if (
        free < 1 &&
        !confirm(`${table.name} is already full — seat ${selectedGuest.name} anyway?`)
      )
        return;
      const guestId = selectedGuest.id;
      clearSelection();
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
              clearSelection();
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
          {(selectedParty || selectedGuest) && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Now click a table to seat{" "}
              <strong>
                {selectedParty
                  ? `${selectedParty.party}${
                      selectedParty.members.length > 1
                        ? ` (${selectedParty.members.length} people)`
                        : ""
                    }`
                  : selectedGuest!.name}
              </strong>
              .{" "}
              <button className="underline" onClick={clearSelection}>
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
            platformLabel={data.coupleNames}
          />
          <p className="mt-3 text-xs text-stone-400">
            The real Buta Palace floor plan. Pinch or use the buttons to zoom; drag the
            background to pan. An amber dot marks a table where someone has declined;
            amber chairs are seats squeezed in beyond the standard 12 (18 at the ovals).
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
              <span className="text-sm text-stone-500">
                {parties.length} {parties.length === 1 ? "party" : "parties"} · {unseated.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Everyone is here, replied or not. Pick a party, then click its table on the
              plan — or open a party to seat people one by one.
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

            <div className="mt-3 flex max-h-[480px] flex-col gap-1.5 overflow-y-auto">
              {parties.length === 0 && (
                <p className="py-6 text-center text-sm text-stone-400">
                  Nobody left matching this filter.
                </p>
              )}
              {parties.map((p) => {
                const isSelected = p.householdId === selectedHouseholdId;
                const isExpanded = expanded.has(p.householdId);
                return (
                  <div
                    key={p.householdId}
                    className={`rounded-lg border transition ${
                      isSelected ? "border-rose-500 bg-rose-50" : "border-stone-200"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedGuestId(null);
                        setSelectedHouseholdId((cur) =>
                          cur === p.householdId ? null : p.householdId
                        );
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-50"
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{p.party}</span>
                        <span className="shrink-0 text-xs text-stone-500">
                          {p.members.length === 1 ? "1 person" : `${p.members.length} people`}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                        <span className="flex items-center gap-0.5">
                          {p.members.map((m) => (
                            <RsvpDot key={m.id} rsvp={m.rsvp} />
                          ))}
                        </span>
                        {p.group}
                      </span>
                    </button>
                    {p.members.length > 1 && (
                      <button
                        onClick={() =>
                          setExpanded((cur) => {
                            const next = new Set(cur);
                            if (next.has(p.householdId)) next.delete(p.householdId);
                            else next.add(p.householdId);
                            return next;
                          })
                        }
                        className="px-3 pb-2 text-xs text-stone-400 hover:underline"
                      >
                        {isExpanded ? "seat together instead" : "seat one by one…"}
                      </button>
                    )}
                    {isExpanded &&
                      p.members.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            setSelectedHouseholdId(null);
                            setSelectedGuestId((cur) => (cur === g.id ? null : g.id));
                          }}
                          className={`mx-2 mb-1.5 block w-[calc(100%-1rem)] rounded-md border px-2.5 py-1.5 text-left text-sm transition ${
                            selectedGuestId === g.id
                              ? "border-rose-500 bg-rose-50"
                              : "border-stone-100 hover:bg-stone-50"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <RsvpDot rsvp={g.rsvp} />
                            {g.isChild ? "🧒 " : ""}
                            {g.name}
                          </span>
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
