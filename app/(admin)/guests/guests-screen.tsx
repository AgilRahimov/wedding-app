"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { btnGhost, btnPrimary, inputCls, Modal, rsvpPill } from "@/components/ui";
import type { PartyView, ProgrammeOption } from "@/lib/party";
import {
  deleteParty,
  saveParty,
  setGroupForParties,
  setInternationalForParties,
  setProgrammeForParties,
  type PartyDraft,
} from "./actions";
import { AddPartyPanel } from "./add-party-panel";
import { EditPanel } from "./edit-panel";
import { GroupsBoard } from "./groups-board";
import { GroupsPanel } from "./groups-panel";

function toDraft(p: PartyView): PartyDraft {
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

export function GuestsScreen({
  parties,
  programmes,
  coupleNames,
  weddingDate,
  savedGroupOrder,
}: {
  parties: PartyView[];
  programmes: ProgrammeOption[];
  coupleNames: string;
  weddingDate: string;
  savedGroupOrder: string;
}) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sideFilter, setSideFilter] = useState("all");
  const [rsvpFilter, setRsvpFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PartyDraft | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Which group the "Add a party" dialog pre-fills ("" = none); null = closed.
  const [addGroup, setAddGroup] = useState<string | null>(null);
  const [showGroups, setShowGroups] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Groups added on this screen that have no parties yet. They show in every
  // dropdown so parties can be moved in; once one is, the group lives in the
  // database like the rest.
  const [newGroups, setNewGroups] = useState<string[]>([]);
  // "list" is the dense working view; "boxes" shows one box per group, like
  // the spreadsheet's blocks — the view made for arranging groups on an iPad.
  // Each device remembers which view it last used.
  const [view, setView] = useState<"list" | "boxes">("list");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      if (localStorage.getItem("guestsView") === "boxes") setView("boxes");
    } catch {}
  }, []);

  function switchView(v: "list" | "boxes") {
    setView(v);
    try {
      localStorage.setItem("guestsView", v);
    } catch {}
  }

  const programmeById = useMemo(
    () => new Map(programmes.map((p) => [p.id, p])),
    [programmes]
  );

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of parties) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
    for (const g of newGroups) if (!counts.has(g)) counts.set(g, 0);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [parties, newGroups]);

  const sides = useMemo(
    () => [...new Set(parties.map((p) => p.side).filter(Boolean))] as string[],
    [parties]
  );

  // The boxes view shows groups in the family's saved order (dragged into
  // place on the board); groups not yet in the saved order follow A→Z.
  // "Ungrouped" is not a real group there — it is always the last, wide box.
  const orderedGroups = useMemo<[string, number][]>(() => {
    let saved: string[] = [];
    try {
      const parsed = JSON.parse(savedGroupOrder);
      if (Array.isArray(parsed)) saved = parsed.filter((g) => typeof g === "string");
    } catch {}
    const named = groups.filter(([g]) => g !== "Ungrouped");
    const known = new Map(named);
    const first = saved.filter((g) => known.has(g));
    const rest = named.map(([g]) => g).filter((g) => !first.includes(g));
    return [...first, ...rest].map((g) => [g, known.get(g) ?? 0]);
  }, [groups, savedGroupOrder]);

  const ungroupedTotal = useMemo(
    () => groups.find(([g]) => g === "Ungrouped")?.[1] ?? 0,
    [groups]
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

  function copyInvite(p: PartyView) {
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

  function open(p: PartyView) {
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

  // Distinct from deleting: the party stays on the guest list, just without
  // a group — it moves to the "Ungrouped" box.
  function ungroupParty() {
    if (!draft) return;
    const d = { ...draft, group: "Ungrouped" };
    startTransition(async () => {
      try {
        await saveParty(d);
        close();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not move");
      }
    });
  }

  function removeParty(p: PartyView) {
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
          <div className="flex overflow-hidden rounded-lg border border-stone-200">
            <button
              onClick={() => switchView("list")}
              className={`px-3 py-2 text-sm ${
                view === "list" ? "bg-stone-800 text-white" : "bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              List
            </button>
            <button
              onClick={() => switchView("boxes")}
              className={`px-3 py-2 text-sm ${
                view === "boxes" ? "bg-stone-800 text-white" : "bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              Boxes
            </button>
          </div>
          <button className={btnGhost} onClick={() => setShowGroups((v) => !v)}>
            Manage groups
          </button>
          <a
            href="/print"
            target="_blank"
            className={btnGhost}
            title="A paper report: dashboard, the groups, and the still-to-seat list"
          >
            Print report
          </a>
          <a href="/guests/export" className={btnGhost} title="A spreadsheet for printing or sharing — all editing happens here in the app">
            Excel
          </a>
          <button className={btnPrimary} onClick={() => setAddGroup("")}>
            + Add party
          </button>
        </div>
      </div>

      {showGroups && (
        <GroupsPanel
          groups={groups}
          onCreated={(name) => setNewGroups((cur) => [...cur, name])}
          onRemoveEmpty={(name) => setNewGroups((cur) => cur.filter((g) => g !== name))}
          onDone={() => setShowGroups(false)}
        />
      )}
      {addGroup !== null && (
        <Modal
          title={addGroup ? `Add a party to ${addGroup}` : "Add a party"}
          onClose={() => setAddGroup(null)}
        >
          <AddPartyPanel
            groups={groups.map(([g]) => g)}
            sides={sides}
            defaultGroup={addGroup}
            onDone={() => setAddGroup(null)}
          />
        </Modal>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className={`${inputCls} w-56 max-w-full`}
        />
        {view === "list" && (
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className={inputCls}
          >
            <option value="all">All groups</option>
            {groups.map(([g, n]) => (
              <option key={g} value={g}>
                {g} ({n})
              </option>
            ))}
          </select>
        )}
        <select
          value={programmeFilter}
          onChange={(e) => setProgrammeFilter(e.target.value)}
          className={inputCls}
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
            className={inputCls}
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
          className={inputCls}
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
            className={inputCls}
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
          <select
            className={inputCls}
            defaultValue=""
            onChange={(e) => {
              let group = e.target.value;
              e.target.value = "";
              if (!group) return;
              if (group === "__new__") {
                group = (prompt("Name for the new group:") ?? "").trim();
                if (!group) return;
              }
              const ids = [...selected];
              startTransition(async () => {
                await setGroupForParties(ids, group);
                setSelected(new Set());
                setNewGroups((cur) => cur.filter((g) => g !== group));
              });
            }}
          >
            <option value="">Move to group…</option>
            {groups.map(([g, n]) => (
              <option key={g} value={g}>
                {g} ({n})
              </option>
            ))}
            <option value="__new__">＋ New group…</option>
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

      {view === "boxes" && (
        <>
          {expandedId &&
            draft &&
            (() => {
              const p = parties.find((x) => x.id === expandedId);
              if (!p) return null;
              return (
                <Modal title={p.name} onClose={close}>
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
                    onUngroup={ungroupParty}
                  />
                </Modal>
              );
            })()}
          <GroupsBoard
            orderedGroups={orderedGroups}
            ungroupedTotal={ungroupedTotal}
            groupFilter={groupFilter}
            onGroupFilter={setGroupFilter}
            parties={filtered}
            selected={selected}
            onToggleSelected={toggleSelected}
            onOpen={(p) => (expandedId === p.id ? close() : open(p))}
            onAddParty={(g) => setAddGroup(g)}
            expandedId={expandedId}
          />
        </>
      )}

      {view === "list" && (
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
                        className={`rounded-full border px-2 py-0.5 text-xs ${rsvpPill[m.rsvp] ?? rsvpPill.pending}`}
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
                    onUngroup={ungroupParty}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
      )}
    </div>
  );
}
