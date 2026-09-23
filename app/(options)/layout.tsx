import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";

// Design options for the guest site — /option1, /option2, /option3 — so the
// family can compare looks on real phones before one becomes the homepage.
// Nothing links here and search engines are told to stay away. Each option
// defines its own palette in its page; none of it touches the real site.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const body = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
});

export default function OptionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen`}
      style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
