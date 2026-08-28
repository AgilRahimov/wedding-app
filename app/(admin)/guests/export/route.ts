import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /guests/export — download the whole list as .xlsx.
// One row per person; party fields repeat so the sheet filters/sorts cleanly.
export async function GET(request: Request) {
  if (!(await getSession())) redirect("/login");

  const households = await db.household.findMany({
    include: {
      guests: {
        orderBy: [{ isPlusOne: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        include: { table: true },
      },
      programme: true,
      hotel: true,
    },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });

  const origin = new URL(request.url).origin;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Guests");

  ws.columns = [
    { header: "Group", key: "group", width: 20 },
    { header: "Side", key: "side", width: 16 },
    { header: "Party", key: "party", width: 24 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Member", key: "member", width: 24 },
    { header: "Child", key: "child", width: 7 },
    { header: "Age", key: "age", width: 5 },
    { header: "RSVP", key: "rsvp", width: 9 },
    { header: "Table", key: "table", width: 10 },
    { header: "Programme", key: "programme", width: 12 },
    { header: "Abroad", key: "abroad", width: 8 },
    { header: "Arrives", key: "arrives", width: 18 },
    { header: "Leaves", key: "leaves", width: 18 },
    { header: "Hotel / room", key: "hotel", width: 24 },
    { header: "Transfer", key: "transfer", width: 9 },
    { header: "Replied", key: "replied", width: 12 },
    { header: "Party notes", key: "notes", width: 28 },
    { header: "Message from party", key: "rsvpNote", width: 28 },
    { header: "Invite link", key: "link", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: "S1" };

  for (const h of households) {
    for (const g of h.guests) {
      ws.addRow({
        group: h.group,
        side: h.side ?? "",
        party: h.name,
        phone: h.phone ?? "",
        member: g.name,
        child: g.isChild ? "yes" : "",
        age: g.age ?? "",
        rsvp: g.rsvp,
        table: g.table?.name ?? "",
        programme: h.programme?.name ?? "",
        abroad: h.isInternational ? "yes" : "",
        arrives: [h.arrivalDate, h.arrivalDetails].filter(Boolean).join(" · "),
        leaves: [h.departureDate, h.departureDetails].filter(Boolean).join(" · "),
        hotel: [h.hotel?.name, h.roomDetails].filter(Boolean).join(" · "),
        transfer: h.needsTransfer ? "yes" : "",
        replied: h.respondedAt ? h.respondedAt.toISOString().slice(0, 10) : "",
        notes: h.notes ?? "",
        rsvpNote: h.rsvpNote ?? "",
        link: `${origin}/invite/${h.token}`,
      });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="guest-list-${stamp}.xlsx"`,
    },
  });
}
