/*
  Warnings:

  - You are about to drop the column `address` on the `Household` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Household` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "coupleNames" TEXT NOT NULL DEFAULT '',
    "weddingDate" TEXT NOT NULL DEFAULT '',
    "ceremonyTime" TEXT NOT NULL DEFAULT '',
    "venueName" TEXT NOT NULL DEFAULT '',
    "venueAddress" TEXT NOT NULL DEFAULT '',
    "mapUrl" TEXT NOT NULL DEFAULT '',
    "dressCode" TEXT NOT NULL DEFAULT '',
    "schedule" TEXT NOT NULL DEFAULT '',
    "faq" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "rsvpDeadline" TEXT NOT NULL DEFAULT '',
    "welcomeText" TEXT NOT NULL DEFAULT '',
    "travelInfo" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_EventInfo" ("ceremonyTime", "contactPhone", "coupleNames", "dressCode", "faq", "id", "mapUrl", "rsvpDeadline", "schedule", "venueAddress", "venueName", "weddingDate", "welcomeText") SELECT "ceremonyTime", "contactPhone", "coupleNames", "dressCode", "faq", "id", "mapUrl", "rsvpDeadline", "schedule", "venueAddress", "venueName", "weddingDate", "welcomeText" FROM "EventInfo";
DROP TABLE "EventInfo";
ALTER TABLE "new_EventInfo" RENAME TO "EventInfo";
CREATE TABLE "new_Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'Ungrouped',
    "side" TEXT,
    "via" TEXT,
    "notes" TEXT,
    "phone" TEXT,
    "linkOpenedAt" DATETIME,
    "respondedAt" DATETIME,
    "rsvpNote" TEXT,
    "isInternational" BOOLEAN NOT NULL DEFAULT false,
    "arrivalDate" TEXT,
    "arrivalDetails" TEXT,
    "departureDate" TEXT,
    "departureDetails" TEXT,
    "needsTransfer" BOOLEAN NOT NULL DEFAULT false,
    "transferNotes" TEXT,
    "hotelId" TEXT,
    "roomDetails" TEXT,
    "travelNotes" TEXT,
    "programmeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Household_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Household_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Household" ("arrivalDate", "arrivalDetails", "createdAt", "departureDate", "departureDetails", "group", "hotelId", "id", "isInternational", "linkOpenedAt", "name", "needsTransfer", "notes", "phone", "programmeId", "respondedAt", "roomDetails", "rsvpNote", "side", "token", "transferNotes", "travelNotes", "updatedAt", "via") SELECT "arrivalDate", "arrivalDetails", "createdAt", "departureDate", "departureDetails", "group", "hotelId", "id", "isInternational", "linkOpenedAt", "name", "needsTransfer", "notes", "phone", "programmeId", "respondedAt", "roomDetails", "rsvpNote", "side", "token", "transferNotes", "travelNotes", "updatedAt", "via" FROM "Household";
DROP TABLE "Household";
ALTER TABLE "new_Household" RENAME TO "Household";
CREATE UNIQUE INDEX "Household_token_key" ON "Household"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
