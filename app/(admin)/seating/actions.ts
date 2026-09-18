"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireAdminAction, requireOwnerAction } from "@/lib/session";

function refresh() {
  revalidatePath("/seating");
  revalidatePath("/dashboard");
  // Group numbers ARE table numbers, so the Guests screen shows them too.
  revalidatePath("/guests");
}

/**
 * Seat a whole group at a table — the 1-group-1-table rule. Any table the
 * group held before is freed first, and a group already at the target simply
 * becomes unplaced (it is never merged or moved somewhere else silently).
 */
export async function seatGroup(group: string, tableId: string) {
  const session = await requireAdminAction();
  const name = group.trim();
  if (!name || name === "Ungrouped") {
    throw new Error("Put these parties in a real group first — Ungrouped cannot take a table.");
  }
  const table = await db.seatTable.findUniqueOrThrow({ where: { id: tableId } });
  await db.$transaction([
    // Clear the group's previous table before setting the new one, or the
    // unique groupName constraint would (rightly) reject the move.
    db.seatTable.updateMany({ where: { groupName: name }, data: { groupName: null } }),
    db.seatTable.update({ where: { id: tableId }, data: { groupName: name } }),
  ]);
  await logAction(session.name, `seated group ${name} at ${table.name}`);
  refresh();
}

/** Free a table — its group becomes unplaced (nobody is deleted or moved). */
export async function freeTable(tableId: string) {
  const session = await requireAdminAction();
  const table = await db.seatTable.findUniqueOrThrow({ where: { id: tableId } });
  await db.seatTable.update({ where: { id: tableId }, data: { groupName: null } });
  await logAction(
    session.name,
    table.groupName ? `freed ${table.name} (group ${table.groupName} is unplaced)` : `freed ${table.name}`
  );
  refresh();
}

const SHAPES = ["round", "half", "oval", "long"];

/** Add a table to the plan. Tables carry numbers, not names, so a new one
 *  simply takes the next number — there is nothing to type or get wrong. */
export async function addTable(capacity: number, shape: string) {
  const session = await requireAdminAction();
  const existing = await db.seatTable.findMany({ select: { name: true } });
  const highest = existing.reduce((max, t) => {
    const n = Number(t.name.replace(/^Table\s+/i, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  const name = `Table ${highest + 1}`;
  await db.seatTable.create({
    data: {
      name,
      capacity: Math.max(1, Math.min(40, Math.round(capacity) || 12)),
      shape: SHAPES.includes(shape) ? shape : "round",
      sortOrder: highest + 1,
      // Drops into the middle of the room; the family drags it where it belongs.
      x: 50,
      y: 50,
    },
  });
  await logAction(session.name, `added ${name} to the plan`);
  refresh();
}

/** Squeeze in an extra chair, or take one away. */
export async function setTableSeats(tableId: string, capacity: number) {
  const session = await requireAdminAction();
  const seats = Math.max(1, Math.min(40, Math.round(capacity) || 12));
  const table = await db.seatTable.update({
    where: { id: tableId },
    data: { capacity: seats },
  });
  await logAction(session.name, `set ${table.name} to ${seats} seats`);
  refresh();
}

/** Owner only: taking a table off the plan is not an everyday action, and
 *  the server refuses it for everyone else whatever the screen shows. */
export async function deleteTable(tableId: string) {
  const session = await requireOwnerAction();
  // The group that sat here simply becomes unplaced; nobody is deleted.
  const t = await db.seatTable.delete({ where: { id: tableId } });
  await logAction(session.name, `deleted ${t.name} from the plan`);
  refresh();
}

/** Turn a table 45° on the plan — for the angled ovals, and for choosing
 *  which way a half-round table's flat side faces. Owner only, like deleting:
 *  it changes the venue's floor plan, not who sits where. */
export async function rotateTable(tableId: string) {
  await requireOwnerAction();
  const table = await db.seatTable.findUniqueOrThrow({ where: { id: tableId } });
  await db.seatTable.update({
    where: { id: tableId },
    data: { rotation: (table.rotation + 45) % 360 },
  });
  refresh();
}

/** Save a table's position after it has been dragged around the plan. */
export async function moveTable(tableId: string, x: number, y: number) {
  await requireAdminAction();
  await db.seatTable.update({
    where: { id: tableId },
    data: { x, y },
  });
  revalidatePath("/seating");
}
