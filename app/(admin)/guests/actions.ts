"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
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
  await requireAdminAction();

  if (!draft.name.trim()) throw new Error("Party name cannot be empty");
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
        group: draft.group.trim() || "Ungrouped",
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

  refresh();
}

export async function setGuestRsvp(guestId: string, rsvp: string) {
  await requireAdminAction();
  if (!RSVP_VALUES.has(rsvp)) throw new Error("Bad RSVP value");
  await db.guest.update({ where: { id: guestId }, data: { rsvp } });
  refresh();
}

/** Put a batch of parties on one programme — the only sane way to sort 234 of them. */
export async function setProgrammeForParties(
  householdIds: string[],
  programmeId: string
) {
  await requireAdminAction();
  if (householdIds.length === 0) return;
  await db.household.updateMany({
    where: { id: { in: householdIds } },
    data: { programmeId },
  });
  refresh();
}

/** Mark a batch of parties as travelling from abroad (or not). */
export async function setInternationalForParties(
  householdIds: string[],
  isInternational: boolean
) {
  await requireAdminAction();
  if (householdIds.length === 0) return;
  await db.household.updateMany({
    where: { id: { in: householdIds } },
    data: { isInternational },
  });
  refresh();
}

export async function addParty(input: {
  name: string;
  group: string;
  side: string | null;
  phone: string | null;
  plusOnes: number;
}) {
  await requireAdminAction();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const plusOnes = Math.max(0, Math.min(10, Math.floor(input.plusOnes || 0)));
  const fallback = await db.programme.findFirst({ where: { isDefault: true } });

  await db.household.create({
    data: {
      token: randomBytes(9).toString("base64url"),
      name,
      group: input.group.trim() || "Ungrouped",
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
  refresh();
}

export async function deleteParty(householdId: string) {
  await requireAdminAction();
  // Guests are removed automatically (onDelete: Cascade in the schema).
  await db.household.delete({ where: { id: householdId } });
  refresh();
}

export async function renameGroup(from: string, to: string) {
  await requireAdminAction();
  const target = to.trim();
  if (!target) throw new Error("Group name cannot be empty");
  await db.household.updateMany({
    where: { group: from },
    data: { group: target },
  });
  refresh();
}
