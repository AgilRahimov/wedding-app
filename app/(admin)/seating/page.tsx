import { db } from "@/lib/db";
import { orderGroupNames } from "@/lib/grouping";
import { SeatingScreen, type SeatingData, type SeatingGroup } from "./seating-screen";

export const dynamic = "force-dynamic";

export default async function SeatingPage() {
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
  const orderedNames = orderGroupNames(
    [...byGroup.keys()].filter((g) => g !== "Ungrouped"),
    info.groupOrder
  );

  const groups: SeatingGroup[] = orderedNames.map((name) => {
    const list = byGroup.get(name) ?? [];
    const members = list.flatMap((h) => h.guests);
    return {
      name,
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
  };

  return <SeatingScreen data={data} />;
}
