"use client";

import { useEffect, useState } from "react";
import { btnGhost, btnPrimary, inputCls, RsvpDot } from "@/components/ui";
import { assignGuest, clearTable, deleteTable, rotateTable, seatGuests, updateTable } from "./actions";
import type { SeatingGuest } from "./seating-screen";

// The venue's standard sizes — anything above is a squeezed-in extra chair.
function standardSeats(shape: string) {
  return shape === "oval" ? 18 : 12;
}

/** The right-hand panel for one table: who sits there, seat-the-party
 *  shortcut, add/remove a chair, rename, rotate, empty, delete. */
export function TablePanel({
  table,
  guests,
  selectedGuest,
  partyMatesToSeat,
  onClose,
  run,
}: {
  table: { id: string; name: string; capacity: number; seated: number; shape: string };
  guests: SeatingGuest[];
  selectedGuest: SeatingGuest | null;
  partyMatesToSeat: SeatingGuest[];
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(table.name);

  useEffect(() => {
    setName(table.name);
    setEditing(false);
  }, [table.id, table.name]);

  const confirmed = guests.filter((g) => g.rsvp === "yes").length;
  const declined = guests.filter((g) => g.rsvp === "no").length;
  const extra = table.capacity - standardSeats(table.shape);

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
        {extra > 0 && (
          <span className="text-xs text-amber-600">
            {extra} squeezed in
          </span>
        )}
      </div>

      {selectedGuest && partyMatesToSeat.length > 1 && (
        <button
          className={`${btnGhost} mt-3 w-full`}
          onClick={() =>
            run(() =>
              seatGuests(
                partyMatesToSeat.map((g) => g.id),
                table.id
              )
            )
          }
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
