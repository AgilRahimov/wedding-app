import { defineConfig } from "@playwright/test";

/**
 * The smoke suite runs against ITS OWN database (wedding_test on the local
 * Postgres) and its own build dir (.next-test) on port 3100 — it never touches
 * the real guest data or collides with `npm run dev`. global-setup.ts resets
 * and seeds that database from scratch on every run.
 */
const TEST_ENV = {
  DATABASE_URL: "postgresql://agilrahimov@localhost:5432/wedding_test",
  NEXT_DIST_DIR: ".next-test",
};

// Make the same DB visible to globalSetup and to tests that check it directly.
Object.assign(process.env, TEST_ENV);

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  timeout: 30_000,
  retries: 0,
  // The suite mutates one shared database — run files one at a time.
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next dev -p 3100",
    port: 3100,
    env: TEST_ENV,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
