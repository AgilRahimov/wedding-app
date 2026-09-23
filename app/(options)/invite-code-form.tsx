"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * "Paste your invitation link or code" — the same box as on the homepage,
 * coloured by the section around it through --field-* and --btn-* variables.
 */
export function InviteCodeForm({ rounded = "rounded-full" }: { rounded?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.trim().replace(/^.*\/invite\//, "").replace(/[/?#].*$/, "");
    if (cleaned) router.push(`/invite/${cleaned}`);
  }

  return (
    <form onSubmit={go} className="flex flex-col gap-3 sm:flex-row">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste your invitation link or code"
        aria-label="Your invitation code"
        className={`flex-1 ${rounded} border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-3.5 text-[15px] text-[var(--field-text)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--btn-bg)]`}
      />
      <button
        type="submit"
        className={`${rounded} bg-[var(--btn-bg)] px-8 py-3.5 text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--btn-text)] transition hover:opacity-90`}
      >
        Open
      </button>
    </form>
  );
}
