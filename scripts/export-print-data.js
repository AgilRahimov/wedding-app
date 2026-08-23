// Dumps the current guest list to print-data.json for scripts/print-guest-list.py.
// Run from the wedding-app folder:  node scripts/export-print-data.js
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const db = new PrismaClient();

db.household
  .findMany({
    include: {
      guests: { orderBy: [{ isPlusOne: "asc" }, { createdAt: "asc" }, { id: "asc" }] },
    },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  })
  .then((households) => {
    const out = households.map((h) => ({
      group: h.group,
      name: h.name,
      phone: h.phone,
      notes: h.notes,
      members: h.guests.map((g) => ({
        name: g.name,
        rsvp: g.rsvp,
        isPlusOne: g.isPlusOne,
        isChild: g.isChild,
      })),
    }));
    const file = path.join(__dirname, "print-data.json");
    fs.writeFileSync(file, JSON.stringify(out, null, 1));
    console.log(`wrote ${out.length} parties to ${file}`);
    return db.$disconnect();
  });
