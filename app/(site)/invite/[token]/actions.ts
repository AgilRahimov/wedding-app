"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rsvpIsClosed } from "./deadline";

// The ONLY server action reachable without an admin session.
// It authorises purely on the household's secret token and can touch
// nothing but that one household.

export type RsvpMember = {
  id: string; // existing guest id, or "new-…" for a child added by the party
  name: string;
  attending: "yes" | "no" | null;
  isChild: boolean;
  age: number | null;
};

export type RsvpResult = { ok?: string; error?: string };

export async function submitRsvp(
  token: string,
  note: string,
  members: RsvpMember[]
): Promise<RsvpResult> {
  const household = await db.household.findUnique({
    where: { token },
    include: { guests: true },
  });
  if (!household) return { error: "This invitation link is not valid." };

  const info = await db.eventInfo.findUnique({ where: { id: 1 } });
  if (info && rsvpIsClosed(info.rsvpDeadline)) {
    return {
      error: `The RSVP deadline has passed. Please contact us directly${info.contactPhone ? ` on ${info.contactPhone}` : ""}.`,
    };
  }

  const own = new Map(household.guests.map((g) => [g.id, g]));

  await db.$transaction(async (tx) => {
    // Children the party removed from the form are removed here too —
    // but only children; adults can only be edited by the family admins.
    const keptIds = new Set(members.map((m) => m.id));
    for (const g of household.guests) {
      if (g.isChild && !keptIds.has(g.id)) {
        await tx.guest.delete({ where: { id: g.id } });
      }
    }

    for (const m of members) {
      const name = m.name.trim();
      if (m.id.startsWith("new-")) {
        // Parties may add children only; adult +1s are controlled by the family.
        if (!m.isChild || !name) continue;
        await tx.guest.create({
          data: {
            householdId: household.id,
            name,
            isChild: true,
            age: m.age,
            rsvp: m.attending ?? "yes",
          },
        });
        continue;
      }

      const existing = own.get(m.id);
      if (!existing) continue; // id doesn't belong to this household — ignore

      await tx.guest.update({
        where: { id: existing.id },
        data: {
          // Unnamed "+1 of …" placeholders and children can be (re)named by the party.
          name: (existing.isPlusOne || existing.isChild) && name ? name : existing.name,
          rsvp: m.attending ?? existing.rsvp,
          age: existing.isChild ? m.age : existing.age,
        },
      });
    }

    await tx.household.update({
      where: { id: household.id },
      data: { respondedAt: new Date(), rsvpNote: note.trim() || null },
    });
  });

  revalidatePath(`/invite/${token}`);
  revalidatePath("/guests");
  revalidatePath("/dashboard");
  return { ok: "Thank you! Your reply has been saved. You can come back and change it any time." };
}
