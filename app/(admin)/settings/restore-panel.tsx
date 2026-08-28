"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** The "Restore from a backup file" button in Settings → Backups.
 *  Replaces everything in this site's database with the chosen file, after a
 *  very explicit confirmation. */
export function RestorePanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !confirm(
        `Replace EVERYTHING in this site's database with the contents of "${file.name}"?\n\n` +
          `All guests, RSVPs, seating, programmes and travel currently here will be ` +
          `overwritten by what is in the file. If unsure, download a fresh backup first.`
      )
    )
      return;

    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/settings/restore", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The restore failed.");
      setMessage({
        ok: true,
        text:
          `Restored ${data.parties} parties / ${data.guests} guests, ` +
          `${data.tables} tables, ${data.programmes} programmes` +
          (data.exportedAt ? ` (backup from ${String(data.exportedAt).slice(0, 10)})` : "") +
          `.`,
      });
      router.refresh();
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "The restore failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <label
        className={`rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 ${
          busy ? "cursor-wait opacity-50" : "cursor-pointer"
        }`}
      >
        {busy ? "Restoring…" : "Restore from a backup file…"}
        <input
          type="file"
          accept=".json,application/json"
          className="hidden"
          disabled={busy}
          onChange={onPick}
        />
      </label>
      {message && (
        <p
          className={`w-full rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </>
  );
}
