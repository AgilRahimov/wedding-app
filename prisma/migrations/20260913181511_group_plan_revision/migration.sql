-- AlterTable
ALTER TABLE "EventInfo" ADD COLUMN     "groupPlanHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "groupPlanRev" INTEGER NOT NULL DEFAULT 1;
