import { db } from "@/lib/db";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

// The paper report: sheet 1 is the dashboard, then the groups (a few per A4
// sheet, in the family's box order), then the still-to-seat list on its own
// sheet. Made to be read by Agil's father — large type, plain black on white,
// declined guests struck through. Print with the button, or ⌘P.

type Member = {
  id: string;
  name: string;
  rsvp: string;
  isChild: boolean;
  isPlusOne: boolean;
  tableId: string | null;
};
type Party = { id: string; name: string; group: string; members: Member[] };

function orderGroups(names: string[], savedJson: string): string[] {
  let saved: string[] = [];
  try {
    const parsed = JSON.parse(savedJson);
    if (Array.isArray(parsed)) saved = parsed.filter((g) => typeof g === "string");
  } catch {}
  const known = new Set(names);
  const first = saved.filter((g) => known.has(g));
  const rest = names.filter((g) => !first.includes(g)).sort((a, b) => a.localeCompare(b));
  return [...first, ...rest];
}

// The companions worth printing by name: renamed +1s, children, spouses —
// not the imported "+1 of …" placeholders, which the seat count already covers.
function namedCompanions(p: Party) {
  return p.members.filter((m) => m.name !== p.name && !m.name.startsWith("+1 "));
}

export default async function PrintPage() {
  const [households, info, tables] = await Promise.all([
    db.household.findMany({
      include: { guests: { orderBy: [{ isPlusOne: "asc" }, { id: "asc" }] } },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    db.eventInfo.findUniqueOrThrow({ where: { id: 1 } }),
    db.seatTable.findMany(),
  ]);

  const parties: Party[] = households.map((h) => ({
    id: h.id,
    name: h.name,
    group: h.group,
    members: h.guests.map((g) => ({
      id: g.id,
      name: g.name,
      rsvp: g.rsvp,
      isChild: g.isChild,
      isPlusOne: g.isPlusOne,
      tableId: g.tableId,
    })),
  }));

  const everyone = parties.flatMap((p) => p.members);
  const stats = {
    parties: parties.length,
    people: everyone.length,
    yes: everyone.filter((m) => m.rsvp === "yes").length,
    no: everyone.filter((m) => m.rsvp === "no").length,
    pending: everyone.filter((m) => m.rsvp === "pending").length,
    seated: everyone.filter((m) => m.tableId).length,
    seats: tables.reduce((n, t) => n + t.capacity, 0),
  };

  const byGroup = new Map<string, Party[]>();
  for (const p of parties) {
    const list = byGroup.get(p.group) ?? [];
    list.push(p);
    byGroup.set(p.group, list);
  }
  const groupNames = orderGroups(
    [...byGroup.keys()].filter((g) => g !== "Ungrouped"),
    info.groupOrder
  );
  if (byGroup.has("Ungrouped")) groupNames.push("Ungrouped");

  // Still to seat: parties with at least one not-declined member without a seat.
  const toSeat = groupNames
    .map((g) => ({
      group: g,
      parties: (byGroup.get(g) ?? [])
        .map((p) => ({
          name: p.name,
          count: p.members.filter((m) => m.rsvp !== "no" && !m.tableId).length,
        }))
        .filter((p) => p.count > 0),
    }))
    .filter((g) => g.parties.length > 0);
  const toSeatTotal = toSeat.reduce(
    (n, g) => n + g.parties.reduce((m, p) => m + p.count, 0),
    0
  );

  const printedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const statCells: [string, string][] = [
    ["Parties invited", String(stats.parties)],
    ["People invited", String(stats.people)],
    ["Coming", String(stats.yes)],
    ["Awaiting reply", String(stats.pending)],
    ["Declined", String(stats.no)],
    ["Seated", `${stats.seated} of ${stats.seats} seats`],
  ];

  return (
    <div className="mx-auto max-w-4xl text-stone-900">
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>

      <div className="mb-5 flex items-center justify-between print:hidden">
        <p className="text-sm text-stone-500">
          This page is made for paper — print it, or save it as a PDF to share.
        </p>
        <PrintButton />
      </div>

      {/* Sheet 1 — the dashboard */}
      <section style={{ breakAfter: "page" }}>
        <h1 style={{ fontSize: "26pt", fontWeight: 600, letterSpacing: "-0.02em" }}>
          {info.coupleNames || "Our wedding"} — guest list
        </h1>
        <p style={{ fontSize: "13pt" }} className="mt-1 text-stone-600">
          {[info.weddingDate, info.ceremonyTime, info.venueName].filter(Boolean).join(" · ")}
          {" — printed "}
          {printedOn}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {statCells.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-stone-300 p-4">
              <p style={{ fontSize: "11pt" }} className="text-stone-500">
                {label}
              </p>
              <p style={{ fontSize: "22pt", fontWeight: 600 }}>{value}</p>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: "15pt", fontWeight: 600 }} className="mt-10">
          Groups
        </h2>
        <div className="mt-3" style={{ columnCount: 2, columnGap: "10mm" }}>
          {groupNames.map((g) => {
            const list = byGroup.get(g) ?? [];
            const people = list.reduce((n, p) => n + p.members.length, 0);
            return (
              <p
                key={g}
                style={{ fontSize: "12pt", breakInside: "avoid" }}
                className="flex justify-between gap-3 border-b border-stone-200 py-1"
              >
                <span>{g}</span>
                <span className="whitespace-nowrap text-stone-500">
                  {list.length} · <strong className="text-stone-900">{people}</strong>
                </span>
              </p>
            );
          })}
        </div>
      </section>

      {/* The groups, box by box */}
      <section style={{ columnCount: 2, columnGap: "10mm" }}>
        {groupNames.map((g) => {
          const list = byGroup.get(g) ?? [];
          const people = list.reduce((n, p) => n + p.members.length, 0);
          return (
            <div
              key={g}
              style={{ breakInside: "avoid" }}
              className="mb-6 overflow-hidden rounded-xl border border-stone-400"
            >
              <div className="flex items-baseline justify-between gap-2 border-b border-stone-400 bg-stone-100 px-3 py-1.5">
                <h3 style={{ fontSize: "14pt", fontWeight: 600 }}>{g}</h3>
                <span style={{ fontSize: "10pt" }} className="whitespace-nowrap text-stone-600">
                  {list.length} parties · {people} people
                </span>
              </div>
              {list.map((p) => {
                const allDeclined =
                  p.members.length > 0 && p.members.every((m) => m.rsvp === "no");
                const coming = p.members.filter((m) => m.rsvp !== "no").length;
                const companions = namedCompanions(p);
                return (
                  <div key={p.id} className="border-b border-stone-200 px-3 py-1 last:border-b-0">
                    <p
                      style={{ fontSize: "12.5pt" }}
                      className={`flex justify-between gap-2 ${
                        allDeclined ? "text-stone-400 line-through" : ""
                      }`}
                    >
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span className="whitespace-nowrap">{allDeclined ? 0 : coming}</span>
                    </p>
                    {companions.length > 0 && (
                      <p style={{ fontSize: "10.5pt" }} className="text-stone-600">
                        {companions
                          .map(
                            (m) =>
                              `${m.isChild ? "🧒 " : ""}${m.name}${m.rsvp === "no" ? " ✗" : ""}`
                          )
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                );
              })}
              {list.length === 0 && (
                <p style={{ fontSize: "11pt" }} className="px-3 py-2 text-stone-500">
                  Nobody here.
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Still to seat, on its own sheet */}
      <section style={{ breakBefore: "page" }}>
        <h2 style={{ fontSize: "18pt", fontWeight: 600 }}>
          Still to seat — {toSeatTotal} people
        </h2>
        <p style={{ fontSize: "11pt" }} className="mt-1 text-stone-600">
          Everyone below is expected (or still to reply) and has no table yet. People who
          declined are not counted.
        </p>
        {toSeatTotal === 0 ? (
          <p style={{ fontSize: "13pt" }} className="mt-6">
            Everyone has a seat. 🎉
          </p>
        ) : (
          <div className="mt-4" style={{ columnCount: 2, columnGap: "10mm" }}>
            {toSeat.map((g) => (
              <div key={g.group} style={{ breakInside: "avoid" }} className="mb-4">
                <h3
                  style={{ fontSize: "12pt", fontWeight: 600 }}
                  className="border-b border-stone-400 pb-0.5"
                >
                  {g.group}
                </h3>
                {g.parties.map((p) => (
                  <p
                    key={p.name}
                    style={{ fontSize: "12pt" }}
                    className="flex justify-between gap-2 border-b border-stone-200 py-0.5"
                  >
                    <span>{p.name}</span>
                    <span>{p.count}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
