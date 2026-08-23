/*
  Warnings:

  - You are about to drop the column `dietary` on the `Guest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Household" ADD COLUMN "linkOpenedAt" DATETIME;
ALTER TABLE "Household" ADD COLUMN "respondedAt" DATETIME;
ALTER TABLE "Household" ADD COLUMN "rsvpNote" TEXT;
ALTER TABLE "Household" ADD COLUMN "side" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPlusOne" BOOLEAN NOT NULL DEFAULT false,
    "rsvp" TEXT NOT NULL DEFAULT 'pending',
    "isChild" BOOLEAN NOT NULL DEFAULT false,
    "age" INTEGER,
    "notes" TEXT,
    "tableId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Guest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SeatTable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Guest" ("createdAt", "householdId", "id", "isPlusOne", "name", "notes", "rsvp", "tableId", "updatedAt") SELECT "createdAt", "householdId", "id", "isPlusOne", "name", "notes", "rsvp", "tableId", "updatedAt" FROM "Guest";
DROP TABLE "Guest";
ALTER TABLE "new_Guest" RENAME TO "Guest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
