"use client";

import { useActionState, useTransition } from "react";
import { addAdmin, changePassword, removeAdmin, type FormState } from "./actions";

const input =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200";

function Feedback({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.ok}
      </p>
    );
  return null;
}

export function AdminsPanel({
  admins,
  selfId,
}: {
  admins: { id: string; name: string; email: string }[];
  selfId: string;
}) {
  const [addState, addAction, addPending] = useActionState<FormState, FormData>(
    addAdmin,
    {}
  );
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(
    changePassword,
    {}
  );
  const [, startTransition] = useTransition();

  function remove(a: { id: string; name: string }) {
    if (!confirm(`Remove ${a.name}'s access? They will no longer be able to sign in.`))
      return;
    startTransition(async () => {
      try {
        await removeAdmin(a.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not remove");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-medium">Family access</h2>
        <p className="mt-1 text-sm text-stone-500">
          Everyone here can see and edit everything.
        </p>
        <ul className="mt-3 divide-y divide-stone-100">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-medium">{a.name}</span>{" "}
                <span className="text-stone-500">· {a.email}</span>
                {a.id === selfId && (
                  <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                    you
                  </span>
                )}
              </span>
              {a.id !== selfId && (
                <button
                  onClick={() => remove(a)}
                  className="text-rose-600 hover:underline"
                >
                  remove
                </button>
              )}
            </li>
          ))}
        </ul>

        <form action={addAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            Name
            <input name="name" required className={`${input} w-36`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            Email
            <input name="email" type="email" required className={`${input} w-52`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            Initial password
            <input
              name="password"
              type="text"
              required
              minLength={8}
              placeholder="min 8 characters"
              className={`${input} w-40`}
            />
          </label>
          <button
            disabled={addPending}
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50"
          >
            {addPending ? "Adding…" : "Add family member"}
          </button>
        </form>
        <div className="mt-2">
          <Feedback state={addState} />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-medium">Change my password</h2>
        <form action={pwAction} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            Current password
            <input
              name="current"
              type="password"
              required
              autoComplete="current-password"
              className={`${input} w-44`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            New password
            <input
              name="next"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={`${input} w-44`}
            />
          </label>
          <button
            disabled={pwPending}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
          >
            {pwPending ? "Saving…" : "Change password"}
          </button>
        </form>
        <div className="mt-2">
          <Feedback state={pwState} />
        </div>
      </div>
    </div>
  );
}
