import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Ornament } from "../ornament";

// The page behind the printed QR code on every table: guests share their
// photos from the night here. For now a placeholder, so the QR code can be
// printed and tested — the upload itself comes later (see ROADMAP.md).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share your photos",
  robots: { index: false, follow: false },
};

export default async function PhotosPage() {
  const info = await db.eventInfo.findUnique({ where: { id: 1 } });
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--gold)]/85">
        {info?.coupleNames || "Our Wedding"}
      </p>
      <h1
        className="mt-6 text-4xl font-light leading-tight tracking-tight text-[var(--ink-strong)] sm:text-5xl"
        style={{ fontFamily: "var(--font-display), serif", textWrap: "balance" }}
      >
        Share your photos
      </h1>
      <Ornament className="mt-8" />
      <p className="mt-8 text-[15px] leading-relaxed text-white/60">
        Thank you for scanning! On the night of the wedding you will be able to
        upload your photos and videos right here, so we can all relive it together.
      </p>
      <p className="mt-4 text-[13px] text-white/35">This page is being prepared — check back soon.</p>
      <a
        href="/"
        className="mt-12 text-[11px] uppercase tracking-[0.2em] text-white/25 transition hover:text-white/50"
      >
        Wedding home
      </a>
    </main>
  );
}
