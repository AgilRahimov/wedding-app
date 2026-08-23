"use client";

import { useTransition } from "react";
import { btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { addParty } from "./actions";

export function AddPartyPanel({
  groups,
  sides,
  onDone,
}: {
  groups: string[];
  sides: string[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await addParty({
          name: String(formData.get("name") ?? ""),
          group: String(formData.get("group") ?? ""),
          side: String(formData.get("side") ?? "") || null,
          phone: String(formData.get("phone") ?? "") || null,
          plusOnes: Number(formData.get("plusOnes") ?? 0),
        });
        onDone();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not add");
      }
    });
  }

  return (
    <form
      action={submit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Main guest name *
        <input name="name" required className={`${inputCls} w-52`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Group
        <input name="group" list="group-options-add" className={`${inputCls} w-40`} />
        <datalist id="group-options-add">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Side
        <input name="side" list="side-options-add" className={`${inputCls} w-40`} />
        <datalist id="side-options-add">
          {sides.map((s) => (
            <option key={s} value={s} />
          ))}
          <option value="Groom's side" />
          <option value="Bride's side" />
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Phone
        <input name="phone" className={`${inputCls} w-36`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        +1s
        <input
          name="plusOnes"
          type="number"
          min={0}
          max={10}
          defaultValue={0}
          className={`${inputCls} w-16`}
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={isPending}>
          {isPending ? "Adding…" : "Add"}
        </button>
        <button type="button" className={btnGhost} onClick={onDone}>
          Close
        </button>
      </div>
    </form>
  );
}
