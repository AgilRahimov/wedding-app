import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { applyBackup, isBackup } from "@/lib/backup-restore";
import { requireOwnerAction } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST /settings/restore — replace the database's contents with an uploaded
// backup file (made by Settings → "Download full backup"). This is how work
// done on one copy of the app (say, the laptop) is brought onto another (the
// live site) in one step. The button that calls this asks for confirmation;
// family sign-in accounts are never touched.
export async function POST(request: Request) {
  let session;
  try {
    session = await requireOwnerAction();
  } catch {
    return Response.json(
      { error: "Only the owner can restore a backup. Please sign in as the owner." },
      { status: 403 }
    );
  }

  let backup: unknown;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error();
    backup = JSON.parse(await file.text());
  } catch {
    return Response.json(
      { error: "Could not read that file — it is not a backup JSON." },
      { status: 400 }
    );
  }
  if (!isBackup(backup)) {
    return Response.json(
      { error: "That file is not a wedding-app backup." },
      { status: 400 }
    );
  }

  // One transaction: either the whole backup goes in, or nothing changes.
  const counts = await db.$transaction((tx) => applyBackup(tx, backup), {
    timeout: 60_000,
  });

  await logAction(
    session.name,
    `restored the database from a backup file${backup.exportedAt ? ` of ${String(backup.exportedAt).slice(0, 10)}` : ""}`
  );
  revalidatePath("/", "layout");
  return Response.json({ ok: true, exportedAt: backup.exportedAt ?? null, ...counts });
}
