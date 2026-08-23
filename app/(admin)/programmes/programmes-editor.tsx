"use client";

import { useState, useTransition } from "react";
import {
  addProgramme,
  deleteProgramme,
  saveProgramme,
  setDefaultProgramme,
  type ItemDraft,
} from "./actions";

export type ProgrammeView = {
  id: string;
  code: string;
  name: string;
  title: string;
  summary: string;
  isDefault: boolean;
  partyCount: number;
  items: ItemDraft[];
};

const input =
  "rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200";
const btn = "rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50";
const btnPrimary = `${btn} bg-rose-700 text-white hover:bg-rose-800`;
const btnGhost = `${btn} border border-stone-300 text-stone-600 hover:bg-stone-100`;

export function ProgrammesEditor({ programmes }: { programmes: ProgrammeView[] }) {
  const [openId, setOpenId] = useState<string | null>(programmes[0]?.id ?? null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Programmes</h1>
          <p className="max-w-2xl text-sm text-stone-500">
            Not every guest has the same day. Each party is put on one programme, and
            their invitation shows only that timetable — so the people gathering at the
            house see the afternoon, and everyone else just sees the evening.
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setShowAdd((v) => !v)}>
          + Add programme
        </button>
      </div>

      {showAdd && <AddProgrammePanel onDone={() => setShowAdd(false)} />}

      <div className="flex flex-col gap-3">
        {programmes.map((p) => (
          <ProgrammeCard
            key={p.id}
            programme={p}
            open={openId === p.id}
            onToggle={() => setOpenId((cur) => (cur === p.id ? null : p.id))}
          />
        ))}
      </div>
    </div>
  );
}

function ProgrammeCard({
  programme,
  open,
  onToggle,
}: {
  programme: ProgrammeView;
  open: boolean;
  onToggle: () => void;
}) {
  const [name, setName] = useState(programme.name);
  const [title, setTitle] = useState(programme.title);
  const [summary, setSummary] = useState(programme.summary);
  const [items, setItems] = useState<ItemDraft[]>(programme.items);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const setItem = (i: number, patch: Partial<ItemDraft>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const move = (i: number, by: number) => {
    const next = [...items];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  function save() {
    startTransition(async () => {
      try {
        await saveProgramme(programme.id, { name, title, summary }, items);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div
        className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 hover:bg-stone-50"
        onClick={onToggle}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-700 text-sm font-semibold text-white">
          {programme.code}
        </span>
        <div className="min-w-40 flex-1">
          <p className="font-medium">
            {programme.name}
            {programme.isDefault && (
              <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-500">
                default
              </span>
            )}
          </p>
          <p className="text-xs text-stone-500">
            {programme.title} · {programme.items.length} steps ·{" "}
            {programme.partyCount} {programme.partyCount === 1 ? "party" : "parties"}
          </p>
        </div>
        <span className="text-sm text-stone-400">{open ? "close" : "edit"}</span>
      </div>

      {open && (
        <div className="border-t border-stone-100 bg-stone-50/60 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Name the family uses
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Heading the guest sees
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-stone-600">
            Short explanation on the invitation
            <textarea
              rows={2}
              className={input}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>

          <p className="mb-2 mt-4 text-xs font-medium text-stone-600">The day, step by step</p>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-[110px_1fr_auto]"
              >
                <input
                  className={input}
                  value={item.time}
                  placeholder="14:00"
                  onChange={(e) => setItem(i, { time: e.target.value })}
                />
                <div className="flex flex-col gap-2">
                  <input
                    className={input}
                    value={item.title}
                    placeholder="What happens"
                    onChange={(e) => setItem(i, { title: e.target.value })}
                  />
                  <input
                    className={input}
                    value={item.detail}
                    placeholder="Anything the guest should know (optional)"
                    onChange={(e) => setItem(i, { detail: e.target.value })}
                  />
                  <input
                    className={input}
                    value={item.location}
                    placeholder="Where (optional)"
                    onChange={(e) => setItem(i, { location: e.target.value })}
                  />
                </div>
                <div className="flex flex-row gap-1 sm:flex-col">
                  <button
                    className="rounded border border-stone-200 px-2 text-xs text-stone-500 hover:bg-stone-100"
                    onClick={() => move(i, -1)}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="rounded border border-stone-200 px-2 text-xs text-stone-500 hover:bg-stone-100"
                    onClick={() => move(i, 1)}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="rounded border border-stone-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className={`${btnGhost} mt-2`}
            onClick={() =>
              setItems([
                ...items,
                { id: `new-${Date.now()}`, time: "", title: "", detail: "", location: "" },
              ])
            }
          >
            + Add a step
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3">
            <div className="flex flex-wrap gap-3 text-sm">
              {!programme.isDefault && (
                <>
                  <button
                    className="text-stone-600 hover:underline"
                    onClick={() =>
                      startTransition(() => setDefaultProgramme(programme.id).then(() => {}))
                    }
                  >
                    Make this the default
                  </button>
                  <button
                    className="text-rose-600 hover:underline"
                    onClick={() => {
                      if (
                        !confirm(
                          `Delete ${programme.name}? Its ${programme.partyCount} parties move to the default programme.`
                        )
                      )
                        return;
                      startTransition(async () => {
                        try {
                          await deleteProgramme(programme.id);
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Could not delete");
                        }
                      });
                    }}
                  >
                    Delete programme
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {saved && <span className="text-sm text-emerald-700">Saved ✓</span>}
              <button className={btnPrimary} onClick={save} disabled={isPending}>
                {isPending ? "Saving…" : "Save programme"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AddProgrammePanel({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await addProgramme(
          String(formData.get("code") ?? ""),
          String(formData.get("name") ?? ""),
          String(formData.get("title") ?? "")
        );
        onDone();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not add");
      }
    });
  }

  return (
    <form
      action={submit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Code
        <input name="code" required maxLength={2} placeholder="D" className={`${input} w-16`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Name
        <input name="name" placeholder="Group D" className={`${input} w-36`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
        Heading the guest sees
        <input
          name="title"
          placeholder="e.g. Arriving the day before"
          className={`${input} w-72 max-w-full`}
        />
      </label>
      <button className={btnPrimary} disabled={isPending}>
        {isPending ? "Adding…" : "Add"}
      </button>
      <button type="button" className={btnGhost} onClick={onDone}>
        Close
      </button>
    </form>
  );
}
