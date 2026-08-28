"use client";

import { useState, useTransition } from "react";
import { btnGhost, inputCls } from "@/components/ui";
import { deleteGroup, renameGroup } from "./actions";

/** Manage the groups: add a new one, rename the imported "Section NN" blocks,
 *  or delete a group (its parties move to "Ungrouped" — nobody is deleted). */
export function GroupsPanel({
  groups,
  onCreated,
  onRemoveEmpty,
  onDone,
}: {
  groups: [string, number][];
  onCreated: (name: string) => void;
  onRemoveEmpty: (name: string) => void;
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
    onCreated(name);
    setNewName("");
    setAdding(false);
  }

  function remove(name: string, count: number) {
    // A brand-new empty group lives only on this screen — just take it off the list.
    if (count === 0) {
      onRemoveEmpty(name);
      return;
    }
    if (
      !confirm(
        `Delete the group "${name}"? Its ${count} ${count === 1 ? "party moves" : "parties move"} to "Ungrouped" — no guests are deleted.`
      )
    )
      return;
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
              <button className="text-sm text-emerald-700 hover:underline" onClick={addGroup}>
                add
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
        Rename the imported &ldquo;Section NN&rdquo; blocks to real names. A new group is
        kept once a party is put into it — tick parties in the list and use &ldquo;Move to
        group&rdquo;, or set it when editing a party.
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
                  <span className="text-stone-400">
                    ({n === 0 ? "new — empty" : n})
                  </span>
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
