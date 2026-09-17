import { db } from "@/lib/db";
import { groupingRevision, orderGroupNames } from "@/lib/grouping";
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
};
type Party = { id: string; name: string; group: string; members: Member[] };

// Page breaks are written in both spellings — the modern break-* properties
// and the page-break-* ones — because Safari's print engine only reliably
// honours the old ones. Same reason there is no CSS multi-column anywhere on
// this page (Safari's print preview can hang on it): columns are split into
// explicit <div>s instead.
const PAGE_AFTER = { breakAfter: "page", pageBreakAfter: "always" } as const;
const PAGE_BEFORE = { breakBefore: "page", pageBreakBefore: "always" } as const;
const KEEP_TOGETHER = { breakInside: "avoid", pageBreakInside: "avoid" } as const;

// Split a list into `count` columns, in reading order, as evenly as possible.
function splitColumns<T>(items: T[], count: number): T[][] {
  const per = Math.ceil(items.length / count) || 1;
  const columns: T[][] = [];
  for (let i = 0; i < items.length; i += per) columns.push(items.slice(i, i + per));
  while (columns.length < count) columns.push([]);
  return columns;
}

// The grey line of names under an invitation — printed only when it says
// something the bold name above it doesn't. Confirmed with Agil by example:
//   Agil     [Agil, +1]              → no line
//   Agil     [Agil Rahimov, +1]      → "Agil Rahimov + __"
//   Agil     [Agil, Samra]           → "Agil + Samra"
// So: the line appears once any member has a real name that differs from the
// invitation's; every member is then listed, unnamed +1s as a "__" blank.
function memberLine(p: Party): string | null {
  const isBlank = (name: string) => {
    const t = name.trim();
    return t === "" || t === "+1" || t === "1" || t.startsWith("+1 ");
  };
  const informative = p.members.some(
    (m) => !isBlank(m.name) && m.name.trim() !== p.name.trim()
  );
  if (!informative) return null;
  return p.members
    .map((m) =>
      isBlank(m.name)
        ? "__"
        : `${m.isChild ? "🧒 " : ""}${m.name}${m.rsvp === "no" ? " ✗" : ""}`
    )
    .join(" + ");
}

// Printed heights, estimated in millimetres on A4. In a half-sheet column
// (~89mm wide) long names and companion lists wrap; a full-width box wraps
// half as often. The estimate was calibrated against the real report and
// leans tall — packing a sheet loosely costs a page, overflowing ruins one.
function partyMm(p: Party, nameChars: number, companionChars: number) {
  const nameLines = Math.max(1, Math.ceil(p.name.length / nameChars));
  const line = memberLine(p);
  const companionLines = line ? Math.ceil(line.length / companionChars) : 0;
  return nameLines * 9 + companionLines * 5;
}

// Header, borders and the gap below a box.
const BOX_CHROME_MM = 20;

function groupMm(list: Party[], nameChars = 22, companionChars = 30) {
  if (list.length === 0) return BOX_CHROME_MM + 10;
  return BOX_CHROME_MM + list.reduce((n, p) => n + partyMm(p, nameChars, companionChars), 0);
}

