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
      <style>{`body { background: #0b0f13; }`}</style>
      <div
        className={`${display.variable} ${body.variable} min-h-screen bg-[#0b0f13] text-[#e9e2d6]`}
        style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
      >
        {children}
      </div>
    </>
  );
}
