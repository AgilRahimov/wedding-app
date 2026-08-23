"use client";

import { useEffect, useState } from "react";
import { btnGhost, btnPrimary, inputCls, RsvpDot } from "@/components/ui";
import { assignGuest, clearTable, deleteTable, seatParty, updateTable } from "./actions";
import type { SeatingGuest } from "./seating-screen";

/** The right-hand panel for one table: who sits there, seat-the-party
 *  shortcut, rename/resize, empty, delete. */
export function TablePanel({
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
            <input className={`${inputCls} w-32`} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            Seats
            <input
              type="number"
              min={1}
              max={40}
              className={`${inputCls} w-16`}
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
