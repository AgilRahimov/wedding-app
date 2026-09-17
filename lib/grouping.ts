import { db } from "./db";

// The grouping plan: 1 group = 1 table, so a group's number IS its table's
// number, and the whole plan carries a revision so two printouts can be
// checked against each other. The revision maintains itself: whenever a page
// that shows it renders, the current plan (group order, group names, which
// invitation sits in which group, and which table each group sits at) is
// fingerprinted and compared with the stored one — if it changed, the
// revision goes up by one. Nobody has to remember to bump anything.

/** Named groups in the family's saved box order; unknown ones follow A→Z.
 *  ("Ungrouped" is handled by the caller — it is always last.) */
export function orderGroupNames(names: string[], savedJson: string): string[] {
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

function fingerprint(text: string): string {
  // djb2 — tiny and stable; this is a change detector, not cryptography.
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * The current revision of the grouping plan. `orderedGroups` must be the full
 * list in box order (Ungrouped last) with each group's household ids and the
 * name of the table it sits at (null while it has none).
 */
export async function groupingRevision(
  orderedGroups: { name: string; householdIds: string[]; table?: string | null }[]
): Promise<number> {
  const plan = orderedGroups
    .map((g) => `${g.name}@${g.table ?? ""}:${[...g.householdIds].sort().join(",")}`)
    .join("|");
  const hash = fingerprint(plan);

  const info = await db.eventInfo.findUnique({
    where: { id: 1 },
    select: { groupPlanHash: true, groupPlanRev: true },
  });
  if (!info) return 1;
  if (info.groupPlanHash === hash) return info.groupPlanRev;

  // First fingerprint ever stays rev 1; a real change counts up.
  const rev = info.groupPlanHash ? info.groupPlanRev + 1 : info.groupPlanRev;
  await db.eventInfo.update({
    where: { id: 1 },
    data: { groupPlanHash: hash, groupPlanRev: rev },
  });
  return rev;
}
