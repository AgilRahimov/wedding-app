"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Still to come: Travel (hotels and transfers) and Activities.
const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/guests", label: "Guests" },
  { href: "/seating", label: "Seating" },
  { href: "/programmes", label: "Programmes" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-rose-50 text-rose-700"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
