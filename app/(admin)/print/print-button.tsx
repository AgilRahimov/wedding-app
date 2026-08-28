"use client";

import { btnPrimary } from "@/components/ui";

export function PrintButton() {
  return (
    <button className={btnPrimary} onClick={() => window.print()}>
      Print / save as PDF
    </button>
  );
}
