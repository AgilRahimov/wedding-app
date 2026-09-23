import type { Metadata } from "next";
import { EB_Garamond, Great_Vibes } from "next/font/google";
import { Ornament } from "../../(site)/ornament";
import { loadHome } from "../home-data";
import { InviteCodeForm } from "../invite-code-form";
import { Reveal } from "./reveal";
import { TickingCountdown } from "./ticking-countdown";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Option 4 · Majestic" };

// Option 4 — "Majestic". Built to the formula of the luxury digital
// invitations Agil liked (The Digital Yes): the page reads like an invitation
// on a phone — one centred column, a full-screen painted scene with the names
// in calligraphy, every section titled in calligraphy over tiny spaced
// capitals, an illustration per section, serif text on textured paper, and
// gentle movement. Pictures are the invitation film's watercolours for now;
// more section illustrations can be generated to match (see the prompts).

const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-script" });
const serif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

// fine paper grain, drawn by the browser — no image to download
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42 0 0 0 0 .35 0 0 0 0 .26 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const PALETTE = `
  .opt4 {
    --paper: #f5efe5;
    --card: #fffcf6;
    --ink: #3b3328;
    --muted: #807362;
    --gold: #a4824c;       /* the Ornament and fine lines */
    --gold-deep: #8a6a3a;  /* calligraphy titles */
    --gold-light: #dcc28f; /* gold on navy */
    --navy: #161d4a;       /* the arch in the film */
    --line: rgba(59,51,40,0.16);
  }
  body { background: #e8dfd1; }
  .opt4 .paper { background-color: var(--paper); background-image: ${GRAIN}; }
  @keyframes opt4-rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
  @keyframes opt4-drift { from { transform: scale(1.1) } to { transform: scale(1) } }
  @keyframes opt4-nudge { 0%,100% { transform: translateY(0) } 50% { transform: translateY(6px) } }
  .opt4 .rise { animation: opt4-rise 1.4s ease-out both }
  .opt4 .drift { animation: opt4-drift 14s ease-out both }
  .opt4 .nudge { animation: opt4-nudge 2.2s ease-in-out infinite }
  @media (prefers-reduced-motion: reduce) {
    .opt4 .rise, .opt4 .drift, .opt4 .nudge { animation: none }
  }
`;

const cal = { fontFamily: "var(--font-script), cursive" } as const;

function Caps({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <p className={`text-[11px] uppercase tracking-[0.32em] ${className}`} style={style}>
      {children}
    </p>
  );
}

/** A section title: calligraphy over tiny spaced capitals. */
function Title({ script: s, caps, light = false }: { script: string; caps: string; light?: boolean }) {
  return (
    <Reveal className="text-center">
      <h2
        className={`text-[54px] leading-[1.1] ${light ? "text-[var(--gold-light)]" : "text-[var(--gold-deep)]"}`}
        style={cal}
      >
        {s}
      </h2>
      <Caps className={`mt-2 ${light ? "text-white/60" : "text-[var(--muted)]"}`}>{caps}</Caps>
    </Reveal>
  );
}

