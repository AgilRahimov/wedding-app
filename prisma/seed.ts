import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { REAL_ROOM_TABLES } from "../lib/room-layout";

const prisma = new PrismaClient();

type Row = {
  section: string;
  group: string;
  name: string;
  plusCount: number;
  via: string | null;
  note: string | null;
};

function inviteToken() {
  // URL-safe, unguessable, short enough to read out over the phone
  return randomBytes(9).toString("base64url");
}

/** Every step below is safe to re-run: it only creates what is missing. */

async function seedAdmin() {
  const email = "agil_93@hotmail.com";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    // Agil is the owner — the only one who can open Settings. Kept in step
    // here so a database from before roles existed gets it on deploy.
    if (existing.role !== "owner") {
      await prisma.adminUser.update({ where: { email }, data: { role: "owner" } });
      console.log(`Made ${email} the owner.`);
    }
    return;
  }
  const password = process.env.SEED_ADMIN_PASSWORD ?? "toy2026!";
  await prisma.adminUser.create({
    data: { email, name: "Agil", role: "owner", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Created admin ${email} (password: ${password})`);
}

async function seedEventInfo() {
  await prisma.eventInfo.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      coupleNames: "Agil & Samra",
      weddingDate: "23 October 2026",
      ceremonyTime: "19:00",
      venueName: "Buta Palace",
      venueAddress: "Baku, Azerbaijan",
      welcomeText: "We can't wait to celebrate with you!",
    },
  });
}

async function seedGuests() {
  if ((await prisma.household.count()) > 0) return;

  const file = path.join(__dirname, "data", "guests.json");
  const rows: Row[] = JSON.parse(fs.readFileSync(file, "utf-8"));

  let guests = 0;
  for (const row of rows) {
    const extraNotes = [row.note, row.via ? `via: ${row.via}` : null]
      .filter(Boolean)
      .join("; ");
    await prisma.household.create({
      data: {
        token: inviteToken(),
        name: row.name,
        group: row.group,
        via: row.via,
        notes: extraNotes || null,
        guests: {
          create: [
            { name: row.name, isPlusOne: false },
            ...Array.from({ length: row.plusCount }, (_, i) => ({
              name: row.plusCount === 1 ? `+1 of ${row.name}` : `+1 #${i + 1} of ${row.name}`,
              isPlusOne: true,
            })),
          ],
        },
      },
    });
    guests += 1 + row.plusCount;
  }
  console.log(`Imported ${rows.length} households, ${guests} guests.`);
}

