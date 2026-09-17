"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/session";

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

export async function addTable(name: string, capacity: number, shape: string) {
  const session = await requireAdminAction();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Give the table a name");
  const count = await db.seatTable.count();
  await db.seatTable.create({
    data: {
      name: trimmed,
      capacity: Math.max(1, Math.min(40, Math.round(capacity) || 12)),
      shape: SHAPES.includes(shape) ? shape : "round",
      sortOrder: count,
      // Drops into the middle of the room; the family drags it where it belongs.
      x: 50,
      y: 50,
    },
  });
  await logAction(session.name, `added ${trimmed} to the plan`);
  refresh();
}

export async function updateTable(
  tableId: string,
  values: { name: string; capacity: number }
) {
  const session = await requireAdminAction();
  const name = values.name.trim();
  if (!name) throw new Error("Give the table a name");
  await db.seatTable.update({
    where: { id: tableId },
    data: {
      name,
      capacity: Math.max(1, Math.min(40, Math.round(values.capacity) || 10)),
    },
  });
  await logAction(session.name, `set ${name} to ${Math.max(1, Math.min(40, Math.round(values.capacity) || 10))} seats`);
  refresh();
}

export async function deleteTable(tableId: string) {
  const session = await requireAdminAction();
  // The group that sat here simply becomes unplaced; nobody is deleted.
  const t = await db.seatTable.delete({ where: { id: tableId } });
  await logAction(session.name, `deleted ${t.name} from the plan`);
  refresh();
}

/** Turn a table 45° on the plan — for the angled corner ovals, and for
 *  choosing which way a half-round table's flat side faces. */
export async function rotateTable(tableId: string) {
  await requireAdminAction();
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
