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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const admin = await db.adminUser.findUnique({ where: { email } });
  // Same message for unknown email and wrong password — don't leak which it was.
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return { error: "Wrong email or password." };
  }

  await createSession({ adminId: admin.id, email: admin.email, name: admin.name });
  redirect("/dashboard");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
