import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /settings/backup — download the whole database as one JSON file.
// This is the full snapshot of the family's work: every party and guest
// (with RSVPs, phones, travel, seats), the room, the programmes, the hotels
// and the event details. `npm run restore` can load the file into a local
// database. Family sign-in accounts are deliberately left out so password
// data never ends up in a file (a restored database recreates the standard
// admin via the seed).
export async function GET() {
  if (!(await getSession())) redirect("/login");

  const [eventInfo, programmes, hotels, tables, households, activities] =
    await Promise.all([
      db.eventInfo.findUnique({ where: { id: 1 } }),
      db.programme.findMany({
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      }),
      db.hotel.findMany(),
      db.seatTable.findMany({ orderBy: { sortOrder: "asc" } }),
      db.household.findMany({
        include: { guests: { orderBy: [{ isPlusOne: "asc" }, { id: "asc" }] } },
        orderBy: [{ group: "asc" }, { name: "asc" }],
      }),
      db.activity.findMany({ include: { signups: true } }),
    ]);

  const backup = {
    format: "wedding-app-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    eventInfo,
    programmes,
    hotels,
    tables,
    households,
    activities,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 1), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="wedding-backup-${stamp}.json"`,
    },
  });
}
