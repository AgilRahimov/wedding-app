import type { TableSide } from "@/components/venue-table";
import { db } from "@/lib/db";
import { orderGroupNames } from "@/lib/grouping";
import { requireAdmin } from "@/lib/session";
import { SeatingScreen, type SeatingData, type SeatingGroup } from "./seating-screen";

export const dynamic = "force-dynamic";

// Whose guests a group is, read from its invitations' "side": all groom's →
// "groom", all bride's → "bride", nothing filled in → null, and anything
// else (both sides together, or some invitations left blank) → "mixed".
function sideOfGroup(list: { side: string | null }[]): TableSide {
  // An empty group has no side yet — it takes one with its first invitation.
  if (list.length === 0) return null;
  const kinds = new Set(
    list.map((h) => {
      const s = (h.side ?? "").toLowerCase();
      return s.includes("bride") ? "bride" : s.includes("groom") ? "groom" : "none";
    })
  );
  if (kinds.size !== 1) return "mixed";
  const only = [...kinds][0];
  return only === "none" ? null : (only as TableSide);
}

export default async function SeatingPage() {
  const session = await requireAdmin();
  const [tables, households, info] = await Promise.all([
    db.seatTable.findMany({ orderBy: { sortOrder: "asc" } }),
    db.household.findMany({
      include: { guests: { orderBy: [{ isPlusOne: "asc" }, { id: "asc" }] } },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    db.eventInfo.findUniqueOrThrow({ where: { id: 1 } }),
  ]);

  // One entry per group, in the family's box order from the Guests screen —
  // seating works group by group, since 1 group = 1 table.
  const byGroup = new Map<string, typeof households>();
  for (const h of households) {
    const list = byGroup.get(h.group) ?? [];
    list.push(h);
    byGroup.set(h.group, list);
  }
  // Every group — the saved list includes empty ones, which can hold a table
  // (reserved) before any invitation is in them.
  const orderedNames = orderGroupNames(
    [...byGroup.keys(), ...tables.flatMap((t) => (t.groupName ? [t.groupName] : []))],
    info.groupOrder
  );

  const groups: SeatingGroup[] = orderedNames.map((name) => {
    const list = byGroup.get(name) ?? [];
    const members = list.flatMap((h) => h.guests);
    return {
      name,
      side: sideOfGroup(list),
      parties: list.map((h) => ({
        id: h.id,
        name: h.name,
        members: h.guests.map((g) => ({
          id: g.id,
          name: g.name,
          isChild: g.isChild,
          rsvp: g.rsvp,
        })),
      })),
      people: members.length,
      coming: members.filter((g) => g.rsvp !== "no").length,
      declined: members.filter((g) => g.rsvp === "no").length,
    };
  });

  const data: SeatingData = {
    tables: tables.map((t) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      x: t.x,
      y: t.y,
      shape: t.shape,
      rotation: t.rotation,
      groupName: t.groupName,
    })),
    groups,
    ungroupedPeople: (byGroup.get("Ungrouped") ?? []).reduce(
      (n, h) => n + h.guests.length,
      0
    ),
    coupleNames: info.coupleNames || "The couple",
    isOwner: session.role === "owner",
  };

  return <SeatingScreen data={data} />;
}
