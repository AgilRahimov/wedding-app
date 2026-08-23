import { db } from "@/lib/db";
import { ProgrammesEditor, type ProgrammeView } from "./programmes-editor";

export const dynamic = "force-dynamic";

export default async function ProgrammesPage() {
  const programmes = await db.programme.findMany({
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      _count: { select: { households: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const view: ProgrammeView[] = programmes.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    title: p.title,
    summary: p.summary ?? "",
    isDefault: p.isDefault,
    partyCount: p._count.households,
    items: p.items.map((i) => ({
      id: i.id,
      time: i.time,
      title: i.title,
      detail: i.detail ?? "",
      location: i.location ?? "",
    })),
  }));

  return <ProgrammesEditor programmes={view} />;
}
