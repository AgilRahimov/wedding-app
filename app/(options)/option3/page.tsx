import type { Metadata } from "next";
import { Bodoni_Moda, Pinyon_Script } from "next/font/google";
import { Countdown } from "../../(site)/countdown";
import { loadHome } from "../home-data";
import { InviteCodeForm } from "../invite-code-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Option 3 · Silk & Roses" };

// Option 3 — "Silk & Roses". Blush paper, deep wine and gold, laid out like
// a wedding magazine: calligraphy for the names, a high-contrast Bodoni for
// headings and big numerals. The film's chandelier-and-monogram frame opens
// the page, its curtains introduce the evening.
const script = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-script" });
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-bodoni",
});

const PALETTE = `
  .opt3 {
    --paper: #f7f1ee;      /* blush-white silk */
    --card: #fffbf8;
    --wine: #6e2233;       /* the accent — deep wine */
    --wine-deep: #4f1624;
    --ink: #3f2b30;        /* body text */
    --ink-strong: #2e1a20;
    --muted: #7e676b;
    --rose: #ecd5cf;       /* dusty rose */
    --gold: #a9854f;
    --line: rgba(110,34,51,0.16);
    --font-display: var(--font-bodoni);
  }
  body { background: #f7f1ee; }
  .opt3 .on-wine {
    --ink: #f6e9e3; --ink-strong: #fff7f2; --muted: #d9bfc2; --gold: #e0c08d;
    --line: rgba(246,233,227,0.2);
  }
`;

const bod = { fontFamily: "var(--font-bodoni), serif" } as const;
const cal = { fontFamily: "var(--font-script), cursive" } as const;

/** A row of little silk scallops — the edge of a rose-coloured band. */
function Scallops({ color, down = false }: { color: string; down?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="h-3 w-full"
      style={{
        background: `radial-gradient(circle at 12px ${down ? "0" : "12px"}, ${color} 11.5px, transparent 12px) 0 0 / 24px 12px repeat-x`,
      }}
    />
  );
}

function Kicker({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.34em] text-[var(--gold)]">
      <span className="text-[13px] italic tracking-normal" style={bod}>{n}</span>
      <span className="h-px w-8 bg-[var(--gold)]/50" />
      {children}
    </p>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mt-4 text-center text-4xl italic leading-tight text-[var(--wine)] sm:text-5xl"
      style={{ ...bod, textWrap: "balance" }}
    >
      {children}
    </h2>
  );
}

