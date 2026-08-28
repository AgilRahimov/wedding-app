import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const TEST_DB_URL = "postgresql://agilrahimov@localhost:5432/wedding_test";

/**
 * Builds a fresh test database before every run: empty the wedding_test
 * schema, apply all migrations, seed (234 parties, programmes, tables),
 * then save a few real ids/tokens to fixtures.json for the tests to use.
 *
 * The wipe is deliberately hard-coded to wedding_test and refuses anything
 * else — it can never touch wedding_dev or production.
 */
export default async function globalSetup() {
  if (!TEST_DB_URL.includes("/wedding_test")) {
    throw new Error("Refusing to wipe anything but the wedding_test database");
  }

  const { PrismaClient } = await import("@prisma/client");
  const wiper = new PrismaClient({ datasourceUrl: TEST_DB_URL });
  await wiper.$executeRawUnsafe("DROP SCHEMA public CASCADE");
  await wiper.$executeRawUnsafe("CREATE SCHEMA public");
  await wiper.$disconnect();

  const env = { ...process.env, DATABASE_URL: TEST_DB_URL };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });

  const db = new PrismaClient({ datasourceUrl: TEST_DB_URL });
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
