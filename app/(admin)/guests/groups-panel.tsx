"use client";

import { useState, useTransition } from "react";
import { btnGhost, inputCls } from "@/components/ui";
import { createGroup, deleteGroup, renameGroup } from "./actions";

/** Manage the groups: add a new one, rename one, or delete one (its parties
 *  move to "Ungrouped" — nobody is deleted). A new group is saved straight
 *  away, even while it is empty. */
export function GroupsPanel({
  groups,
  onDone,
}: {
  groups: [string, number][];
  onDone: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function rename(from: string) {
    startTransition(async () => {
      try {
        await renameGroup(from, value);
        setEditing(null);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not rename");
      }
    });
  }

  function addGroup() {
    const name = newName.trim();
    if (!name) return;
    if (groups.some(([g]) => g.toLowerCase() === name.toLowerCase())) {
      alert(`The group "${name}" already exists.`);
      return;
    }
    startTransition(async () => {
      try {
        await createGroup(name);
        setNewName("");
        setAdding(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not create the group");
      }
    });
  }

  function remove(name: string, count: number) {
    const what =
      count === 0
        ? `Delete the empty group "${name}"? If it has a table, the table becomes free.`
        : `Delete the group "${name}"? Its ${count} ${count === 1 ? "party moves" : "parties move"} to "Ungrouped" — no guests are deleted. If it has a table, the table becomes free.`;
    if (!confirm(what)) return;
    startTransition(async () => {
      try {
        await deleteGroup(name);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not delete the group");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Groups</h2>
        <div className="flex items-center gap-3">
          {adding ? (
            <span className="flex items-center gap-2">
              <input
                autoFocus
                placeholder="New group name…"
                className={`${inputCls} w-44`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGroup()}
              />
              <button
                className="text-sm text-emerald-700 hover:underline"
                onClick={addGroup}
                disabled={isPending}
              >
                {isPending ? "saving…" : "add"}
              </button>
              <button
                className="text-sm text-stone-500 hover:underline"
                onClick={() => setAdding(false)}
              >
                cancel
              </button>
            </span>
          ) : (
            <button className={btnGhost} onClick={() => setAdding(true)}>
              + New group
            </button>
          )}
          <button className="text-sm text-stone-500 hover:underline" onClick={onDone}>
            Close
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-stone-400">
        A new group is saved straight away, even while it is empty — it can already take
        a table on the Seating screen. A group stays until you delete it here, even if
        its last party leaves.
      </p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(([g, n]) => (
          <li key={g} className="flex items-center gap-2 text-sm">
            {editing === g ? (
              <>
                <input
                  autoFocus
                  className={`${inputCls} w-44`}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && rename(g)}
                />
                <button
                  className="text-emerald-700 hover:underline"
                  onClick={() => rename(g)}
                  disabled={isPending}
                >
                  save
                </button>
                <button
                  className="text-stone-500 hover:underline"
                  onClick={() => setEditing(null)}
                >
                  cancel
                </button>
              </>
            ) : (
              <>
                <span className="truncate">
                  {g}{" "}
                  <span className="text-stone-400">({n === 0 ? "empty" : n})</span>
                </span>
                <button
                  className="text-stone-600 hover:underline"
                  onClick={() => {
                    setEditing(g);
                    setValue(g);
                  }}
                >
                  rename
                </button>
                {g !== "Ungrouped" && (
                  <button
                    className="text-rose-700 hover:underline"
                    onClick={() => remove(g, n)}
                    disabled={isPending}
                  >
                    delete
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
