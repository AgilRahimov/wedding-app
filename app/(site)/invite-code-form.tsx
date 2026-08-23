"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * For a guest who has the wedding site open but not their WhatsApp message.
 * The code is the last part of their personal link.
 */
export function InviteCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    // Accept a bare code or the whole link pasted in.
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
        className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-[15px] text-[#e9e2d6] outline-none transition placeholder:text-white/30 focus:border-[#c9a46a]/60"
      />
      <button
        type="submit"
        className="rounded-full bg-[#c9a46a] px-7 py-3 text-[13px] font-medium uppercase tracking-[0.16em] text-[#12161b] transition hover:bg-[#d8b681]"
      >
        Open
      </button>
    </form>
  );
}
