import { db } from "@/lib/db";
import { groupingRevision, orderGroupNames } from "@/lib/grouping";
import { tableNo } from "@/lib/room-layout";
import { toPartyView } from "@/lib/party";
import { GuestsScreen } from "./guests-screen";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const [households, eventInfo, programmes, tables] = await Promise.all([
    db.household.findMany({
      include: {
        guests: { orderBy: [{ isPlusOne: "asc" }, { createdAt: "asc" }, { id: "asc" }] },
      },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    db.eventInfo.findUnique({ where: { id: 1 } }),
    db.programme.findMany({ orderBy: { sortOrder: "asc" } }),
    db.seatTable.findMany({ where: { groupName: { not: null } } }),
  ]);

  // A group's number IS its table's number (1 group = 1 table, assigned on the
  // Seating screen); a group without a table shows "—".
  const tableByGroup = new Map(tables.map((t) => [t.groupName!, t.name]));
  const groupTables: Record<string, string> = {};
  for (const [g, name] of tableByGroup) groupTables[g] = tableNo(name);

  // The grouping plan's revision — same calculation the print report uses, so
  // the number on this screen always matches what a fresh printout would say.
  // Every group: the saved list (which includes empty ones), plus any found
  // on an invitation or holding a table.
  const named = orderGroupNames(
    [...households.map((h) => h.group), ...tableByGroup.keys()],
    eventInfo?.groupOrder ?? ""
  );
  const ordered = households.some((h) => h.group === "Ungrouped")
    ? [...named, "Ungrouped"]
    : named;
  const groupPlanRev = await groupingRevision(
    ordered.map((g) => ({
      name: g,
      householdIds: households.filter((h) => h.group === g).map((h) => h.id),
      table: tableByGroup.get(g) ?? null,
    }))
  );

  return (
    <GuestsScreen
      parties={households.map(toPartyView)}
      programmes={programmes.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
      coupleNames={eventInfo?.coupleNames ?? ""}
      weddingDate={eventInfo?.weddingDate ?? ""}
      savedGroupOrder={eventInfo?.groupOrder ?? ""}
      groupPlanRev={groupPlanRev}
      groupTables={groupTables}
    />
  );
}
