"use client";

import { useEffect, useState } from "react";
import { btnPrimary, inputCls, RsvpDot } from "@/components/ui";
import { deleteTable, freeTable, rotateTable, seatGroup, setTableSeats } from "./actions";
import type { TableSide } from "@/components/venue-table";
import type { SeatingGroup } from "./seating-screen";

/** The little colour chip that says whose guests a group is. */
export function SideDot({ side }: { side: TableSide }) {
  if (!side) return null;
  const tone =
    side === "groom" ? "bg-sky-400" : side === "bride" ? "bg-pink-400" : "bg-amber-400";
  const label =
    side === "groom"
      ? "Groom's side"
      : side === "bride"
        ? "Bride's side"
        : "Both sides / side missing";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${tone}`}
      title={label}
      aria-label={label}
    />
  );
}

// The venue's standard sizes — anything above is a squeezed-in extra chair.
function standardSeats(shape: string) {
  return shape === "oval" ? 18 : 12;
}

/** Seats − N + for the popup's header, right next to "Table N": squeeze in
 *  an extra chair, or take one away. */
export function SeatsStepper({
  table,
  run,
}: {
  table: { id: string; capacity: number; seated: number; shape: string };
  run: (fn: () => Promise<unknown>) => void;
}) {
  const extra = table.capacity - standardSeats(table.shape);
  const btn =
    "h-8 w-8 rounded-lg border border-stone-300 bg-white text-lg leading-none text-stone-600 hover:bg-stone-50 disabled:opacity-40";
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-stone-500">Seats</span>
      <button
        aria-label="Remove a seat"
        className={btn}
        disabled={table.capacity <= Math.max(1, table.seated)}
        onClick={() => run(() => setTableSeats(table.id, table.capacity - 1))}
      >
        −
      </button>
      <span className="w-7 text-center text-base font-semibold tabular-nums">
        {table.capacity}
      </span>
      <button
        aria-label="Add a seat"
        className={btn}
        disabled={table.capacity >= 20}
        onClick={() => run(() => setTableSeats(table.id, table.capacity + 1))}
      >
        +
      </button>
      {extra > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
          {extra} extra
        </span>
      )}
    </div>
  );
}

/** The popup heading's colour — the table's side, the same as on the plan. */
export function sideTone(side: TableSide): string {
  if (side === "groom") return "border-sky-200 bg-sky-100";
  if (side === "bride") return "border-pink-200 bg-pink-100";
  if (side === "mixed") return "border-amber-200 bg-amber-100";
  return "border-stone-200 bg-stone-100";
}

/** Second row of the popup's heading: the group at this table and X/X seats. */
export function TableGroupLine({
  table,
  group,
}: {
  table: { capacity: number };
  group: SeatingGroup | null;
}) {
  if (!group) {
    return <p className="text-sm text-stone-600">Free — no group sits here yet.</p>;
  }
  const over = group.coming > table.capacity;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="min-w-0 break-words text-base font-medium text-stone-900">{group.name}</p>
      <p className="shrink-0 whitespace-nowrap">
        {group.declined > 0 && (
          <span className="mr-2 text-xs text-stone-600">{group.declined} declined</span>
        )}
        <span
          className={`text-base font-semibold tabular-nums ${
            over ? "text-red-600" : "text-stone-900"
          }`}
          title={`${group.coming} of ${table.capacity} seats taken`}
        >
          {group.coming}/{table.capacity}
        </span>
      </p>
    </div>
  );
}

/** The body of the popup for one table: everyone in its group, a
 *  seat-a-group picker while it is free, and "Remove group from this
 *  table". Tables carry numbers, not names, so there is nothing to rename.
 *  Deleting the table itself is tucked away and only offered to the owner. */
export function TablePanel({
  table,
  group,
  unplaced,
  isOwner,
  onClose,
  run,
}: {
  table: {
    id: string;
    name: string;
    capacity: number;
    seated: number;
    shape: string;
    groupName: string | null;
  };
  group: SeatingGroup | null;
  unplaced: SeatingGroup[];
  isOwner: boolean;
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [pickedGroup, setPickedGroup] = useState("");
  useEffect(() => setPickedGroup(""), [table.id]);

  return (
    <div className="flex flex-col gap-4 p-5">
      {!group && unplaced.length > 0 && (
        <div className="flex gap-2">
          <select
            value={pickedGroup}
            onChange={(e) => setPickedGroup(e.target.value)}
            className={`${inputCls} min-w-0 flex-1`}
            aria-label="Group to seat here"
          >
            <option value="">Seat a group here…</option>
            {unplaced.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} — {g.coming} {g.coming === 1 ? "person" : "people"}
              </option>
            ))}
          </select>
          <button
            className={btnPrimary}
            disabled={!pickedGroup}
            onClick={() => run(() => seatGroup(pickedGroup, table.id))}
          >
            Seat
          </button>
        </div>
      )}

      {group && (
        <ul className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto">
          {group.parties.map((p) => (
            <li key={p.id} className="rounded-lg border border-stone-100 px-3 py-1.5 text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {p.members.map((m) => (
                  <span
                    key={m.id}
                    className={`flex items-center gap-1 text-xs ${
                      m.rsvp === "no" ? "text-stone-400 line-through" : "text-stone-600"
                    }`}
                  >
                    <RsvpDot rsvp={m.rsvp} />
                    {m.isChild ? "🧒 " : ""}
                    {m.name}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}

      {group && (
        <div className="border-t border-stone-100 pt-3">
          <button
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            onClick={() => run(() => freeTable(table.id))}
          >
            Remove group from this table
          </button>
          <p className="mt-1.5 text-center text-xs text-stone-400">
            “{group.name}” goes back to “Groups to place” and the table becomes free.
            Nobody is deleted.
          </p>
        </div>
      )}

      {(table.shape !== "round" || isOwner) && (
        <details className="border-t border-stone-100 pt-3 text-sm">
          <summary className="cursor-pointer select-none text-xs text-stone-400 hover:text-stone-600">
            Table layout options
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {table.shape !== "round" && (
              <button
                className="text-stone-600 hover:underline"
                onClick={() => run(() => rotateTable(table.id))}
              >
                Rotate 45°
              </button>
            )}
            {isOwner && (
              <button
                className="text-rose-600 hover:underline"
                onClick={() => {
                  if (
                    !confirm(
                      `Delete ${table.name} from the floor plan?${
                        table.groupName ? ` “${table.groupName}” goes back to “Groups to place”.` : ""
                      } This removes the table itself, not just its group.`
                    )
                  )
                    return;
                  run(async () => {
                    await deleteTable(table.id);
                    onClose();
                  });
                }}
              >
                Delete this table from the plan…
              </button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
