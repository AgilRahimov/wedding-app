import type { Metadata } from "next";
import { Countdown } from "../../(site)/countdown";
import { Ornament } from "../../(site)/ornament";
import { loadHome } from "../home-data";
import { InviteCodeForm } from "../invite-code-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Option 2 · The Palace" };

// Option 2 — "The Palace". Ivory paper, the deep navy of the arch in the
// invitation film, and gold. The film's own watercolours are the pictures:
// the palace under a pink sky opens the page, the carved doors close it.
// Colours sampled from the film: navy #101543, sky #ebd0c5, gold #b69977.
const PALETTE = `
  .opt2 {
    --paper: #f8f2e8;      /* ivory, the palace's sky and ground */
    --card: #fffaf2;
    --navy: #141a47;       /* the arch */
    --navy-deep: #0e1340;
    --ink: #262b4d;        /* body text: navy, softened */
    --ink-strong: #141a47; /* headings */
    --muted: #6a6878;
    --line: rgba(20,26,71,0.13);
    --gold: #a4824c;       /* gold that reads on ivory */
    --gold-light: #d8bc84; /* gold that reads on navy */
    --blush: #efdcd3;      /* the pink sky */
    --cream: #f4ead8;      /* text on navy */
  }
  body { background: #f8f2e8; }
  /* the navy sections re-point the colours so shared pieces (countdown,
     ornament) turn light on dark */
  .opt2 .on-navy {
    --ink: #f4ead8; --ink-strong: #fbf5ea; --gold: #d8bc84; --muted: #b9b6c9;
    --line: rgba(216,188,132,0.25);
  }
`;

const display = { fontFamily: "var(--font-display), serif" } as const;

/** The pointed top of the palace arch, sitting on a navy section. */
function ArchCap() {
  return (
    <svg
      viewBox="0 0 600 90"
      className="mx-auto -mb-px block h-16 w-full max-w-[640px] sm:h-[76px]"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d="M0 90 C 185 90 258 66 300 4 C 342 66 415 90 600 90 Z" fill="var(--navy)" />
      <path
        d="M70 90 C 218 90 272 72 300 30 C 328 72 382 90 530 90"
        fill="none"
        stroke="var(--gold-light)"
        strokeWidth="1.2"
        opacity="0.8"
      />
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[11px] uppercase tracking-[0.34em] text-[var(--gold)]">
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mt-3 text-center text-4xl font-light italic tracking-tight text-[var(--ink-strong)] sm:text-5xl"
      style={{ ...display, textWrap: "balance" }}
    >
      {children}
    </h2>
  );
}

