"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { btnGhost, btnPrimary, inputCls, RsvpDot } from "@/components/ui";
import { VenueMap } from "@/components/venue-map";
import { tableNo } from "@/lib/room-layout";
import { moveTable, seatGroup } from "./actions";
import { AddTablePanel } from "./add-table-panel";
import { TablePanel } from "./table-panel";

export type SeatingMember = {
  id: string;
  name: string;
  isChild: boolean;
  rsvp: string;
};

export type SeatingParty = {
  id: string;
  name: string;
  members: SeatingMember[];
};

// One guest group = one table. `coming` is the seats the group really needs —
// everyone who has not declined.
export type SeatingGroup = {
  name: string;
  parties: SeatingParty[];
  people: number;
  coming: number;
  declined: number;
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
    groupName: string | null;
  }[];
  // In the family's box order from the Guests screen; "Ungrouped" is not here —
  // it is a holding pen, not a table group.
  groups: SeatingGroup[];
  ungroupedPeople: number;
  coupleNames: string;
};

export function SeatingScreen({ data }: { data: SeatingData }) {
  // Seating goes group by group: pick a group on the right, then click its
  // table on the plan. 1 group = 1 table, enforced by the database.
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editLayout, setEditLayout] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [, startTransition] = useTransition();

  // Table positions are held locally while dragging so the plan feels instant,
  // then written to the database once the drag settles.
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setPositions({}), [data.tables]);

  const groupByName = useMemo(
    () => new Map(data.groups.map((g) => [g.name, g])),
    [data.groups]
  );
  const tableByGroup = useMemo(
    () =>
      new Map(
        data.tables.filter((t) => t.groupName).map((t) => [t.groupName!, t])
      ),
    [data.tables]
  );

  const unplaced = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.groups.filter((g) => {
      if (tableByGroup.has(g.name)) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.parties.some((p) => p.name.toLowerCase().includes(q))
      );
    });
  }, [data.groups, tableByGroup, search]);

  const placed = useMemo(
    () => data.groups.filter((g) => tableByGroup.has(g.name)),
    [data.groups, tableByGroup]
  );

  const mapTables = data.tables.map((t) => {
    const group = t.groupName ? groupByName.get(t.groupName) : undefined;
    return {
      ...t,
      ...(positions[t.id] ?? {}),
      // Seats taken = the group's people who have not declined. A decline
      // frees its seat by itself — there is nothing to reconcile any more.
      seated: group?.coming ?? 0,
    };
  });

  const totalSeats = data.tables.reduce((n, t) => n + t.capacity, 0);
  const comingTotal = data.groups.reduce((n, g) => n + g.coming, 0) + data.ungroupedPeople;
  const atTables = placed.reduce((n, g) => n + g.coming, 0);
  const overfull = mapTables.filter((t) => t.seated > t.capacity);
  const shortOfSeats = comingTotal - totalSeats;

  const openTable = mapTables.find((t) => t.id === openTableId) ?? null;
  const selected = selectedGroup ? (groupByName.get(selectedGroup) ?? null) : null;

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
    const table = mapTables.find((t) => t.id === tableId);
    if (!table) return;

    if (selected) {
      if (table.groupName && table.groupName !== selected.name) {
        if (
          !confirm(
            `${table.name} already seats “${table.groupName}” — replace them? That group becomes unplaced.`
          )
        )
          return;
      }
      if (selected.coming > table.capacity) {
        if (
          !confirm(
            `${table.name} has ${table.capacity} seats for ${selected.coming} people — seat them anyway? You can squeeze in extra chairs from the table's panel.`
          )
        )
          return;
      }
      const name = selected.name;
      setSelectedGroup(null);
      setOpenTableId(tableId);
      run(() => seatGroup(name, tableId));
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
            {placed.length} of {data.groups.length} groups placed · {atTables} people at
            tables · {data.tables.length} tables, {totalSeats} seats
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={editLayout ? btnPrimary : btnGhost}
            onClick={() => {
              setEditLayout((v) => !v);
              setSelectedGroup(null);
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
          You have {totalSeats} seats for {comingTotal} people expected — {shortOfSeats}{" "}
          short. Add tables, or squeeze in extra chairs from a table&apos;s panel.
        </p>
      )}

      {overfull.length > 0 && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Over capacity:{" "}
          {overfull
            .map((t) => `${t.name} — ${t.groupName} (${t.seated}/${t.capacity})`)
            .join(", ")}
        </p>
      )}

      {data.ungroupedPeople > 0 && (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
          {data.ungroupedPeople === 1
            ? "1 person is Ungrouped"
            : `${data.ungroupedPeople} people are Ungrouped`}{" "}
          — put them in a group on the Guests screen and they take that
          group&apos;s table.
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
          {selected && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Now click a table to seat{" "}
              <strong>
                {selected.name} ({selected.coming} people)
              </strong>
              .{" "}
              <button className="underline" onClick={() => setSelectedGroup(null)}>
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
            background to pan. Click a table to see its group; amber chairs are seats
            squeezed in beyond the standard 12 (18 at the ovals).
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {openTable ? (
            <TablePanel
              table={openTable}
              group={openTable.groupName ? (groupByName.get(openTable.groupName) ?? null) : null}
              unplaced={data.groups.filter((g) => !tableByGroup.has(g.name))}
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
              <h2 className="font-medium">Groups to place</h2>
              <span className="text-sm text-stone-500">{unplaced.length} left</span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Pick a group, then click its table on the plan. Each group takes one whole
              table.
            </p>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a group or a name…"
              className={`${inputCls} mt-3 w-full`}
            />

            <div className="mt-3 flex max-h-[380px] flex-col gap-1.5 overflow-y-auto">
              {unplaced.length === 0 && (
                <p className="py-6 text-center text-sm text-stone-400">
                  {search.trim()
                    ? "No group matches this search."
                    : "Every group has its table. 🎉"}
                </p>
              )}
              {unplaced.map((g) => {
                const isSelected = selectedGroup === g.name;
                return (
                  <button
                    key={g.name}
                    onClick={() =>
                      setSelectedGroup((cur) => (cur === g.name ? null : g.name))
                    }
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "border-rose-500 bg-rose-50"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{g.name}</span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {g.coming} {g.coming === 1 ? "person" : "people"}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                      <span className="flex items-center gap-0.5">
                        {g.parties
                          .flatMap((p) => p.members)
                          .slice(0, 20)
                          .map((m) => (
                            <RsvpDot key={m.id} rsvp={m.rsvp} />
                          ))}
                      </span>
                      {g.parties.length} {g.parties.length === 1 ? "invitation" : "invitations"}
                      {g.declined > 0 && ` · ${g.declined} declined`}
                    </span>
                  </button>
                );
              })}
            </div>

            {placed.length > 0 && (
              <>
                <h3 className="mt-4 border-t border-stone-100 pt-3 text-sm font-medium">
                  Placed
                </h3>
                <div className="mt-2 flex max-h-[240px] flex-col overflow-y-auto">
                  {placed.map((g) => {
                    const t = tableByGroup.get(g.name)!;
                    return (
                      <button
                        key={g.name}
                        onClick={() => setOpenTableId(t.id)}
                        className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-stone-50"
                      >
                        <span className="min-w-0 truncate text-stone-600">
                          <span className="tabular-nums text-stone-400">
                            {tableNo(t.name)} ·
                          </span>{" "}
                          {g.name}
                        </span>
                        <span
                          className={`shrink-0 text-xs ${
                            g.coming > t.capacity ? "font-medium text-rose-600" : "text-stone-400"
                          }`}
                        >
                          {g.coming}/{t.capacity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