/** "Add to Google Calendar" for the evening itself. */
function calendarLink(isoStart: string | null, title: string, place: string) {
  if (!isoStart) return null;
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(isoStart);
  const end = new Date(start.getTime() + 5 * 3600000);
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${fmt(start)}/${fmt(end)}`, location: place });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export default async function Option4() {
  const h = await loadHome();
  const { info } = h;
  const place = [info.venueName, info.venueAddress].filter(Boolean).join(", ");
  const calendar = calendarLink(h.isoDate, `${h.names} — wedding`, place);

  return (
    <main className={`opt4 ${script.variable} ${serif.variable} min-h-screen text-[var(--ink)]`} style={{ fontFamily: "var(--font-serif), serif" }}>
      <style>{PALETTE}</style>

      {/* One column, like an invitation held in the hand; on a computer it
          sits on the table as a card. */}
      <div className="paper mx-auto max-w-[520px] overflow-hidden sm:my-8 sm:rounded-sm sm:shadow-[0_30px_80px_-30px_rgba(59,51,40,0.45)]">

        {/* ── The painted scene ───────────────────────────────────────── */}
        <section className="relative h-[100svh] max-h-[1000px] min-h-[640px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/options/palace.jpg" alt="Buta Palace, in watercolour" className="drift absolute inset-0 h-full w-full object-cover object-bottom" />
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[var(--paper)]/50 to-transparent" />
          <div className="relative px-6 pt-[12svh] text-center text-[var(--navy)]">
            <h1 className="rise text-[62px] leading-[1.1]" style={cal}>
              {h.names}
            </h1>
            <p
              className="rise mt-3 text-[20px] tracking-[0.34em] text-[var(--navy)]/85"
              style={{ animationDelay: "0.4s" }}
            >
              {h.numeric || info.weddingDate}
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-6 text-center text-[var(--navy)]/70">
            <Caps className="text-[9px]">Scroll</Caps>
            <div className="nudge mx-auto mt-1 h-6 w-px bg-current" />
          </div>
        </section>

        {/* ── The invitation itself ──────────────────────────────────── */}
        <section className="relative pb-20">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/options/curtains.jpg" alt="" className="block w-full" />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[var(--paper)] to-transparent" />
            {/* the picture melts into the paper instead of ending in an edge */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--paper)] via-[var(--paper)]/60 to-transparent" />
          </div>
          <div className="relative -mt-4 px-8 text-center">
            <Reveal>
              <Caps className="text-[var(--muted)]">Together with their families</Caps>
              <p className="mt-4 text-[52px] leading-[1.1] text-[var(--gold-deep)]" style={cal}>{h.names}</p>
              <p className="mx-auto mt-4 max-w-xs text-[19px] italic leading-snug">
                request the pleasure of your company at the celebration of their marriage
              </p>
            </Reveal>
            <Reveal delay={150} className="mt-10">
              <div className="flex items-center justify-center gap-4">
                <span className="w-24 border-y border-[var(--line)] py-2 text-[12px] uppercase tracking-[0.3em]">{h.month}</span>
                <span className="text-[64px] leading-none text-[var(--navy)]">{h.day}</span>
                <span className="w-24 border-y border-[var(--line)] py-2 text-[12px] uppercase tracking-[0.3em]">{h.year}</span>
              </div>
              <Caps className="mt-3 text-[var(--muted)]">{h.weekday}</Caps>
              {info.ceremonyTime && <p className="mt-6 text-[17px] italic">at {info.ceremonyTime} in the evening</p>}
              <p className="mt-6 text-[40px] leading-none text-[var(--gold-deep)]" style={cal}>{info.venueName}</p>
              <Caps className="mt-3 text-[var(--muted)]">Baku, Azerbaijan</Caps>
            </Reveal>
          </div>
        </section>

        {/* ── Countdown ──────────────────────────────────────────────── */}
        {h.isoDate && (
          <section className="bg-[var(--navy)] px-6 py-16 text-center text-[#f3ead8]">
            <Title script="Countdown" caps={`Until ${info.weddingDate}`} light />
            <Reveal delay={150} className="mt-9">
              <TickingCountdown isoDate={h.isoDate} />
            </Reveal>
          </section>
        )}

        {/* ── Location ───────────────────────────────────────────────── */}
        <section className="px-7 py-20">
          <Title script="Location" caps="Where we celebrate" />
          <Reveal delay={150} className="mx-auto mt-10 max-w-[340px]">
            <div className="rounded-t-full border border-[var(--gold)]/60 p-2">
              <div className="rounded-t-full border border-[var(--gold)]/30 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/options/doors.jpg" alt="The carved doors of Buta Palace" className="block aspect-[4/5] w-full rounded-t-full object-cover object-[50%_65%]" />
              </div>
            </div>
          </Reveal>
          <Reveal className="mt-8 text-center">
            <p className="text-[15px] uppercase tracking-[0.3em] text-[var(--navy)]">{info.venueName}</p>
            {info.venueAddress && <p className="mt-2 text-[17px] italic text-[var(--muted)]">{info.venueAddress}</p>}
            {info.ceremonyTime && <p className="mt-1 text-[15px] text-[var(--muted)]">From {info.ceremonyTime}</p>}
            <div className="mt-6 flex justify-center gap-3">
              {info.mapUrl && (
                <a href={info.mapUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--navy)] px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-[#f3ead8]">
                  Google Maps
                </a>
              )}
              {calendar && (
                <a href={calendar} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--navy)]/40 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-[var(--navy)]">
                  Add to calendar
                </a>
              )}
            </div>
          </Reveal>
        </section>

        <Ornament />

        {/* ── Order of the day ───────────────────────────────────────── */}
        {h.evening && h.evening.items.length > 0 && (
          <section className="px-7 py-20">
            <Title script="Order of the Day" caps="What we have planned for you" />
            <ol className="mt-12 text-center">
              {h.evening.items.map((item, i) => (
                <li key={item.id}>
                  {i > 0 && <div className="mx-auto my-4 h-10 w-px bg-[var(--gold)]/50" aria-hidden="true" />}
                  <Reveal>
                    <Caps className="text-[var(--gold-deep)]">{item.time}</Caps>
                    <p className="mt-1 text-[24px] leading-snug">{item.title}</p>
                    {item.detail && <p className="mx-auto mt-1 max-w-xs text-[16px] italic leading-snug text-[var(--muted)]">{item.detail}</p>}
                  </Reveal>
                </li>
              ))}
            </ol>
            <Reveal className="mt-10 text-center">
              <p className="mx-auto max-w-xs text-[15px] italic text-[var(--muted)]">
                Your personal invitation shows the plan made for you.
              </p>
            </Reveal>
          </section>
        )}

        {/* ── Dress code ─────────────────────────────────────────────── */}
        <section className="px-7 pb-20">
          <Title script="Dress Code" caps="A few gentle reminders" />
          <Reveal delay={150} className="mt-10 rounded-3xl bg-[var(--card)] px-8 py-10 text-center shadow-[0_20px_50px_-30px_rgba(59,51,40,0.4)]">
            <p className="text-[28px]">{info.dressCode || "Formal attire"}</p>
            <p className="mt-3 text-[17px] leading-relaxed text-[var(--muted)]">
              We kindly ask you to dress for an evening at the palace.
            </p>
            <p className="mt-4 text-[15px] italic text-[var(--muted)]">
              October evenings in Baku are mild — bring a light layer.
            </p>
          </Reveal>
        </section>

        {/* ── Travel ─────────────────────────────────────────────────── */}
        <section className="border-t border-[var(--line)] px-7 py-20">
          <Title script="Travel" caps="For our guests from abroad" />
          <div className="mt-10 text-center">
            {h.travel.map((c, i) => (
              <Reveal key={c.head} className={i > 0 ? "mt-10" : ""}>
                <p className="text-[24px]">{c.head}</p>
                <p className="mx-auto mt-2 max-w-sm text-[17px] leading-relaxed text-[var(--muted)]">{c.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Good to know ───────────────────────────────────────────── */}
        {h.faq.length > 0 && (
          <section className="border-t border-[var(--line)] px-7 py-20">
            <Title script="Good to Know" caps="Questions, answered" />
            <div className="mt-10 text-center">
              {h.faq.map((f, i) => (
                <Reveal key={i} className={i > 0 ? "mt-8" : ""}>
                  <p className="text-[21px]">{f.head}</p>
                  {f.body && <p className="mx-auto mt-1 max-w-sm text-[16px] leading-relaxed text-[var(--muted)]">{f.body}</p>}
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* ── RSVP: find your invitation ─────────────────────────────── */}
        <section
          className="bg-[var(--navy)] px-7 py-20 text-center text-[#f3ead8]"
          style={{
            ["--field-bg" as string]: "rgba(255,255,255,0.07)",
            ["--field-border" as string]: "rgba(220,194,143,0.4)",
            ["--field-text" as string]: "#f3ead8",
            ["--field-placeholder" as string]: "rgba(243,234,216,0.45)",
            ["--btn-bg" as string]: "#dcc28f",
            ["--btn-text" as string]: "#161d4a",
          }}
        >
          <Title script="RSVP" caps="We hope you can make it" light />
          <Reveal delay={150}>
            <p className="mx-auto mt-6 max-w-sm text-[17px] leading-relaxed text-white/70">
              Every family has a personal invitation with its own timetable, table and reply
              card. We sent yours by WhatsApp — open that link, or paste it here.
            </p>
            <div className="mt-8">
              <InviteCodeForm />
            </div>
          </Reveal>
        </section>

        {/* ── Closing ────────────────────────────────────────────────── */}
        <footer className="relative pt-16 text-center">
          <Reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/options/monogram-gold.png" alt="" className="mx-auto h-16 w-auto" />
            <p className="mt-4 text-[46px] leading-tight text-[var(--gold-deep)]" style={cal}>{h.names}</p>
            <Caps className="mt-2 text-[var(--muted)]">{info.weddingDate}</Caps>
            {info.contactPhone && <p className="mt-4 text-[15px] italic text-[var(--muted)]">Any questions? Call us on {info.contactPhone}</p>}
          </Reveal>
          <div className="relative mt-10 h-72 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/options/palace.jpg" alt="" className="absolute inset-x-0 bottom-0 w-full" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--paper)] to-transparent" />
          </div>
          <a href="/dashboard" className="block pb-6 pt-2 text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]/60">
            Family sign-in
          </a>
        </footer>
      </div>
    </main>
  );
}
