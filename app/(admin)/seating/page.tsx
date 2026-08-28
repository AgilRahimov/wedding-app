import { db } from "@/lib/db";
import { SeatingScreen, type SeatingData } from "./seating-screen";

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

  const data: SeatingData = {
    tables: tables.map((t) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      x: t.x,
      y: t.y,
      shape: t.shape,
      rotation: t.rotation,
    })),
    // Everyone is seatable, not just those who have replied: the family plans the
    // room first from what they know, then reconciles against the replies later.
    guests: households.flatMap((h) =>
      h.guests.map((g) => ({
        id: g.id,
        name: g.name,
        isChild: g.isChild,
        rsvp: g.rsvp,
        tableId: g.tableId,
        householdId: h.id,
        party: h.name,
        group: h.group,
        side: h.side,
      }))
    ),
    coupleNames: info.coupleNames || "The couple",
  };

  return <SeatingScreen data={data} />;
}
