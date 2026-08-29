import { db } from "@/lib/db";
import { HistoryScreen } from "./history-screen";

export const dynamic = "force-dynamic";

// Who changed what: the last 500 changes, newest first. Every admin can see
// this — accountability works best when it isn't a secret.
export default async function HistoryPage() {
  const entries = await db.auditLog.findMany({
    orderBy: { at: "desc" },
    take: 500,
  });

  return (
    <HistoryScreen
      entries={entries.map((e) => ({
        id: e.id,
        at: e.at.toISOString(),
        who: e.who,
        summary: e.summary,
      }))}
    />
  );
}
