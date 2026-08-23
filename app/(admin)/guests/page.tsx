import { db } from "@/lib/db";
import { GuestsTable, type Party } from "./guests-table";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const [households, eventInfo, programmes] = await Promise.all([
    db.household.findMany({
      include: {
        guests: { orderBy: [{ isPlusOne: "asc" }, { createdAt: "asc" }, { id: "asc" }] },
      },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    }),
    db.eventInfo.findUnique({ where: { id: 1 } }),
    db.programme.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  // Pass the client only what it renders, with dates as strings.
  const parties: Party[] = households.map((h) => ({
    id: h.id,
    token: h.token,
    name: h.name,
    group: h.group,
    side: h.side,
    phone: h.phone,
    notes: h.notes,
    rsvpNote: h.rsvpNote,
    linkOpenedAt: h.linkOpenedAt?.toISOString() ?? null,
    respondedAt: h.respondedAt?.toISOString() ?? null,
    programmeId: h.programmeId,
    isInternational: h.isInternational,
    arrivalDate: h.arrivalDate,
    arrivalDetails: h.arrivalDetails,
    departureDate: h.departureDate,
    departureDetails: h.departureDetails,
    needsTransfer: h.needsTransfer,
    roomDetails: h.roomDetails,
    travelNotes: h.travelNotes,
    members: h.guests.map((g) => ({
      id: g.id,
      name: g.name,
      rsvp: g.rsvp,
      isChild: g.isChild,
      age: g.age,
      isPlusOne: g.isPlusOne,
    })),
  }));

  return (
    <GuestsTable
      parties={parties}
      programmes={programmes.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
      coupleNames={eventInfo?.coupleNames ?? ""}
      weddingDate={eventInfo?.weddingDate ?? ""}
    />
  );
}
