// The paper trail: one History line per change, and — invisibly — a full
// snapshot of the database once a day, taken just before the day's first
// change, so Settings can roll everything back to a recent morning.
import { db } from "./db";
import { buildBackup } from "./backup-restore";

const KEEP_SNAPSHOTS = 14;

/** One line on the History page. Called after a change succeeds; a logging
 *  hiccup must never undo or block the family's actual edit. */
export async function logAction(who: string, summary: string) {
  try {
    await db.auditLog.create({ data: { who, summary } });
  } catch (e) {
    console.error("Could not write the history line:", e);
  }
}

/** Store today's snapshot if there isn't one yet. Runs before the first
 *  change of the day (from the admin-action auth boundary and the guest
 *  RSVP action), so the snapshot is the day's starting point. */
export async function ensureDailySnapshot() {
  try {
    const latest = await db.snapshot.findFirst({
      orderBy: { at: "desc" },
      select: { at: true },
    });
    if (latest && latest.at.toDateString() === new Date().toDateString()) return;
    const backup = await buildBackup(db);
    await db.snapshot.create({ data: { data: JSON.stringify(backup) } });
    const old = await db.snapshot.findMany({
      orderBy: { at: "desc" },
      skip: KEEP_SNAPSHOTS,
      select: { id: true },
    });
    if (old.length > 0) {
      await db.snapshot.deleteMany({ where: { id: { in: old.map((s) => s.id) } } });
    }
  } catch (e) {
    console.error("Could not take the daily snapshot:", e);
  }
}
