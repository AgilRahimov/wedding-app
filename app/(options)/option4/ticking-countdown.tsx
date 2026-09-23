"use client";

import { useEffect, useState } from "react";

/** Days · hours · minutes · seconds to the wedding, ticking every second. */
export function TickingCountdown({ isoDate }: { isoDate: string }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(isoDate).getTime();
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isoDate]);

  // Rendered empty on the server, so server and phone never disagree.
  if (left === null) return <div className="h-[76px]" />;
  if (left === 0)
    return (
      <p className="text-4xl" style={{ fontFamily: "var(--font-script), cursive" }}>
        Today is the day
      </p>
    );

  const parts = [
    { v: Math.floor(left / 86400000), l: "Days" },
    { v: Math.floor((left % 86400000) / 3600000), l: "Hours" },
    { v: Math.floor((left % 3600000) / 60000), l: "Minutes" },
    { v: Math.floor((left % 60000) / 1000), l: "Seconds" },
  ];
  return (
    <div className="flex items-start justify-center">
      {parts.map((p, i) => (
        <div key={p.l} className="flex items-start">
          {i > 0 && <span className="mx-3 mt-2 h-9 w-px bg-current opacity-25 sm:mx-5" aria-hidden="true" />}
          <div className="w-14 text-center sm:w-16">
            <div className="text-[40px] font-light leading-none tabular-nums">
              {String(p.v).padStart(i === 0 ? 1 : 2, "0")}
            </div>
            <div className="mt-2 text-[9px] uppercase tracking-[0.28em] opacity-70">{p.l}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