const PROGRAMMES = [
  {
    code: "A",
    name: "Group A",
    title: "Gathering at the groom's house",
    summary:
      "You are with us for the whole day. We gather at the family home in the afternoon, then travel to Buta Palace together as one convoy.",
    isDefault: false,
    sortOrder: 1,
    items: [
      { time: "14:00", title: "Gather at the groom's house", detail: "Tea, sweets and plenty of noise. Come as you are — there is time to change later.", location: "Family home" },
      { time: "16:00", title: "Family photographs", detail: "The photographer works through the family groups. Please stay close by.", location: "Family home" },
      { time: "17:30", title: "The convoy leaves for the venue", detail: "Cars leave together. If you are driving yourself, follow the car in front — we travel as one line.", location: "Departing the family home" },
      { time: "18:30", title: "Arrive at Buta Palace", detail: "Time to settle in and find your table before the other guests arrive.", location: "Buta Palace" },
      { time: "19:00", title: "Guests are received", detail: "", location: "Buta Palace" },
      { time: "19:30", title: "The couple enter", detail: "", location: "Main hall" },
      { time: "20:00", title: "Dinner and music", detail: "", location: "Main hall" },
      { time: "23:00", title: "Cake and dancing", detail: "", location: "Main hall" },
    ],
  },
  {
    code: "B",
    name: "Group B",
    title: "Straight to Buta Palace",
    summary:
      "Join us at the venue in the evening. There is nothing to organise beforehand — simply arrive, find your table, and enjoy the night.",
    isDefault: true,
    sortOrder: 2,
    items: [
      { time: "18:30", title: "Doors open", detail: "Arrive whenever suits you between 18:30 and 19:00. Your table number is on this page.", location: "Buta Palace" },
      { time: "19:00", title: "Guests are seated", detail: "", location: "Main hall" },
      { time: "19:30", title: "The couple enter", detail: "", location: "Main hall" },
      { time: "20:00", title: "Dinner and music", detail: "", location: "Main hall" },
      { time: "23:00", title: "Cake and dancing", detail: "", location: "Main hall" },
    ],
  },
  {
    code: "C",
    name: "Group C",
    title: "Travelling from abroad",
    summary:
      "You are coming a long way, so here is the whole visit — not just the wedding night. Your flights, hotel and airport transfer appear on this page as soon as we have them.",
    isDefault: false,
    sortOrder: 3,
    items: [
      { time: "22 Oct", title: "Arrive in Baku", detail: "We meet you at the airport if you have told us your flight. The drive into the city takes about 30 minutes.", location: "Heydar Aliyev International Airport" },
      { time: "22 Oct, evening", title: "Hotel check-in and a quiet dinner", detail: "Nothing formal — rest after the journey.", location: "Your hotel" },
      { time: "23 Oct, morning", title: "Free morning in Baku", detail: "The old city is walkable and worth it. Ask us for suggestions.", location: "Baku" },
      { time: "23 Oct, 17:45", title: "Transport from the hotel", detail: "A car collects you from the hotel lobby. Please be down a few minutes early.", location: "Your hotel" },
      { time: "23 Oct, 18:30", title: "Arrive at Buta Palace", detail: "", location: "Buta Palace" },
      { time: "23 Oct, 19:30", title: "The couple enter", detail: "", location: "Main hall" },
      { time: "23 Oct, 20:00", title: "Dinner and music", detail: "An Azerbaijani wedding dinner runs long and generously. Pace yourself.", location: "Main hall" },
      { time: "23 Oct, 23:00", title: "Cake and dancing", detail: "", location: "Main hall" },
      { time: "24 Oct", title: "A day out together", detail: "We are planning something for guests who stay on. Details to follow.", location: "To be confirmed" },
    ],
  },
];

async function seedProgrammes() {
  if ((await prisma.programme.count()) > 0) return;
  for (const p of PROGRAMMES) {
    const { items, ...programme } = p;
    await prisma.programme.create({
      data: {
        ...programme,
        items: {
          create: items.map((item, i) => ({ ...item, sortOrder: i })),
        },
      },
    });
  }
  console.log(`Created ${PROGRAMMES.length} programmes.`);

  // Parties with no programme yet get the default one, so nobody sees a blank day.
  const fallback = await prisma.programme.findFirst({ where: { isDefault: true } });
  if (fallback) {
    const { count } = await prisma.household.updateMany({
      where: { programmeId: null },
      data: { programmeId: fallback.id },
    });
    console.log(`Put ${count} parties on ${fallback.name} by default.`);
  }
}

async function seedTables() {
  // The room is the real Buta Palace layout. Databases seeded before the venue
  // sent its plan hold an older placeholder room (round/long tables only) — that
  // one gets swapped out here, but only while nobody is seated on it, so a room
  // the family has already worked on is never touched.
  const existing = await prisma.seatTable.findMany({ select: { shape: true } });
  const hasRealRoom = existing.some((t) => t.shape === "half" || t.shape === "oval");
  if (hasRealRoom) return;

  if (existing.length > 0) {
    const seated = await prisma.guest.count({ where: { tableId: { not: null } } });
    if (seated > 0) {
      console.log(
        `Kept the old placeholder floor plan: ${seated} guests are already seated on it.`
      );
      return;
    }
    await prisma.seatTable.deleteMany();
    console.log(`Removed the ${existing.length} placeholder tables.`);
  }

  await prisma.seatTable.createMany({ data: REAL_ROOM_TABLES });
  const seats = REAL_ROOM_TABLES.reduce((sum, t) => sum + t.capacity, 0);
  console.log(
    `Created the Buta Palace floor plan: ${REAL_ROOM_TABLES.length} tables (${seats} seats).`
  );
}

async function main() {
  await seedAdmin();
  await seedEventInfo();
  await seedGuests();
  await seedProgrammes();
  await seedTables();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
