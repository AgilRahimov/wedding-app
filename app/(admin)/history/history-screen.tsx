"use client";

import { useMemo, useState } from "react";
import { inputCls } from "@/components/ui";

type Entry = { id: string; at: string; who: string; summary: string };

export function HistoryScreen({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const [who, setWho] = useState("all");

  const people = useMemo(
    () => [...new Set(entries.map((e) => e.who))].sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (who !== "all" && e.who !== who) return false;
      if (q && !e.summary.toLowerCase().includes(q) && !e.who.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [entries, query, who]);

  // Day dividers, newest day first (the list is already newest-first).
  const byDay = useMemo(() => {
    const days: { day: string; items: Entry[] }[] = [];
    for (const e of filtered) {
      const day = new Date(e.at).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const last = days[days.length - 1];
      if (last && last.day === day) last.items.push(e);
      else days.push({ day, items: [e] });
    }
    return days;
  }, [filtered]);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-stone-500">
          Who changed what — the last {entries.length}{" "}
          {entries.length === 1 ? "change" : "changes"}, including guests&rsquo; own
          replies. If something needs undoing wholesale, Agil can roll the whole
          database back to a recent day from Settings.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the changes…"
          className={`${inputCls} w-64 max-w-full`}
        />
        <select value={who} onChange={(e) => setWho(e.target.value)} className={inputCls}>
          <option value="all">Everyone</option>
          {people.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {byDay.length === 0 && (
        <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500 shadow-sm">
          Nothing here yet — changes made from now on will appear in this list.
        </p>
      )}

      {byDay.map(({ day, items }) => (
        <section key={day}>
          <h2 className="mb-1 mt-2 text-sm font-medium text-stone-500">{day}</h2>
          <ul className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {items.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline gap-3 border-b border-stone-100 px-4 py-2 text-sm last:border-b-0"
              >
                <span className="w-12 shrink-0 tabular-nums text-stone-400">
                  {new Date(e.at).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>
                  <span className="font-medium">{e.who}</span>{" "}
                  <span className="text-stone-600">{e.summary}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
