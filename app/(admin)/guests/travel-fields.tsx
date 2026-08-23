"use client";

import { inputCls } from "@/components/ui";
import type { PartyDraft } from "./actions";

/** The travel block inside a party's edit panel — only shown for parties
 *  marked as travelling from abroad. */
export function TravelFields({
  draft,
  set,
}: {
  draft: PartyDraft;
  set: (patch: Partial<PartyDraft>) => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
      <p className="mb-2 text-xs font-medium text-sky-900">Travel</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Arrives
          <input
            className={inputCls}
            placeholder="22 Oct"
            value={draft.arrivalDate ?? ""}
            onChange={(e) => set({ arrivalDate: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Arrival flight / time
          <input
            className={inputCls}
            placeholder="J2 78, 14:20"
            value={draft.arrivalDetails ?? ""}
            onChange={(e) => set({ arrivalDetails: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Leaves
          <input
            className={inputCls}
            placeholder="25 Oct"
            value={draft.departureDate ?? ""}
            onChange={(e) => set({ departureDate: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Departure flight / time
          <input
            className={inputCls}
            value={draft.departureDetails ?? ""}
            onChange={(e) => set({ departureDetails: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600 sm:col-span-2">
          Hotel and room
          <input
            className={inputCls}
            placeholder="Fairmont Baku — 2 rooms, 22–25 Oct"
            value={draft.roomDetails ?? ""}
            onChange={(e) => set({ roomDetails: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600 sm:col-span-2">
          Travel notes (shown to the guest)
          <input
            className={inputCls}
            placeholder="Driver will meet you in arrivals with a sign"
            value={draft.travelNotes ?? ""}
            onChange={(e) => set({ travelNotes: e.target.value || null })}
          />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          className="h-4 w-4 accent-rose-700"
          checked={draft.needsTransfer}
          onChange={(e) => set({ needsTransfer: e.target.checked })}
        />
        Needs collecting from the airport
      </label>
    </div>
  );
}
