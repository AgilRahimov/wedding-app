// Loading a backup file (made by Settings → "Download full backup") into a
// database, replacing what is there. Shared by the local restore script
// (`npm run restore`) and the "Restore from a backup file" button in Settings.
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;
type Row = Record<string, unknown>;

export type Backup = {
  format: string;
  version: number;
  exportedAt?: string;
  eventInfo?: Row | null;
  programmes?: (Row & { items?: Row[] })[];
  hotels?: Row[];
  tables?: Row[];
  households?: (Row & { guests?: Row[] })[];
  activities?: (Row & { signups?: Row[] })[];
};

/** The whole database as one plain object — the downloaded backup file,
 *  and the daily snapshot kept for rolling back. */
export async function buildBackup(db2: Db): Promise<Backup> {
  const [eventInfo, programmes, hotels, tables, households, activities] =
    await Promise.all([
      db2.eventInfo.findUnique({ where: { id: 1 } }),
      db2.programme.findMany({
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      }),
      db2.hotel.findMany(),
      db2.seatTable.findMany({ orderBy: { sortOrder: "asc" } }),
      db2.household.findMany({
        include: { guests: { orderBy: [{ isPlusOne: "asc" }, { id: "asc" }] } },
        orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      }),
      db2.activity.findMany({ include: { signups: true } }),
    ]);
  return {
    format: "wedding-app-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    eventInfo,
    programmes,
    hotels,
    tables,
    households,
    activities,
  } as unknown as Backup;
}

export function isBackup(x: unknown): x is Backup {
  return (
    !!x &&
    typeof x === "object" &&
    (x as Backup).format === "wedding-app-backup" &&
    (x as Backup).version === 1
  );
}

// JSON has no dates — turn the ISO strings back into Date objects.
function dates(row: Row, keys: string[]): Row {
  const out = { ...row };
  for (const k of keys) if (typeof out[k] === "string") out[k] = new Date(out[k] as string);
  return out;
}

/**
 * Replace the database's contents with the backup's. Family sign-in accounts
 * are not part of backups and are left untouched. Ids are kept, so every link
 * (party → programme/hotel, guest → seat) survives, and existing invite links
 * keep working.
 */
export async function applyBackup(db: Db, backup: Backup) {
  // Clear out, children before parents.
  await db.activitySignup.deleteMany();
  await db.activity.deleteMany();
  await db.guest.deleteMany();
  await db.household.deleteMany();
  await db.programmeItem.deleteMany();
  await db.programme.deleteMany();
  await db.seatTable.deleteMany();
  await db.hotel.deleteMany();
  await db.eventInfo.deleteMany();

  // Rebuild, parents before children.
  if (backup.eventInfo) {
    await db.eventInfo.create({ data: backup.eventInfo as Prisma.EventInfoCreateInput });
  }
  const hotels = backup.hotels ?? [];
  if (hotels.length) {
    await db.hotel.createMany({ data: hotels as Prisma.HotelCreateManyInput[] });
  }

  const programmes = backup.programmes ?? [];
  if (programmes.length) {
    await db.programme.createMany({
      data: programmes.map(({ items: _items, ...p }) => p) as Prisma.ProgrammeCreateManyInput[],
    });
    const items = programmes.flatMap((p) => p.items ?? []);
    if (items.length) {
      await db.programmeItem.createMany({ data: items as Prisma.ProgrammeItemCreateManyInput[] });
    }
  }

  const tables = backup.tables ?? [];
  if (tables.length) {
    await db.seatTable.createMany({ data: tables as Prisma.SeatTableCreateManyInput[] });
  }

  const households = backup.households ?? [];
  let guestCount = 0;
  if (households.length) {
    await db.household.createMany({
      data: households.map(({ guests: _guests, ...h }) =>
        dates(h, ["linkOpenedAt", "respondedAt", "createdAt", "updatedAt"])
      ) as Prisma.HouseholdCreateManyInput[],
    });
    const guests = households.flatMap((h) =>
      (h.guests ?? []).map((g) => dates(g, ["createdAt", "updatedAt"]))
    );
    guestCount = guests.length;
    if (guests.length) {
      await db.guest.createMany({ data: guests as Prisma.GuestCreateManyInput[] });
    }
  }

  const activities = backup.activities ?? [];
  if (activities.length) {
    await db.activity.createMany({
      data: activities.map(({ signups: _s, ...a }) => a) as Prisma.ActivityCreateManyInput[],
    });
    const signups = activities.flatMap((a) => a.signups ?? []);
    if (signups.length) {
      await db.activitySignup.createMany({
        data: signups as Prisma.ActivitySignupCreateManyInput[],
      });
    }
  }

  return {
    parties: households.length,
    guests: guestCount,
    tables: tables.length,
    programmes: programmes.length,
    hotels: hotels.length,
  };
}
