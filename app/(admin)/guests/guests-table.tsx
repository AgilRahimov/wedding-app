"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addParty,
  deleteParty,
  renameGroup,
  saveParty,
  setInternationalForParties,
  setProgrammeForParties,
  type PartyDraft,
} from "./actions";

export type Party = {
  id: string;
  token: string;
  name: string;
  group: string;
  side: string | null;
  phone: string | null;
  notes: string | null;
  rsvpNote: string | null;
  linkOpenedAt: string | null;
  respondedAt: string | null;
  programmeId: string | null;
  isInternational: boolean;
  arrivalDate: string | null;
  arrivalDetails: string | null;
  departureDate: string | null;
  departureDetails: string | null;
  needsTransfer: boolean;
  roomDetails: string | null;
  travelNotes: string | null;
  members: {
    id: string;
    name: string;
    rsvp: string;
    isChild: boolean;
    age: number | null;
    isPlusOne: boolean;
  }[];
};

export type ProgrammeOption = { id: string; code: string; name: string };

const RSVP_STYLE: Record<string, string> = {
  yes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  no: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

const input =
  "rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200";
const btn =
  "rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50";
const btnPrimary = `${btn} bg-rose-700 text-white hover:bg-rose-800`;
const btnGhost = `${btn} border border-stone-300 text-stone-600 hover:bg-stone-100`;

function toDraft(p: Party): PartyDraft {
  return {
    id: p.id,
    name: p.name,
    group: p.group,
    side: p.side,
    phone: p.phone,
    notes: p.notes,
    programmeId: p.programmeId,
    isInternational: p.isInternational,
    arrivalDate: p.arrivalDate,
    arrivalDetails: p.arrivalDetails,
    departureDate: p.departureDate,
    departureDetails: p.departureDetails,
    needsTransfer: p.needsTransfer,
    roomDetails: p.roomDetails,
    travelNotes: p.travelNotes,
    members: p.members.map((m) => ({
      id: m.id,
      name: m.name,
      rsvp: m.rsvp,
      isChild: m.isChild,
      age: m.age,
    })),
  };
}

export function GuestsTable({
  parties,
  programmes,
  coupleNames,
  weddingDate,
}: {
  parties: Party[];
  programmes: ProgrammeOption[];
  coupleNames: string;
  weddingDate: string;
}) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sideFilter, setSideFilter] = useState("all");
  const [rsvpFilter, setRsvpFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PartyDraft | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const programmeById = useMemo(
    () => new Map(programmes.map((p) => [p.id, p])),
    [programmes]
  );

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of parties) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [parties]);

  const sides = useMemo(
    () => [...new Set(parties.map((p) => p.side).filter(Boolean))] as string[],
    [parties]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parties.filter((p) => {
      if (groupFilter !== "all" && p.group !== groupFilter) return false;
      if (sideFilter !== "all" && p.side !== sideFilter) return false;
      if (programmeFilter === "international" && !p.isInternational) return false;
      if (
        programmeFilter !== "all" &&
        programmeFilter !== "international" &&
        p.programmeId !== programmeFilter
      )
        return false;
      if (rsvpFilter !== "all" && !p.members.some((m) => m.rsvp === rsvpFilter))
        return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.members.some((m) => m.name.toLowerCase().includes(q)) &&
        !(p.phone ?? "").includes(q)
      )
        return false;
      return true;
    });
  }, [parties, search, groupFilter, sideFilter, rsvpFilter, programmeFilter]);

  const stats = useMemo(() => {
    const members = filtered.flatMap((p) => p.members);
    return {
      parties: filtered.length,
      people: members.length,
      yes: members.filter((m) => m.rsvp === "yes").length,
      no: members.filter((m) => m.rsvp === "no").length,
      pending: members.filter((m) => m.rsvp === "pending").length,
    };
  }, [filtered]);

  function copyInvite(p: Party) {
    const link = `${window.location.origin}/invite/${p.token}`;
    const who = coupleNames || "our wedding";
    const when = weddingDate ? ` on ${weddingDate}` : "";
    const message =
      `Salam ${p.name}!\n` +
      `You are warmly invited to the wedding of ${who}${when}.\n` +
      `Your personal invitation, with the plan for your day and your table:\n${link}`;
    navigator.clipboard.writeText(message).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 2000);
    });
  }

  function open(p: Party) {
    setExpandedId(p.id);
    setDraft(toDraft(p));
  }

  function close() {
    setExpandedId(null);
    setDraft(null);
  }

  function save() {
    if (!draft) return;
    startTransition(async () => {
      try {
        await saveParty(draft);
        close();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  function removeParty(p: Party) {
    if (!confirm(`Delete "${p.name}" and all its members? This cannot be undone.`))
      return;
    startTransition(async () => {
      await deleteParty(p.id);
      close();
    });
  }

  function toggleSelected(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Guests</h1>
          <p className="text-sm text-stone-500">
            {stats.parties} parties · {stats.people} people ·{" "}
            <span className="text-emerald-700">{stats.yes} yes</span> ·{" "}
            <span className="text-rose-700">{stats.no} no</span> ·{" "}
            <span className="text-amber-700">{stats.pending} awaiting</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => setShowGroups((v) => !v)}>
            Groups
          </button>
          <a href="/guests/export" className={btnGhost}>
            Export Excel
          </a>
          <button className={btnPrimary} onClick={() => setShowAdd((v) => !v)}>
            + Add party
          </button>
        </div>
      </div>

      {showGroups && <GroupsPanel groups={groups} onDone={() => setShowGroups(false)} />}
      {showAdd && (
        <AddPartyPanel
          groups={groups.map(([g]) => g)}
          sides={sides}
          onDone={() => setShowAdd(false)}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className={`${input} w-56 max-w-full`}
        />
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className={input}
        >
          <option value="all">All groups</option>
          {groups.map(([g, n]) => (
            <option key={g} value={g}>
              {g} ({n})
            </option>
          ))}
        </select>
        <select
          value={programmeFilter}
          onChange={(e) => setProgrammeFilter(e.target.value)}
          className={input}
        >
          <option value="all">Any programme</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="international">Travelling from abroad</option>
        </select>
        {sides.length > 0 && (
          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value)}
            className={input}
          >
            <option value="all">All sides</option>
            {sides.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <select
          value={rsvpFilter}
          onChange={(e) => setRsvpFilter(e.target.value)}
          className={input}
        >
          <option value="all">Any RSVP</option>
          <option value="pending">Awaiting reply</option>
          <option value="yes">Coming</option>
          <option value="no">Not coming</option>
        </select>
        {filtered.length > 0 && (
          <button
            className={btnGhost}
            onClick={() =>
              setSelected((cur) =>
                cur.size === filtered.length
                  ? new Set()
                  : new Set(filtered.map((p) => p.id))
              )
            }
          >
            {selected.size === filtered.length ? "Clear selection" : `Select all ${filtered.length}`}
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 shadow-sm backdrop-blur">
          <span className="text-sm font-medium text-rose-900">
            {selected.size} selected
          </span>
          <select
            className={input}
            defaultValue=""
            onChange={(e) => {
              const programmeId = e.target.value;
              e.target.value = "";
              if (!programmeId) return;
              startTransition(async () => {
                await setProgrammeForParties([...selected], programmeId);
                setSelected(new Set());
              });
            }}
          >
            <option value="">Move to programme…</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.code}
              </option>
            ))}
          </select>
          <button
            className={btnGhost}
            onClick={() =>
              startTransition(async () => {
                await setInternationalForParties([...selected], true);
                setSelected(new Set());
              })
            }
          >
            Mark as travelling from abroad
          </button>
          <button
            className={btnGhost}
            onClick={() =>
              startTransition(async () => {
                await setInternationalForParties([...selected], false);
                setSelected(new Set());
              })
            }
          >
            Not from abroad
          </button>
          <button
            className="text-sm text-stone-500 hover:underline"
            onClick={() => setSelected(new Set())}
          >
            cancel
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-stone-500">
            No parties match. Clear the search or filters.
          </p>
        )}
        <ul className="divide-y divide-stone-100">
          {filtered.map((p) => {
            const programme = p.programmeId ? programmeById.get(p.programmeId) : null;
            return (
              <li key={p.id}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 shrink-0 accent-rose-700"
                    aria-label={`Select ${p.name}`}
                  />
                  <div
                    className="min-w-40 flex-1 cursor-pointer"
                    onClick={() => (expandedId === p.id ? close() : open(p))}
                  >
                    <p className="font-medium">
                      {p.name}
                      {p.isInternational && (
                        <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-normal text-sky-700">
                          ✈ abroad
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500">
                      {p.group}
                      {p.side ? ` · ${p.side}` : ""}
                      {p.phone ? ` · ${p.phone}` : ""}
                      {p.respondedAt
                        ? " · replied ✓"
                        : p.linkOpenedAt
                          ? " · opened link"
                          : ""}
                    </p>
                  </div>
                  {programme && (
                    <span
                      className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600"
                      title={programme.name}
                    >
                      {programme.code}
                    </span>
                  )}
                  <div
                    className="flex cursor-pointer flex-wrap items-center gap-1.5"
                    onClick={() => (expandedId === p.id ? close() : open(p))}
                  >
                    {p.members.map((m) => (
                      <span
                        key={m.id}
                        className={`rounded-full border px-2 py-0.5 text-xs ${RSVP_STYLE[m.rsvp] ?? RSVP_STYLE.pending}`}
                        title={`RSVP: ${m.rsvp}`}
                      >
                        {m.isChild ? "🧒 " : ""}
                        {m.name}
                      </span>
                    ))}
                  </div>
                  <button className={`${btnGhost} shrink-0`} onClick={() => copyInvite(p)}>
                    {copiedId === p.id ? "Copied ✓" : "Copy invite"}
                  </button>
                </div>

                {expandedId === p.id && draft && (
                  <EditPanel
                    draft={draft}
                    setDraft={setDraft}
                    groups={groups.map(([g]) => g)}
                    sides={sides}
                    programmes={programmes}
                    rsvpNote={p.rsvpNote}
                    token={p.token}
                    isPending={isPending}
                    onSave={save}
                    onCancel={close}
                    onDelete={() => removeParty(p)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function EditPanel({
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
            className={input}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Group
          <input
            className={input}
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
            className={input}
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
            className={input}
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
            className={input}
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
            className={input}
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

      {draft.isInternational && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
          <p className="mb-2 text-xs font-medium text-sky-900">Travel</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Arrives
              <input
                className={input}
                placeholder="22 Oct"
                value={draft.arrivalDate ?? ""}
                onChange={(e) => set({ arrivalDate: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Arrival flight / time
              <input
                className={input}
                placeholder="J2 78, 14:20"
                value={draft.arrivalDetails ?? ""}
                onChange={(e) => set({ arrivalDetails: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Leaves
              <input
                className={input}
                placeholder="25 Oct"
                value={draft.departureDate ?? ""}
                onChange={(e) => set({ departureDate: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Departure flight / time
              <input
                className={input}
                value={draft.departureDetails ?? ""}
                onChange={(e) => set({ departureDetails: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600 sm:col-span-2">
              Hotel and room
              <input
                className={input}
                placeholder="Fairmont Baku — 2 rooms, 22–25 Oct"
                value={draft.roomDetails ?? ""}
                onChange={(e) => set({ roomDetails: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600 sm:col-span-2">
              Travel notes (shown to the guest)
              <input
                className={input}
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
      )}

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
                className={`${input} w-56`}
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
                  className={`${input} w-16`}
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
    </div>
  );
}

function AddPartyPanel({
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
        <input name="name" required className={`${input} w-52`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Group
        <input name="group" list="group-options-add" className={`${input} w-40`} />
        <datalist id="group-options-add">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Side
        <input name="side" list="side-options-add" className={`${input} w-40`} />
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
        <input name="phone" className={`${input} w-36`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        +1s
        <input
          name="plusOnes"
          type="number"
          min={0}
          max={10}
          defaultValue={0}
          className={`${input} w-16`}
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

function GroupsPanel({
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
                  className={`${input} w-44`}
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
