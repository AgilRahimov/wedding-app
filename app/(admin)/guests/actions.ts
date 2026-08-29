"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/session";

const RSVP_VALUES = new Set(["pending", "yes", "no"]);

// Everything the edit panel can change about one party, saved in one call.
export type PartyDraft = {
  id: string;
  name: string;
  group: string;
  side: string | null;
  phone: string | null;
  notes: string | null;
  programmeId: string | null;
  isInternational: boolean;
  arrivalDate: string | null;
  arrivalDetails: string | null;
  departureDate: string | null;
  departureDetails: string | null;
  needsTransfer: boolean;
  roomDetails: string | null;
  travelNotes: string | null;
  members: {
    id: string; // existing guest id, or "new-…" for members added in the UI
    name: string;
    rsvp: string;
    isChild: boolean;
    age: number | null;
  }[];
};

function refresh() {
  revalidatePath("/guests");
  revalidatePath("/dashboard");
  revalidatePath("/seating");
}

export async function saveParty(draft: PartyDraft) {
  const session = await requireAdminAction();

  if (!draft.name.trim()) throw new Error("Party name cannot be empty");
  const group = draft.group.trim() || "Ungrouped";
  // Moving to a different group? The party joins that box at the bottom.
  const current = await db.household.findUniqueOrThrow({
    where: { id: draft.id },
    select: { group: true },
  });
  const sortOrder = current.group === group ? undefined : await bottomOfGroup(group);
  const members = draft.members
    .map((m) => ({
      ...m,
      name: m.name.trim(),
      rsvp: RSVP_VALUES.has(m.rsvp) ? m.rsvp : "pending",
      age: m.isChild ? m.age : null,
    }))
    .filter((m) => m.name !== "");
  if (members.length === 0) throw new Error("A party needs at least one member");

  await db.$transaction(async (tx) => {
    await tx.household.update({
      where: { id: draft.id },
      data: {
        name: draft.name.trim(),
        group,
        sortOrder,
        side: draft.side?.trim() || null,
        phone: draft.phone?.trim() || null,
        notes: draft.notes?.trim() || null,
        programmeId: draft.programmeId || null,
        isInternational: draft.isInternational,
        arrivalDate: draft.arrivalDate?.trim() || null,
        arrivalDetails: draft.arrivalDetails?.trim() || null,
        departureDate: draft.departureDate?.trim() || null,
        departureDetails: draft.departureDetails?.trim() || null,
        needsTransfer: draft.needsTransfer,
        roomDetails: draft.roomDetails?.trim() || null,
        travelNotes: draft.travelNotes?.trim() || null,
      },
    });

    const keepIds = members.filter((m) => !m.id.startsWith("new-")).map((m) => m.id);
    await tx.guest.deleteMany({
      where: { householdId: draft.id, id: { notIn: keepIds } },
    });

    for (const m of members) {
      const data = {
        name: m.name,
        rsvp: m.rsvp,
        isChild: m.isChild,
        age: m.age,
      };
      if (m.id.startsWith("new-")) {
        await tx.guest.create({
          data: { ...data, householdId: draft.id, isPlusOne: true },
        });
      } else {
        // Guard with householdId so one party's save can never touch another party's guests.
        await tx.guest.update({
          where: { id: m.id, householdId: draft.id },
          data,
        });
      }
    }
  });

  await logAction(session.name, `edited party “${draft.name.trim()}” (${members.length} ${members.length === 1 ? "person" : "people"}, group ${group})`);
  refresh();
}

export async function setGuestRsvp(guestId: string, rsvp: string) {
  const session = await requireAdminAction();
  if (!RSVP_VALUES.has(rsvp)) throw new Error("Bad RSVP value");
  const g = await db.guest.update({ where: { id: guestId }, data: { rsvp } });
  await logAction(session.name, `set ${g.name}’s reply to “${rsvp}”`);
  refresh();
}

/** A party arriving in a group joins at the bottom of its box, after
 *  whatever hand-arranged order is already there. */
