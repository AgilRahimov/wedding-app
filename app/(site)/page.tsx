import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Countdown } from "./countdown";
import { InviteCodeForm } from "./invite-code-form";
import { Ornament } from "./ornament";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const info = await db.eventInfo.findUnique({ where: { id: 1 } });
  const names = info?.coupleNames || "Our Wedding";
  return {
    title: `${names} · ${info?.weddingDate ?? ""}`.trim(),
    description: `Join us at ${info?.venueName || "our wedding"}.`,
  };
}

const lines = (s: string) =>
  s.split("\n").map((l) => l.trim()).filter(Boolean);

function Section({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto w-full max-w-4xl px-6 py-16 sm:py-20 ${className}`}>
      {eyebrow && (
        <p className="text-center text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]/80">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2
          className="mt-3 text-center text-3xl font-light tracking-tight text-[var(--ink-strong)] sm:text-4xl"
          style={{ fontFamily: "var(--font-display), serif", textWrap: "balance" }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [info, programmes] = await Promise.all([
    db.eventInfo.findUniqueOrThrow({ where: { id: 1 } }),
    db.programme.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const parsed = new Date(info.weddingDate);
  const isoDate = Number.isNaN(parsed.getTime())
    ? null
    : new Date(
        `${parsed.toDateString()} ${info.ceremonyTime || "19:00"}`
      ).toISOString();

  // The homepage shows the default evening as a taste of the night; each guest's
  // own page shows the programme that actually applies to them.
  const evening = programmes.find((p) => p.isDefault) ?? programmes[0];

  return (
    <main>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(80% 55% at 50% 0%, rgba(201,164,106,0.16) 0%, rgba(11,15,19,0) 70%)",
          }}
        />
        <div className="relative mx-auto flex min-h-[88vh] w-full max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--gold)]/85">
            Together with our families
          </p>
          <h1
            className="mt-7 text-[15vw] font-light leading-[0.95] tracking-tight text-[var(--ink-strong)] sm:text-7xl md:text-8xl"
            style={{ fontFamily: "var(--font-display), serif", textWrap: "balance" }}
          >
            {info.coupleNames || "Our Wedding"}
          </h1>

          <Ornament className="mt-9" />

          <div className="mt-9 flex flex-col items-center gap-2">
            <p className="text-lg tracking-[0.06em] text-[var(--ink)] sm:text-xl">
              {info.weddingDate}
              {info.ceremonyTime && ` · ${info.ceremonyTime}`}
            </p>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--gold)]/80">
              {info.venueName}
              {info.venueAddress && info.venueName ? " · Baku" : ""}
            </p>
          </div>

          {isoDate && (
            <div className="mt-14 w-full">
              <Countdown isoDate={isoDate} />
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <Section eyebrow="The essentials" title="When and where">
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            { label: "Date", value: info.weddingDate || "To be confirmed", sub: "" },
            {
              label: "Time",
              value: info.ceremonyTime || "Evening",
              sub: "Doors open half an hour before",
            },
            {
              label: "Dress",
              value: info.dressCode || "Formal",
              sub: "October evenings in Baku are mild — bring a light layer",
            },
          ].map((d) => (
            <div key={d.label} className="bg-[var(--card)] p-7 text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--gold)]/75">
                {d.label}
              </p>
              <p
                className="mt-3 text-2xl font-light text-[var(--ink-strong)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {d.value}
              </p>
              {d.sub && <p className="mt-2 text-[13px] text-white/45">{d.sub}</p>}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p
            className="text-2xl font-light text-[var(--ink-strong)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {info.venueName}
          </p>
          {info.venueAddress && (
            <p className="mt-2 text-[15px] text-white/55">{info.venueAddress}</p>
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
        </div>
      </Section>

      <Ornament />

      {/* The evening */}
      {evening && evening.items.length > 0 && (
        <Section eyebrow="The evening" title="How the night unfolds">
          <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50">
            Some of you are with us from the afternoon, and some are travelling from far
            away. Your own invitation shows the plan made for you — this is the shape of
            the evening itself.
          </p>
          <ol className="mx-auto mt-12 flex max-w-xl flex-col">
            {evening.items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[80px_1fr] gap-5 border-t border-white/10 py-5 first:border-t-0 sm:grid-cols-[110px_1fr]"
              >
                <span className="pt-1 text-[13px] tabular-nums tracking-[0.1em] text-[var(--gold)]">
                  {item.time}
                </span>
                <span>
                  <span
                    className="block text-xl font-light text-[var(--ink-strong)]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {item.title}
                  </span>
                  {item.detail && (
                    <span className="mt-1 block text-[14px] leading-relaxed text-white/45">
                      {item.detail}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Ornament />

      {/* Travelling in */}
      <Section eyebrow="Coming from abroad" title="Travelling to Baku">
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              h: "Getting here",
              p: "Heydar Aliyev International Airport is about 30 minutes from the city. Tell us your flight and we will arrange to meet you.",
            },
            {
              h: "Where to stay",
              p: "We are holding rooms at hotels near the venue. Your invitation page shows your hotel once it is booked.",
            },
            {
              h: "While you're here",
              p: "Late October is one of the best times to see Baku — warm days, cool evenings. We are planning something for guests who stay on after the wedding.",
            },
          ].map((c) => (
            <div
              key={c.h}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-7"
            >
              <h3
                className="text-xl font-light text-[var(--ink-strong)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {c.h}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-white/50">{c.p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      {info.faq && (
        <>
          <Ornament />
          <Section eyebrow="Good to know" title="Questions, answered">
            <div className="mx-auto mt-10 flex max-w-xl flex-col">
              {lines(info.faq).map((l, i) => {
                const [head, ...rest] = l.split(/\s+[—–-]\s+/);
                const body = rest.join(" — ");
                return (
                  <div key={i} className="border-t border-white/10 py-5 first:border-t-0">
                    <p className="text-[15px] text-[var(--ink-strong)]">{head}</p>
                    {body && (
                      <p className="mt-1 text-[14px] leading-relaxed text-white/45">{body}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {/* Find your invitation */}
      <Section className="!py-20">
        <div className="rounded-3xl border border-[var(--gold)]/25 bg-gradient-to-b from-[var(--gold)]/[0.09] to-transparent p-9 text-center sm:p-12">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]/85">
            Your invitation
          </p>
          <h2
            className="mt-4 text-3xl font-light text-[var(--ink-strong)] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Find your table and your plan
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/50">
            Every family has a personal invitation showing their own timetable, their
            table, and their travel details. We sent yours by WhatsApp — open that link,
            or paste it here.
          </p>
          <div className="mx-auto mt-8 max-w-lg">
            <InviteCodeForm />
          </div>
        </div>
      </Section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 py-12 text-center">
          <Ornament />
          <p
            className="mt-2 text-2xl font-light text-[var(--ink-strong)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {info.coupleNames || "Our Wedding"}
          </p>
          {info.contactPhone && (
            <p className="text-[14px] text-white/45">
              Any questions? Call us on {info.contactPhone}
            </p>
          )}
          <a
            href="/dashboard"
            className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/25 transition hover:text-white/50"
          >
            Family sign-in
          </a>
        </div>
      </footer>
    </main>
  );
}
