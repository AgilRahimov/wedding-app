"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/session";

function refresh() {
  revalidatePath("/seating");
  revalidatePath("/dashboard");
}

/** Seat one person, or clear their seat when tableId is null. */
export async function assignGuest(guestId: string, tableId: string | null) {
  const session = await requireAdminAction();
  const g = await db.guest.update({
    where: { id: guestId },
    data: { tableId },
    include: { table: true },
  });
  await logAction(
    session.name,
    tableId ? `seated ${g.name} at ${g.table?.name ?? "a table"}` : `freed ${g.name}’s seat`
  );
  refresh();
}

/**
 * Seat several people at once — the common case, a whole party together.
 * Takes exact guest ids rather than a household, so it seats precisely who was
 * picked and never silently moves a party member already seated elsewhere.
 */
export async function seatGuests(guestIds: string[], tableId: string) {
  const session = await requireAdminAction();
  if (guestIds.length === 0) return;
  await db.guest.updateMany({ where: { id: { in: guestIds } }, data: { tableId } });
  const table = await db.seatTable.findUnique({ where: { id: tableId } });
  await logAction(
    session.name,
    `seated ${guestIds.length} ${guestIds.length === 1 ? "person" : "people"} at ${table?.name ?? "a table"}`
  );
  refresh();
}

/**
 * The end-of-month reconciliation: free the seats of everyone who has since said
 * no. Returns how many seats were freed so the screen can say so.
 */
export async function freeDeclinedSeats() {
  const session = await requireAdminAction();
  const { count } = await db.guest.updateMany({
    where: { rsvp: "no", tableId: { not: null } },
    data: { tableId: null },
  });
  await logAction(session.name, `freed ${count} ${count === 1 ? "seat" : "seats"} held after declining`);
  refresh();
  return count;
}

export async function clearTable(tableId: string) {
  const session = await requireAdminAction();
  const { count } = await db.guest.updateMany({ where: { tableId }, data: { tableId: null } });
  const table = await db.seatTable.findUnique({ where: { id: tableId } });
  await logAction(session.name, `emptied ${table?.name ?? "a table"} (${count} ${count === 1 ? "seat" : "seats"})`);
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
  // Guests keep their record and simply become unseated (onDelete: SetNull).
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
