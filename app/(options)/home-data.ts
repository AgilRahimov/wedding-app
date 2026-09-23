import { db } from "@/lib/db";
import { weddingStartIso } from "@/lib/wedding-time";

// Everything a homepage design shows, read once — so each design option is
// only about looks, and they all show the same real wedding details.

export const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

// "Heading — text" lines, the format Settings uses for travel notes and FAQ.
const split = (l: string) => {
  const [head, ...rest] = l.split(/\s+[—–-]\s+/);
  return { head, body: rest.join(" — ") };
};

const DEFAULT_TRAVEL = [
  {
    head: "Getting here",
    body: "Heydar Aliyev International Airport is about 30 minutes from the city. Tell us your flight and we will arrange to meet you.",
  },
  {
    head: "Where to stay",
    body: "We are holding rooms at hotels near the venue. Your invitation page shows your hotel once it is booked.",
  },
  {
    head: "While you're here",
    body: "Late October is one of the best times to see Baku — warm days, cool evenings. We are planning something for guests who stay on after the wedding.",
  },
];

export async function loadHome() {
  const [info, programmes] = await Promise.all([
    db.eventInfo.findUniqueOrThrow({ where: { id: 1 } }),
    db.programme.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const parsed = new Date(info.weddingDate);
  const valid = !Number.isNaN(parsed.getTime());
  return {
    info,
    names: info.coupleNames || "Our Wedding",
    isoDate: weddingStartIso(info.weddingDate, info.ceremonyTime),
    weekday: valid ? parsed.toLocaleDateString("en-GB", { weekday: "long" }) : "",
    day: valid ? String(parsed.getDate()) : "",
    month: valid ? parsed.toLocaleDateString("en-GB", { month: "long" }) : "",
    year: valid ? String(parsed.getFullYear()) : "",
    // 23.10.2026 — the way the date is written in Azerbaijan
    numeric: valid
      ? `${String(parsed.getDate()).padStart(2, "0")}.${String(parsed.getMonth() + 1).padStart(2, "0")}.${parsed.getFullYear()}`
      : "",
    // the default evening, as a taste of the night — each guest's own page
    // shows the programme that actually applies to them
    evening: programmes.find((p) => p.isDefault) ?? programmes[0] ?? null,
    travel: info.travelInfo ? lines(info.travelInfo).map(split) : DEFAULT_TRAVEL,
    faq: info.faq ? lines(info.faq).map(split) : [],
  };
}
