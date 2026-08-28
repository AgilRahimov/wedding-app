"use client";

import { btnGhost, btnPrimary, inputCls } from "@/components/ui";
import type { ProgrammeOption } from "@/lib/party";
import type { PartyDraft } from "./actions";
import { TravelFields } from "./travel-fields";

/** The expanded editor under a party's row: household details, travel,
 *  and every member with their RSVP. Saved in one action. */
export function EditPanel({
  draft,
  setDraft,
  groups,
  sides,
  programmes,
  rsvpNote,
  token,
  isPending,
  onSave,
  onCancel,
  onDelete,
  onUngroup,
}: {
  draft: PartyDraft;
  setDraft: (d: PartyDraft) => void;
  groups: string[];
  sides: string[];
  programmes: ProgrammeOption[];
  rsvpNote: string | null;
  token: string;
  isPending: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUngroup?: () => void;
}) {
  const set = (patch: Partial<PartyDraft>) => setDraft({ ...draft, ...patch });
  const setMember = (
    i: number,
    patch: Partial<PartyDraft["members"][number]>
  ) => {
    const members = draft.members.map((m, j) => (j === i ? { ...m, ...patch } : m));
    setDraft({ ...draft, members });
  };

  return (
    <div className="border-t border-stone-100 bg-stone-50/60 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Party name
          <input
            className={inputCls}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Group
          <input
            className={inputCls}
            list="group-options"
            value={draft.group}
            onChange={(e) => set({ group: e.target.value })}
          />
          <datalist id="group-options">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Side
          <input
            className={inputCls}
            list="side-options"
            placeholder="e.g. Groom's family"
            value={draft.side ?? ""}
            onChange={(e) => set({ side: e.target.value || null })}
          />
          <datalist id="side-options">
            {sides.map((s) => (
              <option key={s} value={s} />
            ))}
            <option value="Groom's side" />
            <option value="Bride's side" />
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Phone
          <input
            className={inputCls}
            placeholder="+994 …"
            value={draft.phone ?? ""}
            onChange={(e) => set({ phone: e.target.value || null })}
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Which day do they have? (programme)
          <select
            className={inputCls}
            value={draft.programmeId ?? ""}
            onChange={(e) => set({ programmeId: e.target.value || null })}
          >
            <option value="">No programme yet</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Notes (family only — guests never see this)
          <input
            className={inputCls}
            value={draft.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value || null })}
          />
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          className="h-4 w-4 accent-rose-700"
          checked={draft.isInternational}
          onChange={(e) => set({ isInternational: e.target.checked })}
        />
        Travelling from abroad
      </label>

      {draft.isInternational && <TravelFields draft={draft} set={set} />}

      {rsvpNote && (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Message from the party: &ldquo;{rsvpNote}&rdquo;
        </p>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-stone-600">Members</p>
        <div className="flex flex-col gap-2">
          {draft.members.map((m, i) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputCls} w-56`}
                value={m.name}
                onChange={(e) => setMember(i, { name: e.target.value })}
              />
              <div className="flex overflow-hidden rounded-lg border border-stone-300">
                {(["pending", "yes", "no"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setMember(i, { rsvp: r })}
                    className={`px-2.5 py-1.5 text-xs font-medium capitalize transition ${
                      m.rsvp === r
                        ? r === "yes"
                          ? "bg-emerald-600 text-white"
                          : r === "no"
                            ? "bg-rose-600 text-white"
                            : "bg-amber-500 text-white"
                        : "bg-white text-stone-500 hover:bg-stone-100"
                    }`}
                  >
                    {r === "pending" ? "?" : r}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-stone-600">
                <input
                  type="checkbox"
                  checked={m.isChild}
                  onChange={(e) =>
                    setMember(i, {
                      isChild: e.target.checked,
                      age: e.target.checked ? m.age : null,
                    })
                  }
                />
                child
              </label>
              {m.isChild && (
                <input
                  type="number"
                  min={0}
                  max={17}
                  placeholder="age"
                  className={`${inputCls} w-16`}
                  value={m.age ?? ""}
                  onChange={(e) =>
                    setMember(i, {
                      age: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              )}
              <button
                type="button"
                className="text-xs text-rose-600 hover:underline"
                onClick={() =>
                  setDraft({
                    ...draft,
                    members: draft.members.filter((_, j) => j !== i),
                  })
                }
              >
                remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${btnGhost} mt-2`}
          onClick={() =>
            setDraft({
              ...draft,
              members: [
                ...draft.members,
                {
                  id: `new-${Date.now()}`,
                  name: "",
                  rsvp: "pending",
                  isChild: false,
                  age: null,
                },
              ],
            })
          }
        >
          + Add member
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {onUngroup && draft.group !== "Ungrouped" && (
            <button
              type="button"
              onClick={onUngroup}
              className="text-stone-600 hover:underline"
              title="Takes this party out of its group — they stay on the guest list"
            >
              Move to Ungrouped
            </button>
          )}
          <button type="button" onClick={onDelete} className="text-rose-600 hover:underline">
            Delete party
          </button>
          <a
            href={`/invite/${token}`}
            target="_blank"
            rel="noreferrer"
            className="text-stone-600 hover:underline"
          >
            Preview their invitation ↗
          </a>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={onSave}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-400">
        &ldquo;Move to Ungrouped&rdquo; only takes the party out of its group — they stay
        on the guest list. &ldquo;Delete party&rdquo; removes the party and everyone in it
        completely.
      </p>
    </div>
  );
}
