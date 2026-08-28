"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/session";

function refresh() {
  revalidatePath("/seating");
  revalidatePath("/dashboard");
}

/** Seat one person, or clear their seat when tableId is null. */
export async function assignGuest(guestId: string, tableId: string | null) {
  await requireAdminAction();
  await db.guest.update({ where: { id: guestId }, data: { tableId } });
  refresh();
}

/**
 * Seat several people at once — the common case, a whole party together.
 * Takes exact guest ids rather than a household, so it seats precisely who was
 * picked and never silently moves a party member already seated elsewhere.
 */
export async function seatGuests(guestIds: string[], tableId: string) {
  await requireAdminAction();
  if (guestIds.length === 0) return;
  await db.guest.updateMany({ where: { id: { in: guestIds } }, data: { tableId } });
  refresh();
}

/**
 * The end-of-month reconciliation: free the seats of everyone who has since said
 * no. Returns how many seats were freed so the screen can say so.
 */
export async function freeDeclinedSeats() {
  await requireAdminAction();
  const { count } = await db.guest.updateMany({
    where: { rsvp: "no", tableId: { not: null } },
    data: { tableId: null },
  });
  refresh();
  return count;
}

export async function clearTable(tableId: string) {
  await requireAdminAction();
  await db.guest.updateMany({ where: { tableId }, data: { tableId: null } });
  refresh();
}

const SHAPES = ["round", "half", "oval", "long"];

export async function addTable(name: string, capacity: number, shape: string) {
  await requireAdminAction();
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
  refresh();
}

export async function updateTable(
  tableId: string,
  values: { name: string; capacity: number }
) {
  await requireAdminAction();
  const name = values.name.trim();
  if (!name) throw new Error("Give the table a name");
  await db.seatTable.update({
    where: { id: tableId },
    data: {
      name,
      capacity: Math.max(1, Math.min(40, Math.round(values.capacity) || 10)),
    },
  });
  refresh();
}

export async function deleteTable(tableId: string) {
  await requireAdminAction();
  // Guests keep their record and simply become unseated (onDelete: SetNull).
  await db.seatTable.delete({ where: { id: tableId } });
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
