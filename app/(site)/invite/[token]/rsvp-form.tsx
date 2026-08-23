"use client";

import { useState, useTransition } from "react";
import { submitRsvp, type RsvpMember, type RsvpResult } from "./actions";

type FormMember = RsvpMember & { nameEditable: boolean };

const field =
  "w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-[15px] text-[#f0e9dd] outline-none transition placeholder:text-white/25 focus:border-[#c9a46a]/60";

export function RsvpForm({
  token,
  members: initial,
  note: initialNote,
  alreadyReplied,
  isInternational,
}: {
  token: string;
  members: FormMember[];
  note: string;
  alreadyReplied: boolean;
  isInternational: boolean;
}) {
  const [members, setMembers] = useState<FormMember[]>(initial);
  const [note, setNote] = useState(initialNote);
  const [result, setResult] = useState<RsvpResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const setMember = (i: number, patch: Partial<FormMember>) =>
    setMembers(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  function submit() {
    const unanswered = members.some((m) => m.attending === null);
    if (unanswered && !confirm("Some people have no answer yet. Send anyway?")) return;
    startTransition(async () => {
      const r = await submitRsvp(
        token,
        note,
        members.map(({ nameEditable: _ignored, ...m }) => m)
      );
      setResult(r);
    });
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      {alreadyReplied && !result && (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-[14px] text-emerald-200">
          You have already replied — thank you. You can change your answer below.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {members.map((m, i) => (
          <div
            key={m.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              {m.nameEditable ? (
                <input
                  className={`${field} flex-1`}
                  value={m.name}
                  placeholder={m.isChild ? "Child's name" : "Guest name"}
                  onChange={(e) => setMember(i, { name: e.target.value })}
                />
              ) : (
                <p
                  className="text-xl font-light text-[#f0e9dd]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {m.name}
                </p>
              )}
              {m.isChild && (
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={17}
                    placeholder="age"
                    className={`${field} w-20`}
                    value={m.age ?? ""}
                    onChange={(e) =>
                      setMember(i, {
                        age: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="text-[13px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
                    onClick={() => setMembers(members.filter((_, j) => j !== i))}
                  >
                    remove
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMember(i, { attending: "yes" })}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-[13px] uppercase tracking-[0.12em] transition ${
                  m.attending === "yes"
                    ? "border-[#c9a46a] bg-[#c9a46a] text-[#12161b]"
                    : "border-white/15 text-white/55 hover:border-[#c9a46a]/50 hover:text-white/80"
                }`}
              >
                Joyfully accepts
              </button>
              <button
                type="button"
                onClick={() => setMember(i, { attending: "no" })}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-[13px] uppercase tracking-[0.12em] transition ${
                  m.attending === "no"
                    ? "border-white/50 bg-white/15 text-[#f0e9dd]"
                    : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/80"
                }`}
              >
                Regretfully declines
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="self-start text-[13px] uppercase tracking-[0.14em] text-[#c9a46a] transition hover:text-[#dcbc86]"
        onClick={() =>
          setMembers([
            ...members,
            {
              id: `new-${Date.now()}`,
              name: "",
              attending: "yes",
              isChild: true,
              age: null,
              nameEditable: true,
            },
          ])
        }
      >
        + Add a child
      </button>

      <label className="flex flex-col gap-2 text-[14px] text-white/50">
        {isInternational
          ? "Your flights, and anything else we should know"
          : "A message for us (optional)"}
        <textarea
          rows={3}
          className={field}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            isInternational
              ? "Arriving 22 Oct on J2 78 at 14:20, leaving the 25th. Two rooms please."
              : "Allergies, arrival plans, warm words…"
          }
        />
      </label>

      {result?.error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-[14px] text-rose-200">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-[14px] text-emerald-200">
          {result.ok}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="rounded-xl bg-[#c9a46a] px-5 py-3.5 text-[13px] font-medium uppercase tracking-[0.16em] text-[#12161b] transition hover:bg-[#d8b681] disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send our reply"}
      </button>
    </div>
  );
}
