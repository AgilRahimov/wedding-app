// The real Buta Palace hall, copied from the venue's floor plan (August 2026):
// 28 round tables of 12, 8 half-round tables of 12 lining the central runway
// (guests sit on the curve, facing the runway), and 4 oval tables of 18 angled
// into the corners — 504 seats in all. The stage is at the top of the plan,
// the couple's platform and the two entrances at the bottom.
//
// Numbering, agreed with Agil: 1–8 are the half-rounds along the runway
// (left side first), 9–22 the left block of rounds front-to-back, 23–36 the
// right block, 37–40 the corner ovals. So a table number roughly tells a
// guest where in the room to walk.

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
export const ROOM_CANVAS = { w: 700, h: 945 };

const round1 = (v: number) => Math.round(v * 10) / 10;
const pct = (x: number, y: number) => ({
  x: round1((x / ROOM_CANVAS.w) * 100),
  y: round1((y / ROOM_CANVAS.h) * 100),
});

function buildTables(): RoomTable[] {
  const tables: RoomTable[] = [];
  let n = 1;
  const add = (x: number, y: number, capacity: number, shape: string, rotation = 0) => {
    tables.push({ name: `Table ${n}`, capacity, shape, rotation, sortOrder: n, ...pct(x, y) });
    n += 1;
  };

  // 1–8: half-rounds along the runway. Rotation 0 = flat side on the right,
  // so the left-hand ones face the runway as they are; the right-hand ones flip.
  for (const y of [200, 340, 480, 620]) add(306, y, 12, "half", 0);
  for (const y of [200, 340, 480, 620]) add(394, y, 12, "half", 180);

  // 9–22: the left block of rounds, numbered front-to-back (stage end first).
  const leftRounds: [number, number][] = [];
  const columns: [number, number[]][] = [
    [76, [300, 405, 510, 615, 720]],
    [152, [270, 372, 474, 576, 678]],
    [228, [305, 415, 525, 635]],
  ];
  for (const [x, ys] of columns) for (const y of ys) leftRounds.push([x, y]);
  leftRounds.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [x, y] of leftRounds) add(x, y, 12, "round");

  // 23–36: the right block, the mirror image.
  const rightRounds = leftRounds
    .map(([x, y]): [number, number] => [ROOM_CANVAS.w - x, y])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [x, y] of rightRounds) add(x, y, 12, "round");

  // 37–40: the corner ovals, angled to follow the cut corners of the room.
  add(120, 185, 18, "oval", -38);
  add(580, 185, 18, "oval", 38);
  add(120, 795, 18, "oval", 38);
  add(580, 795, 18, "oval", -38);

  return tables;
}

export const REAL_ROOM_TABLES = buildTables();
