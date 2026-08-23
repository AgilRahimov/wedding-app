"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/session";

// ---- Wedding details shown on the guest invite page ----

export async function saveEventInfo(formData: FormData) {
  await requireAdminAction();
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  await db.eventInfo.update({
    where: { id: 1 },
    data: {
      coupleNames: field("coupleNames"),
      weddingDate: field("weddingDate"),
      ceremonyTime: field("ceremonyTime"),
      venueName: field("venueName"),
      venueAddress: field("venueAddress"),
      mapUrl: field("mapUrl"),
      dressCode: field("dressCode"),
      schedule: field("schedule"),
      faq: field("faq"),
      contactPhone: field("contactPhone"),
      rsvpDeadline: field("rsvpDeadline"),
      welcomeText: field("welcomeText"),
      travelInfo: field("travelInfo"),
    },
  });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

// ---- Family admin accounts ----

export type FormState = { error?: string; ok?: string };

export async function addAdmin(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdminAction();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !name) return { error: "Name and email are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (await db.adminUser.findUnique({ where: { email } }))
    return { error: "An account with this email already exists." };

  await db.adminUser.create({
    data: { email, name, passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/settings");
  return { ok: `${name} can now sign in with ${email}.` };
}

export async function removeAdmin(adminId: string) {
  const session = await requireAdminAction();
  if (adminId === session.adminId)
    throw new Error("You cannot remove your own account.");
  // Belt and braces: never drop below one admin.
  if ((await db.adminUser.count()) <= 1)
    throw new Error("At least one admin account must remain.");
  await db.adminUser.delete({ where: { id: adminId } });
  revalidatePath("/settings");
}

export async function changePassword(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdminAction();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  if (next.length < 8)
    return { error: "New password must be at least 8 characters." };

  const admin = await db.adminUser.findUnique({ where: { id: session.adminId } });
  if (!admin || !(await bcrypt.compare(current, admin.passwordHash)))
    return { error: "Current password is wrong." };

  await db.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  return { ok: "Password changed." };
}
