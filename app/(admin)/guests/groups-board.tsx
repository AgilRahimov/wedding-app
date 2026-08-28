"use client";

import { useEffect, useRef, useState } from "react";
import { RsvpDot } from "@/components/ui";
import type { PartyView } from "@/lib/party";
import { saveGroupOrder } from "./actions";

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
  expandedId: string | null;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  // The order shown while dragging, ahead of the server catching up.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const orderRef = useRef<string[] | null>(null);

  const propsOrder = orderedGroups.map(([g]) => g);
  const propsKey = propsOrder.join("|");
  useEffect(() => {
    if (!dragging) {
      setLocalOrder(null);
      orderRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsKey]);

  // The drop is caught at window level: reordering moves the dragged box in
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

  const order = localOrder ?? propsOrder;
  const totals = new Map(orderedGroups);

  const byGroup = new Map<string, PartyView[]>();
  for (const p of parties) {
    const list = byGroup.get(p.group) ?? [];
    list.push(p);
    byGroup.set(p.group, list);
  }

  function setOrder(list: string[]) {
    orderRef.current = list;
    setLocalOrder(list);
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

  function partyRow(p: PartyView) {
    const open = expandedId === p.id;
    return (
      <li key={p.id}>
        <div
          className={`flex items-center gap-2.5 px-3 py-2 ${
            open ? "bg-rose-50" : "hover:bg-stone-50"
          }`}
        >
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
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium">{g}</h3>
          <span className="shrink-0 text-xs text-stone-400">
            {list.length === total ? total : `${list.length} of ${total}`}{" "}
            {total === 1 ? "party" : "parties"}
          </span>
        </header>
        <ul className="divide-y divide-stone-100">
          {list.map(partyRow)}
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