export default async function Option3() {
  const h = await loadHome();
  const { info } = h;

  const names = (
    <h1 className="text-[18vw] leading-[1.05] text-[var(--wine)] md:text-[8.5rem]" style={cal}>
      {h.names}
    </h1>
  );

  return (
    <main
      className={`opt3 ${script.variable} ${bodoni.variable} min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]`}
    >
      <style>{PALETTE}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────
          Phone: the chandelier and monogram, the names written beneath.
          Computer: the picture fills the left half, like a magazine spread. */}
      <section className="md:grid md:min-h-screen md:grid-cols-2">
        <div className="relative md:order-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/options/monogram.jpg"
            alt="A crystal chandelier over the couple's monogram"
            className="block w-full md:absolute md:inset-0 md:h-full md:object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--paper)] to-transparent md:hidden" />
        </div>
        <div className="relative mt-4 px-6 pb-16 text-center md:order-2 md:mt-0 md:flex md:flex-col md:items-center md:justify-center md:px-14">
          <p className="text-[11px] uppercase tracking-[0.36em] text-[var(--gold)]">
            Together with our families
          </p>
          <div className="mt-3">{names}</div>
          <p className="mt-2 text-[12px] uppercase tracking-[0.34em] text-[var(--muted)]">
            invite you to celebrate their wedding
          </p>

          {/* the date, set like a printed invitation */}
          <div className="mx-auto mt-10 flex max-w-sm items-center justify-center gap-5 text-[var(--ink-strong)]">
            <span className="w-24 border-y border-[var(--line)] py-2 text-[11px] uppercase tracking-[0.28em]">
              {h.weekday}
            </span>
            <span className="text-center">
              <span className="block text-[11px] uppercase tracking-[0.3em] text-[var(--gold)]">{h.month}</span>
              <span className="block text-6xl leading-none text-[var(--wine)]" style={bod}>{h.day}</span>
              <span className="block text-[11px] tracking-[0.3em] text-[var(--gold)]">{h.year}</span>
            </span>
            <span className="w-24 border-y border-[var(--line)] py-2 text-[11px] uppercase tracking-[0.28em]">
              {info.ceremonyTime || "Evening"}
            </span>
          </div>
          <p className="mt-8 text-lg italic text-[var(--ink)]" style={bod}>
            {info.venueName}
            {info.venueName ? ", Baku" : ""}
          </p>
        </div>
      </section>

      {/* ── Countdown on a rose silk band ─────────────────────────────── */}
      <Scallops color="var(--rose)" />
      <section className="bg-[var(--rose)] px-6 py-12 text-center" style={{ ["--gold" as string]: "#8c5a4a", ["--ink" as string]: "#6e2233" }}>
        <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--wine)]/80">Until we say yes</p>
        {h.isoDate && (
          <div className="mt-6">
            <Countdown isoDate={h.isoDate} />
          </div>
        )}
      </section>
      <Scallops color="var(--rose)" down />

      {/* ── The details, as an editorial list ─────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <Kicker n="i">The essentials</Kicker>
        <Heading>When &amp; where</Heading>
        <dl className="mt-12 border-t border-[var(--line)]">
          {[
            { k: "Date", v: `${h.weekday ? h.weekday + ", " : ""}${info.weddingDate}` },
            { k: "Time", v: info.ceremonyTime ? `${info.ceremonyTime} — doors open half an hour before` : "Evening" },
            { k: "Venue", v: [info.venueName, info.venueAddress].filter(Boolean).join(" · ") },
            { k: "Dress", v: `${info.dressCode || "Formal"} — October evenings are mild, bring a light layer` },
          ].map((r) => (
            <div key={r.k} className="grid grid-cols-[88px_1fr] gap-4 border-b border-[var(--line)] py-5 sm:grid-cols-[140px_1fr]">
              <dt className="pt-1 text-[11px] uppercase tracking-[0.3em] text-[var(--gold)]">{r.k}</dt>
              <dd className="text-xl leading-snug text-[var(--ink-strong)]" style={bod}>{r.v}</dd>
            </div>
          ))}
        </dl>
        {info.mapUrl && (
          <p className="mt-8 text-center">
            <a
              href={info.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block border-b border-[var(--wine)] pb-1 text-[12px] uppercase tracking-[0.28em] text-[var(--wine)] transition hover:opacity-70"
            >
              Open in maps →
            </a>
          </p>
        )}
      </section>

      {/* ── The evening, beneath the curtains ─────────────────────────── */}
      {h.evening && h.evening.items.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-20 sm:pb-24">
          <div className="mx-auto max-w-lg overflow-hidden rounded-t-[50%_62%] border border-[var(--gold)]/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/options/curtains.jpg"
              alt="Silk curtains and a chandelier"
              className="block w-full rounded-t-[50%_62%]"
            />
          </div>
          <div className="mt-12">
            <Kicker n="ii">The evening</Kicker>
            <Heading>How the night unfolds</Heading>
          </div>
          <ol className="mt-12">
            {h.evening.items.map((item) => (
              <li key={item.id} className="grid grid-cols-[96px_1fr] items-baseline gap-5 border-t border-[var(--line)] py-6 last:border-b sm:grid-cols-[140px_1fr]">
                <span className="text-3xl italic tabular-nums text-[var(--wine)] sm:text-4xl" style={bod}>
                  {item.time}
                </span>
                <span>
                  <span className="block text-xl text-[var(--ink-strong)]" style={bod}>{item.title}</span>
                  {item.detail && <span className="mt-1.5 block text-[14px] leading-relaxed text-[var(--muted)]">{item.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Travelling to Baku ────────────────────────────────────────── */}
      <section className="bg-[var(--card)] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <Kicker n="iii">Coming from abroad</Kicker>
          <Heading>Travelling to Baku</Heading>
          <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {h.travel.map((c, i) => (
              <div key={c.head} className="text-center">
                <p className="text-[13px] italic tracking-[0.2em] text-[var(--gold)]" style={bod}>— {String(i + 1).padStart(2, "0")} —</p>
                <h3 className="mt-2 text-2xl italic text-[var(--wine)]" style={bod}>{c.head}</h3>
                <p className="mx-auto mt-3 max-w-xs text-[14px] leading-relaxed text-[var(--muted)]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      {h.faq.length > 0 && (
        <section className="mx-auto max-w-2xl px-6 py-20">
          <Kicker n="iv">Good to know</Kicker>
          <Heading>Questions, answered</Heading>
          <div className="mt-10 border-t border-[var(--line)]">
            {h.faq.map((f, i) => (
              <div key={i} className="border-b border-[var(--line)] py-5">
                <p className="text-xl italic text-[var(--wine)]" style={bod}>{f.head}</p>
                {f.body && <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted)]">{f.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Find your invitation, on wine ─────────────────────────────── */}
      <section
        className="on-wine bg-[var(--wine)] px-6 py-20 text-center sm:py-24"
        style={{
          ["--field-bg" as string]: "rgba(255,255,255,0.08)",
          ["--field-border" as string]: "rgba(246,233,227,0.3)",
          ["--field-text" as string]: "#fff7f2",
          ["--field-placeholder" as string]: "rgba(246,233,227,0.45)",
          ["--btn-bg" as string]: "#f6e9e3",
          ["--btn-text" as string]: "#6e2233",
        }}
      >
        <div className="mx-auto max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--gold)]">Your invitation</p>
          <h2 className="mt-3 text-6xl leading-tight text-[var(--ink-strong)] sm:text-7xl" style={cal}>
            Find your table
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[var(--muted)]">
            Every family has a personal invitation — your timetable, your table and your travel.
            We sent yours by WhatsApp: open that link, or paste it here.
          </p>
          <div className="mt-8">
            <InviteCodeForm />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="on-wine bg-[var(--wine-deep)] px-6 py-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/options/monogram-cream.png" alt="" className="mx-auto h-20 w-auto opacity-90" />
        <p className="mt-5 text-4xl text-[var(--ink-strong)]" style={cal}>{h.names}</p>
        {info.contactPhone && (
          <p className="mt-3 text-[14px] text-[var(--muted)]">Any questions? Call us on {info.contactPhone}</p>
        )}
        <a
          href="/dashboard"
          className="mt-8 inline-block text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]/70 transition hover:text-[var(--ink)]"
        >
          Family sign-in
        </a>
      </footer>
    </main>
  );
}
