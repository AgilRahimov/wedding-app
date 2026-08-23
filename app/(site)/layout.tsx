import { Cormorant_Garamond, Jost } from "next/font/google";

// The guest-facing side of the app: the homepage and every personal
// invitation. It has its own look — a dark autumn-evening palette with gold —
// deliberately unlike the family's admin screens.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-display",
});

const body = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
});

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The page itself must be dark, not just this wrapper: otherwise the
          light admin background shows through when a phone over-scrolls. */}
      {/* The guest-side palette, in one place. Change a color here and every
          guest page follows — the pages reference only these variables. */}
      <style>{`
        :root {
          --paper: #0b0f13;      /* page background — deep evening blue-black */
          --card: #12161b;       /* dark text on gold buttons */
          --ink: #e9e2d6;        /* body text — warm off-white */
          --ink-strong: #f4eee3; /* headings */
          --gold: #c9a46a;       /* the accent — brass/gold */
          --gold-bright: #d8b681;/* gold hover states */
        }
        body { background: var(--paper); }
      `}</style>
      <div
        className={`${display.variable} ${body.variable} min-h-screen bg-[var(--paper)] text-[var(--ink)]`}
        style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
      >
        {children}
      </div>
    </>
  );
}
