-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ProgrammeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programmeId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "location" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProgrammeItem_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'Ungrouped',
    "side" TEXT,
    "via" TEXT,
    "notes" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
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
INSERT INTO "new_Household" ("address", "arrivalDate", "arrivalDetails", "createdAt", "departureDate", "departureDetails", "email", "group", "hotelId", "id", "isInternational", "linkOpenedAt", "name", "needsTransfer", "notes", "phone", "respondedAt", "roomDetails", "rsvpNote", "side", "token", "transferNotes", "travelNotes", "updatedAt", "via") SELECT "address", "arrivalDate", "arrivalDetails", "createdAt", "departureDate", "departureDetails", "email", "group", "hotelId", "id", "isInternational", "linkOpenedAt", "name", "needsTransfer", "notes", "phone", "respondedAt", "roomDetails", "rsvpNote", "side", "token", "transferNotes", "travelNotes", "updatedAt", "via" FROM "Household";
DROP TABLE "Household";
ALTER TABLE "new_Household" RENAME TO "Household";
CREATE UNIQUE INDEX "Household_token_key" ON "Household"("token");
CREATE TABLE "new_SeatTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "x" REAL NOT NULL DEFAULT 50,
    "y" REAL NOT NULL DEFAULT 50,
    "shape" TEXT NOT NULL DEFAULT 'round'
);
INSERT INTO "new_SeatTable" ("capacity", "id", "name", "notes", "sortOrder") SELECT "capacity", "id", "name", "notes", "sortOrder" FROM "SeatTable";
DROP TABLE "SeatTable";
ALTER TABLE "new_SeatTable" RENAME TO "SeatTable";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Programme_code_key" ON "Programme"("code");
