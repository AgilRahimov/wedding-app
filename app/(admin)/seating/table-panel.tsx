"use client";

import { useEffect, useState } from "react";
import { btnGhost, btnPrimary, inputCls, RsvpDot } from "@/components/ui";
import { deleteTable, freeTable, rotateTable, seatGroup, updateTable } from "./actions";
import type { SeatingGroup } from "./seating-screen";

// The venue's standard sizes — anything above is a squeezed-in extra chair.
function standardSeats(shape: string) {
  return shape === "oval" ? 18 : 12;
}

/** The right-hand panel for one table: the group that sits there with all its
 *  people, seat-a-group picker while it is free, add/remove a chair, rename,
 *  rotate, free, delete. */
export function TablePanel({
  table,
  group,
  unplaced,
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
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(table.name);
  const [pickedGroup, setPickedGroup] = useState("");

  useEffect(() => {
    setName(table.name);
    setEditing(false);
    setPickedGroup("");
  }, [table.id, table.name]);

  const extra = table.capacity - standardSeats(table.shape);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium">{table.name}</h2>
        <button className="text-sm text-stone-400 hover:underline" onClick={onClose}>
          close
        </button>
      </div>
      {group ? (
        <>
          <p className="mt-0.5 text-sm text-stone-700">{group.name}</p>
          <p className="text-xs text-stone-400">
            {group.parties.length}{" "}
            {group.parties.length === 1 ? "invitation" : "invitations"} · {group.coming} of{" "}
            {table.capacity} seats
            {group.declined > 0 && ` · ${group.declined} declined`}
          </p>
        </>
      ) : (
        <p className="mt-0.5 text-sm text-stone-500">Free — no group sits here yet.</p>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-stone-600">Seats:</span>
        <button
          aria-label="Remove a seat"
          className="h-7 w-7 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          disabled={table.capacity <= Math.max(1, table.seated)}
          onClick={() =>
            run(() => updateTable(table.id, { name: table.name, capacity: table.capacity - 1 }))
          }
        >
          −
        </button>
        <span className="w-6 text-center tabular-nums">{table.capacity}</span>
        <button
          aria-label="Add a seat"
          className="h-7 w-7 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          disabled={table.capacity >= 20}
          onClick={() =>
            run(() => updateTable(table.id, { name: table.name, capacity: table.capacity + 1 }))
          }
        >
          +
        </button>
        {extra > 0 && <span className="text-xs text-amber-600">{extra} squeezed in</span>}
      </div>

      {!group && unplaced.length > 0 && (
        <div className="mt-3 flex gap-2">
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
        <ul className="mt-3 flex flex-col gap-1">
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

      {editing ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            Name
            <input className={`${inputCls} w-40`} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button
            className={btnPrimary}
            onClick={() =>
              run(async () => {
                await updateTable(table.id, { name, capacity: table.capacity });
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
            Rename
          </button>
          {table.shape !== "round" && (
            <button
              className="text-stone-600 hover:underline"
              onClick={() => run(() => rotateTable(table.id))}
            >
              Rotate 45°
            </button>
          )}
          {group && (
            <button
              className="text-stone-600 hover:underline"
              onClick={() => run(() => freeTable(table.id))}
            >
              Free this table
            </button>
          )}
          <button
            className="text-rose-600 hover:underline"
            onClick={() => {
              if (
                !confirm(
                  `Delete ${table.name}?${table.groupName ? ` ${table.groupName} becomes unplaced.` : ""}`
                )
              )
                return;
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
