"use client";

import { useState, useTransition } from "react";
import { btnGhost } from "@/components/ui";
import { restoreSnapshot, takeSnapshotNow } from "./actions";

/** The "Roll back" card: the automatic daily snapshots, each restorable
 *  with one (well-guarded) tap. */
export function SnapshotsPanel({
  snapshots,
}: {
  snapshots: { id: string; label: string }[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>, done: string) {
    startTransition(async () => {
      try {
        await fn();
        setMessage(done);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "That did not work.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Roll back</h2>
        <button
          className={btnGhost}
          disabled={isPending}
          onClick={() => run(() => takeSnapshotNow(), "Snapshot taken.")}
        >
          Take a snapshot now
        </button>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        The app keeps a copy of the whole database from the start of each day (the last
        14). If a data-entry session goes wrong, roll everything back to how it was —
        the History page tells you what happened in between.
      </p>

      {message && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-1">
        {snapshots.length === 0 && (
          <li className="py-2 text-sm text-stone-400">
            No snapshots yet — the first one is taken with the day&rsquo;s first change.
          </li>
        )}
        {snapshots.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 px-3 py-1.5 text-sm"
          >
            <span>{s.label}</span>
            <button
              className="text-rose-600 hover:underline disabled:opacity-50"
              disabled={isPending}
              onClick={() => {
                if (
                  !confirm(
                    `Roll EVERYTHING back to ${s.label}?\n\nAll changes made since that moment — by everyone — will be undone. The History page shows what those changes were.`
                  )
                )
                  return;
                run(() => restoreSnapshot(s.id), `Rolled back to ${s.label}.`);
              }}
            >
              roll back to this
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