export default async function Option2() {
  const h = await loadHome();
  const { info } = h;

  const heroText = (
    <>
      <p className="text-[11px] uppercase tracking-[0.36em] text-[var(--gold)]">
        Together with our families
      </p>
      <h1
        className="mt-5 text-[17vw] font-light italic leading-[0.9] tracking-tight text-[var(--ink-strong)] md:text-8xl lg:text-9xl"
        style={display}
      >
        {h.names}
      </h1>
      <p className="mt-5 text-[13px] uppercase tracking-[0.3em] text-[var(--ink)]">
        {h.weekday && `${h.weekday} · `}
        {info.weddingDate}
      </p>
      <p className="mt-2 text-[13px] uppercase tracking-[0.3em] text-[var(--gold)]">
        {info.venueName}
        {info.venueName ? " · Baku" : ""}
      </p>
    </>
  );

  return (
    <main className="opt2 min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <style>{PALETTE}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────
          Phone: the palace fills the width; the names sit in its pink sky.
          Computer: names on the left, the palace in an arched window. */}
      <section className="md:hidden">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/options/palace.jpg" alt="Buta Palace, in watercolour" className="block w-full" />
          <div className="absolute inset-x-0 top-0 px-6 pt-[9vw] text-center">{heroText}</div>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--paper)] to-transparent" />
        </div>
      </section>
      <section className="relative mx-auto hidden min-h-screen max-w-6xl grid-cols-[1.1fr_1fr] items-center gap-16 px-12 py-16 md:grid">
        <div
          className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--blush) 0%, transparent 70%)" }}
          aria-hidden="true"
        />
        <div className="relative text-center">{heroText}</div>
        <div className="relative mx-auto w-full max-w-[420px]">
          <div className="absolute -inset-3 rounded-t-full border border-[var(--gold)]/50" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/options/palace.jpg"
            alt="Buta Palace, in watercolour"
            className="relative block aspect-[9/15] w-full rounded-t-full object-cover object-[50%_70%] shadow-[0_30px_60px_-30px_rgba(20,26,71,0.45)]"
          />
        </div>
      </section>

      {/* ── Countdown, under the arch ──────────────────────────────────── */}
      <div className="relative z-10 -mt-10 md:mt-0">
        <ArchCap />
        <section className="on-navy bg-[var(--navy)] px-6 pb-16 pt-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--gold)]">
            Counting the days
          </p>
          {h.isoDate && (
            <div className="mt-8">
              <Countdown isoDate={h.isoDate} />
            </div>
          )}
          <Ornament className="mt-10" />
        </section>
      </div>

      {/* ── The essentials: three arched cards ────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <Eyebrow>The essentials</Eyebrow>
        <Title>When and where</Title>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            { label: "The date", value: info.weddingDate || "To be confirmed", sub: h.weekday },
            { label: "The time", value: info.ceremonyTime || "Evening", sub: "Doors open half an hour before" },
            { label: "Dress", value: info.dressCode || "Formal", sub: "October evenings in Baku are mild — bring a light layer" },
          ].map((d) => (
            <div
              key={d.label}
              className="relative rounded-b-2xl rounded-t-[50%_90px] border sm:rounded-t-[999px] border-[var(--gold)]/35 bg-[var(--card)] px-6 pb-8 pt-14 text-center shadow-[0_18px_40px_-28px_rgba(20,26,71,0.35)]"
            >
              <div className="pointer-events-none absolute inset-2 rounded-b-xl rounded-t-[50%_84px] border sm:rounded-t-[999px] border-[var(--gold)]/15" aria-hidden="true" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">{d.label}</p>
              <p className="mt-4 text-3xl font-light italic text-[var(--ink-strong)]" style={display}>
                {d.value}
              </p>
              {d.sub && <p className="mx-auto mt-3 max-w-[220px] text-[13px] leading-relaxed text-[var(--muted)]">{d.sub}</p>}
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-[var(--blush)]/60 p-8 text-center sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">The venue</p>
          <p className="mt-3 text-4xl font-light italic text-[var(--ink-strong)]" style={display}>
            {info.venueName}
          </p>
          {info.venueAddress && <p className="mt-2 text-[15px] text-[var(--muted)]">{info.venueAddress}</p>}
          {info.mapUrl && (
            <a
              href={info.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block rounded-full bg-[var(--navy)] px-7 py-3 text-[11px] uppercase tracking-[0.24em] text-[var(--cream)] transition hover:bg-[var(--navy-deep)]"
            >
              Open in maps
            </a>
          )}
        </div>
      </section>

      {/* ── The evening, on navy ──────────────────────────────────────── */}
      {h.evening && h.evening.items.length > 0 && (
        <section className="on-navy relative bg-[var(--navy)] px-6 py-20 sm:py-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{ background: "radial-gradient(60% 40% at 50% 0%, rgba(216,188,132,0.25), transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl">
            <Eyebrow>The evening</Eyebrow>
            <Title>How the night unfolds</Title>
            <p className="mx-auto mt-5 max-w-md text-center text-[15px] leading-relaxed text-[var(--muted)]">
              Your own invitation shows the plan made for you — this is the shape of the evening itself.
            </p>
            <ol className="relative mt-14 border-l border-[var(--gold)]/40 pl-8 sm:ml-24">
              {h.evening.items.map((item) => (
                <li key={item.id} className="relative pb-10 last:pb-0">
                  <span className="absolute -left-[37px] top-2 h-2.5 w-2.5 rotate-45 bg-[var(--gold)]" aria-hidden="true" />
                  <p className="text-[13px] tabular-nums tracking-[0.2em] text-[var(--gold)] sm:absolute sm:-left-36 sm:top-1 sm:w-24 sm:text-right">
                    {item.time}
                  </p>
                  <p className="mt-1 text-2xl font-light italic text-[var(--ink-strong)] sm:mt-0" style={display}>
                    {item.title}
                  </p>
                  {item.detail && <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{item.detail}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── Travelling to Baku ────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <Eyebrow>Coming from abroad</Eyebrow>
        <Title>Travelling to Baku</Title>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {h.travel.map((c, i) => (
            <div key={c.head} className="border-t-2 border-[var(--gold)]/60 bg-[var(--card)] p-7">
              <p className="text-3xl font-light italic text-[var(--gold)]" style={display}>
                {["I", "II", "III", "IV", "V", "VI"][i] ?? i + 1}
              </p>
              <h3 className="mt-3 text-2xl font-light text-[var(--ink-strong)]" style={display}>
                {c.head}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      {h.faq.length > 0 && (
        <section className="mx-auto max-w-2xl px-6 pb-20">
          <Ornament />
          <div className="mt-10">
            <Eyebrow>Good to know</Eyebrow>
            <Title>Questions, answered</Title>
          </div>
          <div className="mt-10 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {h.faq.map((f, i) => (
              <div key={i} className="py-5">
                <p className="text-xl italic text-[var(--ink-strong)]" style={display}>{f.head}</p>
                {f.body && <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted)]">{f.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── The doors are open: find your invitation ──────────────────── */}
      <div>
        <ArchCap />
        <section
          className="on-navy bg-[var(--navy)] px-6 pb-20 pt-8"
          style={{
            ["--field-bg" as string]: "rgba(255,255,255,0.06)",
            ["--field-border" as string]: "rgba(216,188,132,0.35)",
            ["--field-text" as string]: "#f4ead8",
            ["--field-placeholder" as string]: "rgba(244,234,216,0.4)",
            ["--btn-bg" as string]: "#d8bc84",
            ["--btn-text" as string]: "#141a47",
          }}
        >
          <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[1fr_1.2fr]">
            <div className="relative mx-auto w-[62%] max-w-[300px] md:w-full">
              <div className="absolute -inset-2.5 rounded-t-full border border-[var(--gold)]/50" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/options/doors.jpg"
                alt="The carved doors of the palace"
                className="relative block aspect-[3/4] w-full rounded-t-full object-cover object-[50%_60%]"
              />
            </div>
            <div className="text-center md:text-left">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--gold)]">Your invitation</p>
              <h2 className="mt-4 text-5xl font-light italic leading-tight text-[var(--ink-strong)]" style={display}>
                The doors are open
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--muted)] md:max-w-none">
                Every family has a personal invitation — your timetable, your table and your
                travel. We sent yours by WhatsApp: open that link, or paste it here.
              </p>
              <div className="mt-8">
                <InviteCodeForm />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="px-6 py-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/options/monogram-gold.png" alt="" className="mx-auto h-20 w-auto" />
        <p className="mt-6 text-3xl font-light italic text-[var(--ink-strong)]" style={display}>
          {h.names}
        </p>
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
