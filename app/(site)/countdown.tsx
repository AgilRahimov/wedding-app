"use client";

import { useEffect, useState } from "react";

/**
 * Counts down to the wedding. Rendered empty on the server and filled in after
 * mount, so the server and browser never disagree about what time it is.
 */
export function Countdown({ isoDate }: { isoDate: string }) {
  const [parts, setParts] = useState<{ label: string; value: number }[] | null>(null);

  useEffect(() => {
    const target = new Date(isoDate).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => {
      const ms = target - Date.now();
      if (ms <= 0) {
        setParts([]);
        return;
      }
      const days = Math.floor(ms / 86400000);
      const hours = Math.floor((ms % 86400000) / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      setParts([
        { label: days === 1 ? "day" : "days", value: days },
        { label: hours === 1 ? "hour" : "hours", value: hours },
        { label: minutes === 1 ? "minute" : "minutes", value: minutes },
      ]);
    };

    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [isoDate]);

  if (!parts) return <div className="h-[74px]" />;
  if (parts.length === 0)
    return (
      <p className="font-[var(--font-display)] text-2xl text-[var(--gold)]">
        Today is the day.
      </p>
    );

  return (
    <div className="flex items-start justify-center gap-8 sm:gap-12">
      {parts.map((p) => (
        <div key={p.label} className="text-center">
          <div
            className="text-4xl font-light tabular-nums text-[var(--ink)] sm:text-5xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {p.value}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]/70">
            {p.label}
          </div>
        </div>
      ))}
    </div>
  );
}
