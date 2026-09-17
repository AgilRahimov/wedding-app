"use client";

import { useEffect, useState } from "react";
import { btnGhost, btnPrimary, inputCls, RsvpDot } from "@/components/ui";
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

/** What the popup shows for one table: the group that sits there with all
 *  its people, a seat-a-group picker while it is free, add/remove a chair,
 *  and "Remove group from table". Tables carry numbers, not names, so there
 *  is nothing to rename. Deleting the table itself is tucked away and only
 *  offered to the owner. */
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

  const extra = table.capacity - standardSeats(table.shape);
  const over = table.seated > table.capacity;

  return (
    <div className="flex flex-col gap-4 p-4">
      {group ? (
        <div>
          <p className="flex items-center gap-2 text-base font-medium text-stone-900">
            <SideDot side={group.side} />
            {group.name}
          </p>
          <p className={`mt-0.5 text-sm ${over ? "font-medium text-rose-600" : "text-stone-500"}`}>
            {group.coming} of {table.capacity} seats taken
            {over && " — over capacity"}
            <span className="font-normal text-stone-400">
              {" · "}
              {group.parties.length}{" "}
              {group.parties.length === 1 ? "invitation" : "invitations"}
              {group.declined > 0 && ` · ${group.declined} declined`}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-stone-500">This table is free — no group sits here yet.</p>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-stone-600">Seats:</span>
        <button
          aria-label="Remove a seat"
          className="h-9 w-9 rounded-lg border border-stone-200 text-lg text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          disabled={table.capacity <= Math.max(1, table.seated)}
          onClick={() => run(() => setTableSeats(table.id, table.capacity - 1))}
        >
          −
        </button>
        <span className="w-7 text-center text-base tabular-nums">{table.capacity}</span>
        <button
          aria-label="Add a seat"
          className="h-9 w-9 rounded-lg border border-stone-200 text-lg text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          disabled={table.capacity >= 20}
          onClick={() => run(() => setTableSeats(table.id, table.capacity + 1))}
        >
          +
        </button>
        {extra > 0 && <span className="text-xs text-amber-600">{extra} squeezed in</span>}
      </div>

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
            className={`${btnGhost} w-full`}
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
