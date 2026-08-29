"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/audit";
import { applyBackup, buildBackup, isBackup } from "@/lib/backup-restore";
import { db } from "@/lib/db";
import { requireOwnerAction } from "@/lib/session";

// ---- Wedding details shown on the guest invite page ----

export async function saveEventInfo(formData: FormData) {
  const session = await requireOwnerAction();
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
  await logAction(session.name, "updated the wedding details");
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

// ---- Family admin accounts ----

export type FormState = { error?: string; ok?: string };

export async function addAdmin(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireOwnerAction();
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
  await logAction(session.name, `gave ${name} a family sign-in (${email})`);
  revalidatePath("/settings");
  return { ok: `${name} can now sign in with ${email}.` };
}

export async function removeAdmin(adminId: string) {
  const session = await requireOwnerAction();
  if (adminId === session.adminId)
    throw new Error("You cannot remove your own account.");
  // Belt and braces: never drop below one admin.
  if ((await db.adminUser.count()) <= 1)
    throw new Error("At least one admin account must remain.");
  const removed = await db.adminUser.delete({ where: { id: adminId } });
  await logAction(session.name, `removed ${removed.name}’s sign-in`);
  revalidatePath("/settings");
}

export async function changePassword(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireOwnerAction();
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
  await logAction(session.name, "changed their password");
  return { ok: "Password changed." };
}

// ---- Rolling back to a daily snapshot ----

/** Replace everything with the chosen snapshot — the wholesale "undo". */
export async function restoreSnapshot(snapshotId: string) {
  const session = await requireOwnerAction();
  const snap = await db.snapshot.findUniqueOrThrow({ where: { id: snapshotId } });
  const backup = JSON.parse(snap.data);
  if (!isBackup(backup)) throw new Error("This snapshot cannot be read.");
  await db.$transaction((tx) => applyBackup(tx, backup), { timeout: 60_000 });
  await logAction(
    session.name,
    `rolled the database back to the snapshot of ${snap.at.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    })}`
  );
  revalidatePath("/", "layout");
}

/** An extra safety point before doing something big. */
export async function takeSnapshotNow() {
  const session = await requireOwnerAction();
  const backup = await buildBackup(db);
  await db.snapshot.create({ data: { data: JSON.stringify(backup) } });
  await logAction(session.name, "took a snapshot of the database");
  revalidatePath("/settings");
}
