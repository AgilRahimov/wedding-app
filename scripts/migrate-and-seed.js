// Runs during the Vercel build, where the database credentials live.
// Locally it does nothing — local databases are managed with `prisma migrate dev`.
//
// 1. Applies any pending migrations (using the direct, unpooled connection,
//    which Prisma's migate engine requires on Neon).
// 2. Runs the seed — safe on every build, because seed.ts only creates what
//    is missing (admin, event info, guests, programmes, tables all skip when
//    they already exist).
const { execSync } = require("child_process");

if (!process.env.VERCEL) {
  console.log("Not on Vercel — skipping migrate/seed (local dev uses prisma migrate dev).");
  process.exit(0);
}

const direct = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!direct) {
  console.error("No DATABASE_URL on this deployment — is the Neon store connected?");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: direct };
execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
execSync("npx tsx prisma/seed.ts", { env, stdio: "inherit" });
