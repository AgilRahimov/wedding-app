"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string };

export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // The family signs in with their name ("mama", "Agil" — any capitalisation)
  // or their email. If two accounts ever share a name, that name stops working
  // and those two use email — better than signing in as the wrong person.
  let admin = null;
  if (identifier.includes("@")) {
    admin = await db.adminUser.findUnique({
      where: { email: identifier.toLowerCase() },
    });
  } else if (identifier) {
    const matches = await db.adminUser.findMany({
      where: { name: { equals: identifier, mode: "insensitive" } },
    });
    if (matches.length === 1) admin = matches[0];
  }

  // Same message for unknown account and wrong password — don't leak which it was.
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return { error: "Wrong name/email or password." };
  }

  await createSession({ adminId: admin.id, email: admin.email, name: admin.name });
  redirect("/dashboard");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
