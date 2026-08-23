import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Builds a fresh test database before every run:
 * wipe → apply migrations → seed (234 parties, programmes, tables),
 * then save a few real ids/tokens to fixtures.json for the tests to use.
 */
export default async function globalSetup() {
  const dbFile = path.join(__dirname, "..", "prisma", "test.db");
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);

  const env = { ...process.env, DATABASE_URL: "file:./test.db" };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const household = await db.household.findFirstOrThrow({
    include: { guests: true },
    orderBy: { name: "asc" },
  });
  const guestCount = await db.guest.count();
  const partyCount = await db.household.count();
  await db.$disconnect();

  fs.writeFileSync(
    path.join(__dirname, "fixtures.json"),
    JSON.stringify(
      {
        token: household.token,
        partyName: household.name,
        memberId: household.guests[0].id,
        householdId: household.id,
        guestCount,
        partyCount,
      },
      null,
      2
    )
  );
}
