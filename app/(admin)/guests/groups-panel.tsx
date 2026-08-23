"use client";

import { useState, useTransition } from "react";
import { inputCls } from "@/components/ui";
import { renameGroup } from "./actions";

/** Rename the imported "Section NN" blocks to real group names. */
export function GroupsPanel({
  groups,
  onDone,
}: {
  groups: [string, number][];
  onDone: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
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

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">
          Groups — rename the imported &ldquo;Section NN&rdquo; blocks to real names
        </h2>
        <button className="text-sm text-stone-500 hover:underline" onClick={onDone}>
          Close
        </button>
      </div>
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
                  {g} <span className="text-stone-400">({n})</span>
                </span>
                <button
                  className="text-rose-700 hover:underline"
                  onClick={() => {
                    setEditing(g);
                    setValue(g);
                  }}
                >
                  rename
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
