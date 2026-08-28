// Load a backup file (downloaded from Settings → "Download full backup") into
// the database this machine's DATABASE_URL points at, replacing what is there.
//
//   npm run restore -- ~/Downloads/wedding-backup-2026-08-29.json
//
// Meant for the laptop: it refuses to run against anything but a local
// database (the live site has its own "Restore from a backup file" button in
// Settings). Family sign-in accounts are not in backups and are left
// untouched; run `npm run db:seed` afterwards if the standard admin is missing.
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { applyBackup, isBackup } from "../lib/backup-restore";

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("localhost") && !url.includes("127.0.0.1")) {
  console.error("Refusing to restore: DATABASE_URL is not a local database.");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run restore -- <path-to-wedding-backup.json>");
  process.exit(1);
}

const parsed: unknown = JSON.parse(fs.readFileSync(path.resolve(file), "utf-8"));
if (!isBackup(parsed)) {
  console.error("This file does not look like a wedding-app backup.");
  process.exit(1);
}
const backup = parsed;

const prisma = new PrismaClient();

async function main() {
  console.log(`Restoring backup from ${backup.exportedAt ?? "unknown date"} into ${url}…`);
  const n = await applyBackup(prisma, backup);
  console.log(
    `Restored ${n.parties} parties / ${n.guests} guests, ${n.tables} tables, ` +
      `${n.programmes} programmes, ${n.hotels} hotels.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
