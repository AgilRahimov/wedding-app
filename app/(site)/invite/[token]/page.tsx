import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { VenueMap } from "@/components/venue-map";
import { Ornament } from "../../ornament";
import { rsvpIsClosed } from "./deadline";
import { RsvpForm } from "./rsvp-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your invitation",
  robots: { index: false, follow: false },
};

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function Card({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
      <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--gold)]/80">{eyebrow}</p>
      {title && (
        <h2
          className="mt-2 text-2xl font-light text-[var(--ink-strong)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title}
        </h2>
      )}
      <div className="mt-4 text-[15px] leading-relaxed text-white/60">{children}</div>
    </section>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const household = await db.household.findUnique({
    where: { token },
    include: {
      guests: {
        orderBy: [{ isPlusOne: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        include: { table: true },
      },
      programme: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      hotel: true,
    },
  });
  if (!household) notFound();

  // First visit? Remember it, so the family can see who has seen their invite.
  if (!household.linkOpenedAt) {
    await db.household.update({
      where: { id: household.id },
      data: { linkOpenedAt: new Date() },
    });
  }

  const [info, tables] = await Promise.all([
    db.eventInfo.findUniqueOrThrow({ where: { id: 1 } }),
    db.seatTable.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { guests: true } } },
    }),
  ]);

  const closed = rsvpIsClosed(info.rsvpDeadline);
  const programme = household.programme;

  // A party normally shares one table; show whichever tables they actually have.
  const partyTables = [
    ...new Map(
      household.guests
        .filter((g) => g.table)
        .map((g) => [g.table!.id, g.table!])
    ).values(),
  ];
  const anyoneComing = household.guests.some((g) => g.rsvp === "yes");

  const travel = household.isInternational
    ? [
        household.arrivalDate && {
          label: "Arriving",
          value: [household.arrivalDate, household.arrivalDetails].filter(Boolean).join(" · "),
        },
        household.departureDate && {
          label: "Leaving",
          value: [household.departureDate, household.departureDetails].filter(Boolean).join(" · "),
        },
        (household.hotel || household.roomDetails) && {
          label: "Staying at",
          value: [household.hotel?.name, household.roomDetails].filter(Boolean).join(" · "),
        },
        household.needsTransfer && {
          label: "Airport transfer",
          value: "Arranged — we will meet you on arrival",
        },
      ].filter(Boolean as unknown as (v: unknown) => v is { label: string; value: string })
    : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-14">
      {/* Greeting */}
      <header className="text-center">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--gold)]/85">
          You are invited
        </p>
        <h1
          className="mt-6 text-5xl font-light leading-[1] tracking-tight text-[var(--ink-strong)] sm:text-6xl"
          style={{ fontFamily: "var(--font-display), serif", textWrap: "balance" }}
        >
          {info.coupleNames || "Our Wedding"}
        </h1>
        <p className="mt-5 text-[15px] tracking-[0.05em] text-[var(--ink)]">
          {info.weddingDate}
          {info.ceremonyTime && ` · ${info.ceremonyTime}`}
        </p>
        <p className="mt-1 text-[12px] uppercase tracking-[0.2em] text-[var(--gold)]/75">
          {info.venueName}
        </p>

        <Ornament className="mt-8" />

        <p className="mt-8 text-[17px] text-[var(--ink)]">
          Dear <span className="text-[var(--ink-strong)]">{household.name}</span>
          {household.guests.length > 1 ? " and family" : ""},
        </p>
        {info.welcomeText && (
          <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-[15px] leading-relaxed text-white/55">
            {info.welcomeText}
          </p>
        )}
      </header>

      <div className="mt-12 flex flex-col gap-4">
        {/* Their table */}
        {anyoneComing && partyTables.length > 0 && (
          <Card
            eyebrow="Your table"
            title={partyTables.map((t) => t.name).join(" & ")}
          >
            <p>
              Your places are set. The plan below shows where you are sitting — your table
              is marked in gold.
            </p>
            <div className="mt-5">
              <VenueMap
                variant="guest"
                highlightTableId={partyTables[0].id}
                platformLabel={info.coupleNames || "The couple"}
                tables={tables.map((t) => ({
                  id: t.id,
                  name: t.name,
                  capacity: t.capacity,
                  x: t.x,
                  y: t.y,
                  shape: t.shape,
                  rotation: t.rotation,
                  seated: t._count.guests,
                }))}
              />
            </div>
            <p className="mt-3 text-[12px] text-white/30">
              Layout is approximate and may be adjusted before the day.
            </p>
          </Card>
        )}

        {/* Their programme */}
        {programme && programme.items.length > 0 && (
          <Card eyebrow="Your day" title={programme.title}>
            {programme.summary && <p>{programme.summary}</p>}
            <ol className="mt-5 flex flex-col">
              {programme.items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[78px_1fr] gap-4 border-t border-white/10 py-4 first:border-t-0 first:pt-0 sm:grid-cols-[104px_1fr]"
                >
                  <span className="pt-0.5 text-[12.5px] tabular-nums tracking-[0.08em] text-[var(--gold)]">
                    {item.time}
                  </span>
                  <span>
                    <span
                      className="block text-lg font-light leading-snug text-[var(--ink-strong)]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {item.title}
                    </span>
                    {item.location && (
                      <span className="mt-0.5 block text-[12px] uppercase tracking-[0.13em] text-white/30">
                        {item.location}
                      </span>
                    )}
                    {item.detail && (
                      <span className="mt-1.5 block text-[14px] leading-relaxed text-white/45">
                        {item.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* Travel, for guests flying in */}
        {household.isInternational && (
          <Card eyebrow="Your travel" title="Getting here and back">
            {travel.length > 0 ? (
              <dl className="flex flex-col">
                {travel.map((t) => (
                  <div
                    key={t.label}
                    className="grid grid-cols-[110px_1fr] gap-4 border-t border-white/10 py-3 first:border-t-0 first:pt-0"
                  >
                    <dt className="text-[12px] uppercase tracking-[0.13em] text-white/35">
                      {t.label}
                    </dt>
                    <dd className="text-[15px] text-[var(--ink)]">{t.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>
                We are putting your travel together now — your flights, hotel and airport
                pick-up will appear here as soon as they are arranged. Tell us your flight
                details in the message box below and we will take care of the rest.
              </p>
            )}
            {household.travelNotes && (
              <p className="mt-4 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/[0.07] px-4 py-3 text-[14px] text-[var(--ink)]">
                {household.travelNotes}
              </p>
            )}
          </Card>
        )}

        {/* Where */}
        <Card eyebrow="The venue" title={info.venueName}>
          {info.venueAddress && <p>{info.venueAddress}</p>}
          {info.dressCode && (
            <p className="mt-2">
              <span className="text-white/35">Dress code — </span>
              {info.dressCode}
            </p>
          )}
          {info.mapUrl && (
            <a
              href={info.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block rounded-full border border-[var(--gold)]/50 px-6 py-2.5 text-[12px] uppercase tracking-[0.16em] text-[var(--gold)] transition hover:bg-[var(--gold)]/10"
            >
              Open in maps
            </a>
          )}
        </Card>

        {/* Good to know */}
        {info.faq && (
          <Card eyebrow="Good to know">
            <ul className="flex flex-col gap-2">
              {lines(info.faq).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </Card>
        )}

        {/* RSVP */}
        <section className="rounded-2xl border border-[var(--gold)]/30 bg-gradient-to-b from-[var(--gold)]/[0.08] to-transparent p-6 sm:p-7">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--gold)]/85">
            Will you join us?
          </p>
          {info.rsvpDeadline && !closed && (
            <p className="mt-2 text-[14px] text-white/45">
              Please let us know by {info.rsvpDeadline}.
            </p>
          )}
          {closed ? (
            <p className="mt-4 text-[15px] text-white/60">
              The reply date has passed.
              {info.contactPhone
                ? ` Please call us on ${info.contactPhone}.`
                : " Please contact us directly."}
            </p>
          ) : (
            <RsvpForm
              token={token}
              alreadyReplied={Boolean(household.respondedAt)}
              note={household.rsvpNote ?? ""}
              isInternational={household.isInternational}
              members={household.guests.map((g) => ({
                id: g.id,
                name: g.name,
                attending:
                  g.rsvp === "yes" ? ("yes" as const) : g.rsvp === "no" ? ("no" as const) : null,
                isChild: g.isChild,
                age: g.age,
                nameEditable: g.isPlusOne || g.isChild,
              }))}
            />
          )}
        </section>
      </div>

      <footer className="mt-14 text-center">
        <Ornament />
        {info.contactPhone && (
          <p className="mt-6 text-[14px] text-white/40">
            Any questions? Call us on {info.contactPhone}
          </p>
        )}
        <a
          href="/"
          className="mt-3 inline-block text-[11px] uppercase tracking-[0.2em] text-white/25 transition hover:text-white/50"
        >
          Wedding home
        </a>
      </footer>
    </main>
  );
}
