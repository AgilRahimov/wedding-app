// The Buta Palace hall, copied from the venue's floor plan of September 2026
// (drawn for a guest list heading towards 600): 35 round tables of 12, 8
// half-round tables of 12 lining the central runway (guests sit on the
// curve, facing the runway), and 4 oval tables of 18 set at an angle just
// inside the second column — 588 seats in all. The stage is at the top of
// the plan, the couple's platform and the two entrances at the bottom.
//
// Numbering is the venue's own, from its drawing: 1–4 are the half-rounds
// right of the runway (stage end first), 5 the top-right oval, 6–10 the
// column of rounds beside them, 11 the bottom-right oval, 12–16 the next
// column, 17–23 the rounds along the right wall; then the same again on the
// left — 24–27 half-rounds, 28 oval, 29–33, 34 oval, 35–39, and 40–47 along
// the left wall (eight there, one more than on the right).

export type RoomTable = {
  name: string;
  capacity: number;
  shape: string;
  rotation: number;
  x: number;
  y: number;
  sortOrder: number;
};

// The drawing canvas of the floor plan. Table x/y in the database are
// percentages of this canvas, so the plan scales to any screen.
export const ROOM_CANVAS = { w: 800, h: 890 };

/** "Table 12" → "12" — the short number shown on the plan, next to a group's
 *  name on the Guests screen, and in the printed report. */
export function tableNo(name: string): string {
  return name.replace(/^Table\s+/i, "");
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const pct = (x: number, y: number) => ({
  x: round1((x / ROOM_CANVAS.w) * 100),
  y: round1((y / ROOM_CANVAS.h) * 100),
});

// The runway runs down the middle of the canvas (x = 400); every column of
// tables is placed by its distance from it and mirrored to the other side.
// Column spacing is the plan's, opened up by a few percent so tables never
// touch on screen.
const MID = 400;
const HALF = 73; // half-rounds: their flat side sits on the runway's edge
const INNER = 168; // the column of rounds right beside the half-rounds
const MIDDLE = 244; // the next column
const OUTER = 316; // the rounds along the side walls
const OVAL = 206; // the ovals, tucked between the inner and middle columns

const HALF_YS = [241, 373, 505, 636];
const INNER_YS = [305, 382, 459, 536, 613];
const MIDDLE_YS = [295, 377, 460, 542, 624];
const OVAL_TOP = 216;
const OVAL_BOTTOM = 699;

function buildTables(): RoomTable[] {
  const tables: RoomTable[] = [];
  let n = 1;
  const add = (x: number, y: number, capacity: number, shape: string, rotation = 0) => {
    tables.push({ name: `Table ${n}`, capacity, shape, rotation, sortOrder: n, ...pct(x, y) });
    n += 1;
  };

  // Right of the runway. Half-round rotation 0 = flat side on the right, so
  // these flip to put the flat side against the runway. The ovals lean the
  // way the venue drew them: away from the runway at the top, and again
  // away from it at the bottom.
  for (const y of HALF_YS) add(MID + HALF, y, 12, "half", 180); // 1–4
  add(MID + OVAL, OVAL_TOP, 18, "oval", -38); // 5
  for (const y of INNER_YS) add(MID + INNER, y, 12, "round"); // 6–10
  add(MID + OVAL, OVAL_BOTTOM, 18, "oval", 38); // 11
  for (const y of MIDDLE_YS) add(MID + MIDDLE, y, 12, "round"); // 12–16
  for (const y of [236, 317, 397, 477, 558, 638, 719]) add(MID + OUTER, y, 12, "round"); // 17–23

  // Left of the runway — the mirror image, with one extra table by the wall.
  for (const y of HALF_YS) add(MID - HALF, y, 12, "half", 0); // 24–27
  add(MID - OVAL, OVAL_TOP, 18, "oval", 38); // 28
  for (const y of INNER_YS) add(MID - INNER, y, 12, "round"); // 29–33
  add(MID - OVAL, OVAL_BOTTOM, 18, "oval", -38); // 34
  for (const y of MIDDLE_YS) add(MID - MIDDLE, y, 12, "round"); // 35–39
  for (const y of [202, 274, 345, 417, 489, 561, 632, 704]) add(MID - OUTER, y, 12, "round"); // 40–47

  return tables;
}

export const REAL_ROOM_TABLES = buildTables();
