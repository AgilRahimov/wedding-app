"use client";

import { useEffect, useRef, useState } from "react";
import { inputCls, RsvpDot } from "@/components/ui";
import type { PartyView } from "@/lib/party";
import { renameGroup, saveGroupOrder, savePartyOrder } from "./actions";

/**
 * The boxes view of the guest list: one box per group, like the blocks of the
 * original spreadsheet — made for arranging the list on an iPad. Boxes are
 * reordered by dragging the ⠿ handle (the order is saved for everyone), and
 * parties are moved between groups by ticking them and using "Move to group".
 * "Ungrouped" is the full-width box at the bottom, always last.
 */
export function GroupsBoard({
  orderedGroups,
  ungroupedTotal,
  groupFilter,
  onGroupFilter,
  parties,
  selected,
  onToggleSelected,
  onOpen,
  onAddParty,
  expandedId,
}: {
  orderedGroups: [string, number][];
  ungroupedTotal: number;
  groupFilter: string;
  onGroupFilter: (g: string) => void;
  parties: PartyView[];
  selected: Set<string>;
  onToggleSelected: (id: string) => void;
  onOpen: (p: PartyView) => void;
  onAddParty: (group: string) => void;
  expandedId: string | null;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  // The order shown while dragging, ahead of the server catching up.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const orderRef = useRef<string[] | null>(null);
  // Renaming a group right in its box header.
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // Dragging one party up/down inside its group's box.
  const [dragParty, setDragParty] = useState<{ id: string; group: string } | null>(null);
  const [partyOrder, setPartyOrder] = useState<{ group: string; ids: string[] } | null>(null);
  const partyOrderRef = useRef<string[] | null>(null);

  const propsOrder = orderedGroups.map(([g]) => g);
  const propsKey = propsOrder.join("|");
  useEffect(() => {
    if (!dragging) {
      setLocalOrder(null);
      orderRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsKey]);

  // Drops are caught at window level: reordering moves the dragged element in
  // the DOM, which makes the browser drop its pointer capture — a pointerup
  // on the handle itself can silently never arrive.
  useEffect(() => {
    if (!dragging) return;
    const drop = () => {
      setDragging(null);
      if (orderRef.current) void saveGroupOrder(orderRef.current);
    };
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", drop);
    return () => {
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", drop);
    };
  }, [dragging]);

  useEffect(() => {
    if (!dragParty) return;
    const drop = () => {
      setDragParty(null);
      if (partyOrderRef.current) void savePartyOrder(partyOrderRef.current);
    };
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", drop);
    return () => {
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", drop);
    };
  }, [dragParty]);

  // Once the server sends back the re-sorted list, the local drag order retires.
  useEffect(() => {
    if (!dragParty) {
      setPartyOrder(null);
      partyOrderRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties]);

  const order = localOrder ?? propsOrder;
  const totals = new Map(orderedGroups);

  const byGroup = new Map<string, PartyView[]>();
  for (const p of parties) {
    const list = byGroup.get(p.group) ?? [];
    list.push(p);
    byGroup.set(p.group, list);
  }
  if (partyOrder) {
    const list = byGroup.get(partyOrder.group);
    if (list) {
      const pos = new Map(partyOrder.ids.map((id, i) => [id, i]));
      byGroup.set(
        partyOrder.group,
        [...list].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0))
      );
    }
  }

  function startPartyDrag(e: React.PointerEvent, p: PartyView) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const ids = (byGroup.get(p.group) ?? []).map((x) => x.id);
    partyOrderRef.current = ids;
    setPartyOrder({ group: p.group, ids });
    setDragParty({ id: p.id, group: p.group });
  }

  function movePartyDrag(e: React.PointerEvent, p: PartyView) {
    if (dragParty?.id !== p.id) return;
    const el = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest?.("[data-party-id]");
    const overId = el?.getAttribute("data-party-id");
    if (!overId || overId === p.id) return;
    if (el?.getAttribute("data-party-group") !== dragParty.group) return;
    const list = partyOrderRef.current ?? [];
    const to = list.indexOf(overId);
    if (to < 0) return;
    const rest = list.filter((x) => x !== p.id);
    rest.splice(to, 0, p.id);
    partyOrderRef.current = rest;
    setPartyOrder({ group: dragParty.group, ids: rest });
  }

  function setOrder(list: string[]) {
    orderRef.current = list;
    setLocalOrder(list);
  }

  function commitRename(g: string) {
    const to = editValue.trim();
    setEditing(null);
    if (!to || to === g) return;
    renameGroup(g, to)
      .then(() => {
        // Stay on the group if it was the one being viewed.
        if (groupFilter === g) onGroupFilter(to);
      })
      .catch((e) => alert(e instanceof Error ? e.message : "Could not rename"));
  }

  function startDrag(e: React.PointerEvent, g: string) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(g);
    setOrder(order);
  }

  function moveDrag(e: React.PointerEvent, g: string) {
    if (dragging !== g) return;
    const over = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest?.("[data-group-box]")
      ?.getAttribute("data-group-box");
    if (!over || over === g || over === "Ungrouped") return;
    const list = orderRef.current ?? order;
    const to = list.indexOf(over);
    if (to < 0) return;
    const rest = list.filter((x) => x !== g);
    rest.splice(to, 0, g);
    setOrder(rest);
  }

  const boxes = groupFilter === "all" ? order : order.filter((g) => g === groupFilter);
  const showUngrouped = groupFilter === "all" || groupFilter === "Ungrouped";

  function chip(label: string, value: string, count?: number) {
    const active = groupFilter === value;
    return (
      <button
        key={value}
        onClick={() => onGroupFilter(value)}
        className={`rounded-full border px-3 py-1.5 text-sm transition ${
          active
            ? "border-rose-700 bg-rose-700 text-white"
            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
        }`}
      >
        {label}
        {count !== undefined && (
          <span className={active ? "opacity-80" : "text-stone-400"}> {count}</span>
        )}
      </button>
    );
  }

  function partyRow(p: PartyView, canReorder: boolean) {
    const open = expandedId === p.id;
    const beingDragged = dragParty?.id === p.id;
    return (
      <li key={p.id}>
        <div
          data-party-id={p.id}
          data-party-group={p.group}
          className={`flex items-center gap-2.5 px-3 py-2 ${
            beingDragged ? "bg-stone-100" : open ? "bg-rose-50" : "hover:bg-stone-50"
          }`}
        >
          {canReorder && (
            <span
              onPointerDown={(e) => startPartyDrag(e, p)}
              onPointerMove={(e) => movePartyDrag(e, p)}
              title="Drag to change this party's place in the group"
              className="cursor-grab select-none text-stone-300 active:cursor-grabbing"
              style={{ touchAction: "none" }}
            >
              ⠿
            </span>
          )}
          <input
            type="checkbox"
            checked={selected.has(p.id)}
            onChange={() => onToggleSelected(p.id)}
            className="h-5 w-5 shrink-0 accent-rose-700"
            aria-label={`Select ${p.name}`}
          />
          <button onClick={() => onOpen(p)} className="min-w-0 flex-1 text-left">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {p.name}
                {p.isInternational ? " ✈" : ""}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {p.members.map((m) => (
                  <RsvpDot key={m.id} rsvp={m.rsvp} />
                ))}
              </span>
            </span>
          </button>
        </div>
      </li>
    );
  }

  function box(g: string, wide: boolean) {
    const list = byGroup.get(g) ?? [];
    const total = g === "Ungrouped" ? ungroupedTotal : (totals.get(g) ?? 0);
    const people = list.reduce((n, p) => n + p.members.length, 0);
    const isDragged = dragging === g;
    return (
      <section
        key={g}
        data-group-box={g}
        className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
          isDragged ? "border-rose-400 opacity-80 ring-2 ring-rose-300" : "border-stone-200"
        } ${wide ? "sm:col-span-2 xl:col-span-3" : ""}`}
      >
        <header className="flex items-center gap-2 border-b border-stone-100 bg-stone-50/70 px-3 py-2">
          {g !== "Ungrouped" && (
            <span
              onPointerDown={(e) => startDrag(e, g)}
              onPointerMove={(e) => moveDrag(e, g)}
              title="Drag to put this group next to its neighbours"
              className="cursor-grab select-none px-1 text-stone-400 active:cursor-grabbing"
              style={{ touchAction: "none" }}
            >
              ⠿
            </span>
          )}
          {editing === g ? (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <input
                autoFocus
                className={`${inputCls} min-w-0 flex-1`}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(g);
                  if (e.key === "Escape") setEditing(null);
                }}
              />
              <button
                className="text-sm text-emerald-700 hover:underline"
                onClick={() => commitRename(g)}
              >
                save
              </button>
              <button
                className="text-sm text-stone-500 hover:underline"
                onClick={() => setEditing(null)}
              >
                cancel
              </button>
            </span>
          ) : (
            <>
              <h3 className="min-w-0 truncate text-sm font-medium">{g}</h3>
              {g !== "Ungrouped" && (
                <button
                  title={`Rename ${g}`}
                  aria-label={`Rename ${g}`}
                  onClick={() => {
                    setEditing(g);
                    setEditValue(g);
                  }}
                  className="shrink-0 px-1 text-stone-400 hover:text-stone-600"
                >
                  ✎
                </button>
              )}
              <span className="ml-auto shrink-0 text-xs text-stone-400">
                {list.length === total ? total : `${list.length} of ${total}`}{" "}
                {total === 1 ? "party" : "parties"} ·{" "}
                <strong className="font-semibold text-stone-700">{people}</strong>{" "}
                {people === 1 ? "person" : "people"}
              </span>
            </>
          )}
        </header>
        <ul className="divide-y divide-stone-100">
          {/* Reordering needs the whole group on screen — with a search or
              filter hiding members, saved positions would come out scrambled. */}
          {list.map((p) => partyRow(p, list.length === total))}
          {list.length === 0 && (
            <li className="px-3 py-4 text-xs text-stone-400">
              {g === "Ungrouped"
                ? "Nobody here — every party has a group."
                : total === 0
                  ? "New group — tick parties anywhere and use “Move to group” to fill it."
                  : "No parties match the current search or filters."}
            </li>
          )}
        </ul>
        <button
          onClick={() => onAddParty(g)}
          className="mt-auto border-t border-stone-100 px-3 py-2 text-left text-sm text-stone-400 hover:bg-stone-50 hover:text-stone-600"
        >
          + Add party
        </button>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {chip("All groups", "all")}
        {order.map((g) => chip(g, g, totals.get(g) ?? 0))}
        {chip("Ungrouped", "Ungrouped", ungroupedTotal)}
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {boxes.map((g) => box(g, groupFilter !== "all"))}
        {showUngrouped && box("Ungrouped", true)}
      </div>
    </div>
  );
}
