import { db } from "@/lib/db";
import { toPartyView } from "@/lib/party";
import { GuestsScreen } from "./guests-screen";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const [households, eventInfo, programmes] = await Promise.all([
    db.household.findMany({
      include: {
        guests: { orderBy: [{ isPlusOne: "asc" }, { createdAt: "asc" }, { id: "asc" }] },
      },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    }),
    db.eventInfo.findUnique({ where: { id: 1 } }),
    db.programme.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <GuestsScreen
      parties={households.map(toPartyView)}
      programmes={programmes.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
      coupleNames={eventInfo?.coupleNames ?? ""}
      weddingDate={eventInfo?.weddingDate ?? ""}
    />
  );
}