// What one column of an A4 sheet can safely hold (~273mm printable, minus
// room for the revision line at the foot of every sheet).
const COLUMN_MM = 228;

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
    })),
  }));

  // 1 group = 1 table: a person sits wherever their group's table is, so
  // "seated" counts everyone (minus declines) in a group that has its table.
  const placedGroups = new Set(
    tables.filter((t) => t.groupName).map((t) => t.groupName!)
  );
  const everyone = parties.flatMap((p) => p.members);
  const stats = {
    parties: parties.length,
    people: everyone.length,
    yes: everyone.filter((m) => m.rsvp === "yes").length,
    no: everyone.filter((m) => m.rsvp === "no").length,
    pending: everyone.filter((m) => m.rsvp === "pending").length,
    seated: parties
      .filter((p) => placedGroups.has(p.group))
      .flatMap((p) => p.members)
      .filter((m) => m.rsvp !== "no").length,
    seats: tables.reduce((n, t) => n + t.capacity, 0),
  };

  const byGroup = new Map<string, Party[]>();
  for (const p of parties) {
    const list = byGroup.get(p.group) ?? [];
    list.push(p);
    byGroup.set(p.group, list);
  }
  const groupNames = orderGroupNames(
    [...byGroup.keys()].filter((g) => g !== "Ungrouped"),
    info.groupOrder
  );
  if (byGroup.has("Ungrouped")) groupNames.push("Ungrouped");

  // A group's number IS its table's number (1 group = 1 table, assigned on
  // the Seating screen); "—" means no table yet. The plan's revision goes up
  // whenever numbering or membership changes.
  const tableByGroup = new Map(
    tables.filter((t) => t.groupName).map((t) => [t.groupName!, t.name])
  );
  const groupNo = new Map(
    groupNames.map((g) => {
      const table = tableByGroup.get(g);
      return [g, table ? table.replace(/^Table\s+/i, "") : "—"];
    })
  );
  // "9." for a placed group, a bare "—" for one with no table yet.
  const noLabel = (g: string) => {
    const n = groupNo.get(g);
    return n === "—" ? "—" : `${n}.`;
  };
  const rev = await groupingRevision(
    groupNames.map((g) => ({
      name: g,
      householdIds: (byGroup.get(g) ?? []).map((p) => p.id),
      table: tableByGroup.get(g) ?? null,
    }))
  );

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

  // On paper the word is "invitation" — one invitation covers the people who
  // come together. On the screens the same thing is called a party.
  const statCells: [string, string][] = [
    ["Invitations", String(stats.parties)],
    ["People invited", String(stats.people)],
    ["Coming", String(stats.yes)],
    ["Awaiting reply", String(stats.pending)],
    ["Declined", String(stats.no)],
    ["Seated", `${stats.seated} of ${stats.seats} seats`],
  ];

  const printedShort = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  // Stamped on every sheet, so mixed printouts give themselves away.
  const revisionLine = (
    <p style={{ fontSize: "11pt" }} className="mt-4 text-right text-stone-300">
      Grouping plan rev <strong className="font-semibold text-stone-400">{rev}</strong>{" "}
      · printed <strong className="font-semibold text-stone-400">{printedShort}</strong>
    </p>
  );

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
      <section style={PAGE_AFTER}>
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
          Group sizes
        </h2>
        <p style={{ fontSize: "10.5pt" }} className="mt-1 text-stone-600">
          How many groups there are of each size — for matching groups to tables of 12
          and 18.
        </p>
        <div className="mt-3" style={{ display: "flex", gap: "10mm", alignItems: "flex-start" }}>
          {splitColumns(sizeRows, 3).map((column, ci) => (
            <div key={ci} style={{ flex: "1 1 0", minWidth: 0 }}>
              {column.map(([size, count]) => (
                <p
                  key={size}
                  style={{ fontSize: "12pt" }}
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
          ))}
        </div>
        {revisionLine}
      </section>

      {/* Sheet 2 — every numbered group with its invitation and people counts */}
      <section style={PAGE_AFTER}>
        <h2 style={{ fontSize: "15pt", fontWeight: 600 }}>Groups</h2>
        <p style={{ fontSize: "10.5pt" }} className="mt-1 text-stone-600">
          A group&apos;s number is its <strong className="text-stone-900">table</strong> on
          the seating plan; “—” means no table yet. Each line shows invitations ·{" "}
          <strong className="text-stone-900">people</strong>.
        </p>
        <div className="mt-3" style={{ display: "flex", gap: "10mm", alignItems: "flex-start" }}>
          {splitColumns(groupNames, 2).map((column, ci) => (
            <div key={ci} style={{ flex: "1 1 0", minWidth: 0 }}>
              {column.map((g) => {
                const list = byGroup.get(g) ?? [];
                const people = list.reduce((n, p) => n + p.members.length, 0);
                return (
                  <p
                    key={g}
                    style={{ fontSize: "12pt" }}
                    className="flex justify-between gap-3 border-b border-stone-200 py-1"
                  >
                    <span>
                      <span className="tabular-nums text-stone-500">{noLabel(g)}</span> {g}
                    </span>
                    <span className="whitespace-nowrap text-stone-500">
                      {list.length} · <strong className="text-stone-900">{people}</strong>
                    </span>
                  </p>
                );
              })}
            </div>
          ))}
        </div>
        {revisionLine}
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
              style={KEEP_TOGETHER}
              className="mb-6 overflow-hidden rounded-xl border border-stone-400"
            >
              <div className="flex items-baseline justify-between gap-2 border-b border-stone-400 bg-stone-100 px-3 py-1.5">
                <h3 style={{ fontSize: "14pt", fontWeight: 600 }}>
                  <span className="tabular-nums text-stone-500">{noLabel(g)}</span> {g}
                </h3>
                <span style={{ fontSize: "10pt" }} className="whitespace-nowrap text-stone-600">
                  {list.length} {list.length === 1 ? "invitation" : "invitations"} · {people}{" "}
                  people
                </span>
              </div>
              {list.map((p) => {
                const allDeclined =
                  p.members.length > 0 && p.members.every((m) => m.rsvp === "no");
                const coming = p.members.filter((m) => m.rsvp !== "no").length;
                const line = memberLine(p);
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
                    {line && (
                      <p style={{ fontSize: "10.5pt" }} className="text-stone-500">
                        {line}
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
          const zoom = fullMm > 235 ? Math.max(0.7, Math.round((235 / fullMm) * 100) / 100) : 1;
          return (
            <section key={si} style={PAGE_BEFORE}>
              <div style={zoom < 1 ? { zoom } : undefined}>{groupBox(sheet.group)}</div>
              {revisionLine}
            </section>
          );
        }
        return (
          <section key={si} style={si > 0 ? PAGE_BEFORE : undefined}>
            <div style={{ display: "flex", gap: "10mm", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>{sheet.left.map(groupBox)}</div>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>{sheet.right.map(groupBox)}</div>
            </div>
            {revisionLine}
          </section>
        );
      })}
    </div>
  );
}
