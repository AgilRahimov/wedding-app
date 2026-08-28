"use client";

import { useTransition } from "react";
import { btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { addTable } from "./actions";

export function AddTablePanel({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await addTable(
          String(formData.get("name") ?? ""),
          Number(formData.get("capacity") ?? 10),
          String(formData.get("shape") ?? "round")
        );
        onDone();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not add the table");
      }
    });
  }

  return (
    <form
      action={submit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Table name
        <input name="name" required defaultValue="Table" className={`${inputCls} w-40`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Seats
        <input name="capacity" type="number" min={1} max={40} defaultValue={12} className={`${inputCls} w-20`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Shape
        <select name="shape" className={inputCls} defaultValue="round">
          <option value="round">Round</option>
          <option value="half">Half-round</option>
          <option value="oval">Oval</option>
          <option value="long">Long</option>
        </select>
      </label>
      <button className={btnPrimary} disabled={isPending}>
        {isPending ? "Adding…" : "Add"}
      </button>
      <button type="button" className={btnGhost} onClick={onDone}>
        Close
      </button>
    </form>
  );
}