async function bottomOfGroup(group: string) {
  const last = await db.household.findFirst({
    where: { group },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

/** Put a batch of parties on one programme — the only sane way to sort 234 of them. */
export async function setProgrammeForParties(
  householdIds: string[],
  programmeId: string
) {
  const session = await requireAdminAction();
  if (householdIds.length === 0) return;
  await db.household.updateMany({
    where: { id: { in: householdIds } },
    data: { programmeId },
  });
  const prog = await db.programme.findUnique({ where: { id: programmeId } });
  await logAction(
    session.name,
    `put ${householdIds.length} ${householdIds.length === 1 ? "party" : "parties"} on programme ${prog?.name ?? "?"}`
  );
  refresh();
}

/** Mark a batch of parties as travelling from abroad (or not). */
export async function setInternationalForParties(
  householdIds: string[],
  isInternational: boolean
) {
  const session = await requireAdminAction();
  if (householdIds.length === 0) return;
  await db.household.updateMany({
    where: { id: { in: householdIds } },
    data: { isInternational },
  });
  await logAction(
    session.name,
    `marked ${householdIds.length} ${householdIds.length === 1 ? "party" : "parties"} as ${isInternational ? "travelling from abroad" : "not from abroad"}`
  );
  refresh();
}

export async function addParty(input: {
  name: string;
  group: string;
  side: string | null;
  phone: string | null;
  plusOnes: number;
}) {
  const session = await requireAdminAction();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const plusOnes = Math.max(0, Math.min(10, Math.floor(input.plusOnes || 0)));
  const fallback = await db.programme.findFirst({ where: { isDefault: true } });
  const group = input.group.trim() || "Ungrouped";

  await db.household.create({
    data: {
      token: randomBytes(9).toString("base64url"),
      name,
      group,
      sortOrder: await bottomOfGroup(group),
      side: input.side?.trim() || null,
      phone: input.phone?.trim() || null,
      programmeId: fallback?.id ?? null,
      guests: {
        create: [
          { name, isPlusOne: false },
          ...Array.from({ length: plusOnes }, (_, i) => ({
            name: plusOnes === 1 ? `+1 of ${name}` : `+1 #${i + 1} of ${name}`,
            isPlusOne: true,
          })),
        ],
      },
    },
  });
  await logAction(session.name, `added party “${name}” (${1 + plusOnes} ${plusOnes === 0 ? "person" : "people"}, group ${group})`);
  refresh();
}

export async function deleteParty(householdId: string) {
  const session = await requireAdminAction();
  // Guests are removed automatically (onDelete: Cascade in the schema).
  const h = await db.household.delete({
    where: { id: householdId },
    include: { guests: { select: { id: true } } },
  });
  await logAction(
    session.name,
    `deleted party “${h.name}” and its ${h.guests.length} ${h.guests.length === 1 ? "guest" : "guests"}`
  );
  refresh();
}

/** Move whole parties into a group — also how a brand-new group gets its
 *  first members (groups are just names on parties; an empty one isn't stored). */
export async function setGroupForParties(householdIds: string[], group: string) {
  const session = await requireAdminAction();
  const name = group.trim();
  if (!name) throw new Error("Give the group a name");
  if (householdIds.length === 0) return;
  await db.household.updateMany({
    where: { id: { in: householdIds } },
    // All arrive at the bottom of the box together (A→Z among themselves).
    data: { group: name, sortOrder: await bottomOfGroup(name) },
  });
  await logAction(
    session.name,
    `moved ${householdIds.length} ${householdIds.length === 1 ? "party" : "parties"} to group ${name}`
  );
  refresh();
}

/** Remove a group: its parties go to "Ungrouped" (nobody is deleted). */
export async function deleteGroup(name: string) {
  const session = await requireAdminAction();
  const { count } = await db.household.updateMany({
    where: { group: name },
    data: { group: "Ungrouped", sortOrder: await bottomOfGroup("Ungrouped") },
  });
  await editGroupOrder((order) => order.filter((g) => g !== name));
  await logAction(session.name, `deleted group ${name} (${count} ${count === 1 ? "party" : "parties"} moved to Ungrouped)`);
  refresh();
  return count;
}

export async function renameGroup(from: string, to: string) {
  const session = await requireAdminAction();
  const target = to.trim();
  if (!target) throw new Error("Group name cannot be empty");
  await db.household.updateMany({
    where: { group: from },
    data: { group: target },
  });
  await editGroupOrder((order) => order.map((g) => (g === from ? target : g)));
  await logAction(session.name, `renamed group ${from} to ${target}`);
  refresh();
}

/** Remember how the family arranged the parties inside one group's box:
 *  the given households get positions 0, 1, 2… in that order. */
export async function savePartyOrder(householdIds: string[]) {
  const session = await requireAdminAction();
  await db.$transaction(
    householdIds.map((id, i) =>
      db.household.update({ where: { id }, data: { sortOrder: i } })
    )
  );
  const first = await db.household.findUnique({ where: { id: householdIds[0] } });
  await logAction(session.name, `rearranged the parties in group ${first?.group ?? "?"}`);
  refresh();
}

/** Remember how the family arranged the group boxes on the Guests screen. */
export async function saveGroupOrder(order: string[]) {
  const session = await requireAdminAction();
  await db.eventInfo.update({
    where: { id: 1 },
    data: { groupOrder: JSON.stringify(order) },
  });
  await logAction(session.name, "rearranged the group boxes");
  refresh();
}

// The saved box ordering lives in EventInfo as a JSON list of group names;
// renames and deletions keep it in step so boxes don't jump around.
async function editGroupOrder(change: (order: string[]) => string[]) {
  const info = await db.eventInfo.findUnique({ where: { id: 1 } });
  if (!info?.groupOrder) return;
  try {
    const order = JSON.parse(info.groupOrder);
    if (!Array.isArray(order)) return;
    await db.eventInfo.update({
      where: { id: 1 },
      data: { groupOrder: JSON.stringify(change(order)) },
    });
  } catch {
    // A malformed saved order is ignored rather than breaking group edits.
  }
}
