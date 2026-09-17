-- 1 group = 1 table. The table now records which group sits at it (unique, so
-- two tables can never claim the same group), and the per-person seat record
-- goes away: a guest sits wherever their household's group's table is.
-- Nothing to carry over — no per-person seats were assigned when this landed.
ALTER TABLE "Guest" DROP CONSTRAINT "Guest_tableId_fkey";
ALTER TABLE "Guest" DROP COLUMN "tableId";

ALTER TABLE "SeatTable" ADD COLUMN "groupName" TEXT;
CREATE UNIQUE INDEX "SeatTable_groupName_key" ON "SeatTable"("groupName");
