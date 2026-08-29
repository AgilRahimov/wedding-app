import { buildBackup } from "@/lib/backup-restore";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /settings/backup — download the whole database as one JSON file.
// This is the full snapshot of the family's work: every party and guest
// (with RSVPs, phones, travel, seats), the room, the programmes, the hotels
// and the event details. `npm run restore` can load the file into a local
// database. Family sign-in accounts are deliberately left out so password
// data never ends up in a file (a restored database recreates the standard
// admin via the seed).
export async function GET() {
  await requireOwner();

  const backup = await buildBackup(db);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 1), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="wedding-backup-${stamp}.json"`,
    },
  });
}
