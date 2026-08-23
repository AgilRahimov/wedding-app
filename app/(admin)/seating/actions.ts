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
 * Seat a whole party together — the common case, families sit together.
 * Everyone in the party is seated whatever their reply says: the room is planned
 * before the replies are in, and reconciled afterwards.
 */
export async function seatParty(householdId: string, tableId: string) {
  await requireAdminAction();
  await db.guest.updateMany({ where: { householdId }, data: { tableId } });
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

export async function addTable(name: string, capacity: number, shape: string) {
  await requireAdminAction();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Give the table a name");
  const count = await db.seatTable.count();
  await db.seatTable.create({
    data: {
      name: trimmed,
      capacity: Math.max(1, Math.min(40, Math.round(capacity) || 10)),
      shape: shape === "long" ? "long" : "round",
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

/** Save a table's position after it has been dragged around the plan. */
export async function moveTable(tableId: string, x: number, y: number) {
  await requireAdminAction();
  await db.seatTable.update({
    where: { id: tableId },
    data: { x, y },
  });
  revalidatePath("/seating");
}
