import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { ensureDailySnapshot } from "./audit";
import { db } from "./db";

const COOKIE = "wedding_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

export type Session = { adminId: string; email: string; name: string };

export async function createSession(s: Session) {
  const token = await new SignJWT(s)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

/** Auth boundary for admin pages: redirects to /login when not signed in. */
export async function requireAdmin(): Promise<Session & { role: string }> {
  const s = await getSession();
  if (!s) redirect("/login");
  const admin = await db.adminUser.findUnique({ where: { id: s.adminId } });
  if (!admin) redirect("/login");
  return { ...s, role: admin.role };
}

/** Auth boundary for server actions: throws instead of redirecting.
 *  Every admin change passes through here, so this is also where the
 *  day's first change triggers the daily rollback snapshot. */
export async function requireAdminAction(): Promise<Session & { role: string }> {
  const s = await getSession();
  if (!s) throw new Error("Not signed in");
  const admin = await db.adminUser.findUnique({ where: { id: s.adminId } });
  if (!admin) throw new Error("Not signed in");
  await ensureDailySnapshot();
  return { ...s, role: admin.role };
}

/** Pages only the owner (Agil) may open — Settings. Others land on the dashboard. */
export async function requireOwner(): Promise<Session & { role: string }> {
  const s = await requireAdmin();
  if (s.role !== "owner") redirect("/dashboard");
  return s;
}

/** Server actions and routes only the owner may run. */
export async function requireOwnerAction(): Promise<Session & { role: string }> {
  const s = await requireAdminAction();
  if (s.role !== "owner") throw new Error("Only the owner can do this");
  return s;
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
