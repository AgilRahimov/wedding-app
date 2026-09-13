import { db } from "@/lib/db";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

// The paper report: sheet 1 is the dashboard, then the groups, a few per A4
// sheet in the family's box order. Made to be read by Agil's father — large
// type, plain black on white, declined guests struck through. Print with the
// button, or ⌘P.
//
// Pagination is decided HERE, not by the browser: browsers cut multi-column
// content at page edges no matter what "keep together" asks, so this page
// packs whole groups onto explicit sheets itself (see packSheets). A group is
// never split across pages.

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

// Printed heights, estimated in millimetres on A4. In a half-sheet column
// (~89mm wide) long names and companion lists wrap; a full-width box wraps
// half as often. The estimate was calibrated against the real report and
// leans tall — packing a sheet loosely costs a page, overflowing ruins one.
function partyMm(p: Party, nameChars: number, companionChars: number) {
  const nameLines = Math.max(1, Math.ceil(p.name.length / nameChars));
  const companionText = namedCompanions(p)
    .map((m) => m.name)
    .join(" · ");
  const companionLines = companionText ? Math.ceil(companionText.length / companionChars) : 0;
  return nameLines * 9 + companionLines * 5;
}

// Header, borders and the gap below a box.
const BOX_CHROME_MM = 20;

function groupMm(list: Party[], nameChars = 22, companionChars = 30) {
  if (list.length === 0) return BOX_CHROME_MM + 10;
  return BOX_CHROME_MM + list.reduce((n, p) => n + partyMm(p, nameChars, companionChars), 0);
}

// What one column of an A4 sheet can safely hold (~273mm printable).
const COLUMN_MM = 235;

type Sheet =
  | { kind: "columns"; left: string[]; right: string[] }
  // A group too tall for a column gets a full-width sheet of its own —
  // still one page, never split.
  | { kind: "full"; group: string };

// Pack whole groups onto sheets, strictly in the given order: fill the left
// column top-down, then the right, then start a new sheet.
function packSheets(names: string[], heightOf: (g: string) => number): Sheet[] {
  const sheets: Sheet[] = [];
  let left: string[] = [];
  let right: string[] = [];
  let leftMm = 0;
  let rightMm = 0;
  let fillingLeft = true;
  const flush = () => {
    if (left.length > 0 || right.length > 0) sheets.push({ kind: "columns", left, right });
    left = [];
    right = [];
    leftMm = 0;
    rightMm = 0;
    fillingLeft = true;
  };
  for (const g of names) {
    const h = heightOf(g);
    if (h > COLUMN_MM) {
      flush();
      sheets.push({ kind: "full", group: g });
      continue;
    }
    if (fillingLeft && leftMm + h <= COLUMN_MM) {
      left.push(g);
      leftMm += h;
    } else if (rightMm + h <= COLUMN_MM) {
      fillingLeft = false;
      right.push(g);
      rightMm += h;
    } else {
      flush();
      left.push(g);
      leftMm = h;
    }
  }
  flush();
  return sheets;
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

  // How many groups there are of each size — the family matches groups to
  // tables of 12 and 18, so "five groups of 12" is the number they think in.
  const sizeCounts = new Map<number, number>();
  for (const g of groupNames) {
    const people = (byGroup.get(g) ?? []).reduce((n, p) => n + p.members.length, 0);
    sizeCounts.set(people, (sizeCounts.get(people) ?? 0) + 1);
  }
  const sizeRows = [...sizeCounts.entries()].sort((a, b) => b[0] - a[0]);

  const sheets = packSheets(groupNames, (g) => groupMm(byGroup.get(g) ?? []));

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

        <h2 style={{ fontSize: "15pt", fontWeight: 600 }} className="mt-10">
          Group sizes
        </h2>
        <p style={{ fontSize: "10.5pt" }} className="mt-1 text-stone-600">
          How many groups there are of each size — for matching groups to tables of 12
          and 18.
        </p>
        <div className="mt-3" style={{ columnCount: 3, columnGap: "10mm" }}>
          {sizeRows.map(([size, count]) => (
            <p
              key={size}
              style={{ fontSize: "12pt", breakInside: "avoid" }}
              className="flex justify-between gap-3 border-b border-stone-200 py-1"
            >
              <span>
                {size} {size === 1 ? "person" : "people"}
              </span>
              <span className="whitespace-nowrap text-stone-500">
                <strong className="text-stone-900">{count}</strong>{" "}
                {count === 1 ? "group" : "groups"}
              </span>
            </p>
          ))}
        </div>
      </section>

      {/* The group sheets. Each <section> is exactly one piece of A4; whole
          groups were packed into its two columns by packSheets, so the browser
          never has to make a page-break decision inside a group. */}
      {sheets.map((sheet, si) => {
        const groupBox = (g: string) => {
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
        };

        if (sheet.kind === "full") {
          // Wider than a column, so it wraps less; if the estimate still says
          // it cannot fit one sheet, shrink the whole box just enough.
          const fullMm = groupMm(byGroup.get(sheet.group) ?? [], 48, 64);
          const zoom = fullMm > 260 ? Math.max(0.7, Math.round((260 / fullMm) * 100) / 100) : 1;
          return (
            <section key={si} style={{ breakBefore: "page" }}>
              <div style={zoom < 1 ? { zoom } : undefined}>{groupBox(sheet.group)}</div>
            </section>
          );
        }
        return (
          <section key={si} style={si > 0 ? { breakBefore: "page" } : undefined}>
            <div style={{ display: "flex", gap: "10mm", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>{sheet.left.map(groupBox)}</div>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>{sheet.right.map(groupBox)}</div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
