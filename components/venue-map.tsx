"use client";

import { useRef } from "react";

export type MapTable = {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
  shape: string;
  seated: number;
  // Something here needs looking at — currently, someone seated who has declined.
  flagged?: boolean;
};

/**
 * The floor plan of the room, shared by the family's seating screen and the
 * guest's own invitation page — so a guest sees exactly the same room the
 * family arranged. Table positions are percentages, so the plan scales to
 * any screen without a fixed pixel size anywhere.
 *
 * The room furniture (stage, dance floor, entrance) is a placeholder layout
 * until we have the real plan from Buta Palace.
 */
export function VenueMap({
  tables,
  variant = "admin",
  highlightTableId = null,
  selectedTableId = null,
  onTableClick,
  onTableMove,
  editLayout = false,
}: {
  tables: MapTable[];
  variant?: "admin" | "guest";
  highlightTableId?: string | null;
  selectedTableId?: string | null;
  onTableClick?: (tableId: string) => void;
  onTableMove?: (tableId: string, x: number, y: number) => void;
  editLayout?: boolean;
}) {
  const roomRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);

  const guest = variant === "guest";

  const room = guest
    ? "border-white/15 bg-white/[0.03]"
    : "border-stone-300 bg-stone-100/70";
  const furniture = guest
    ? "border-white/10 bg-white/[0.04] text-white/40"
    : "border-stone-300 bg-white/70 text-stone-400";

  function pointerMove(e: React.PointerEvent) {
    if (!dragging.current || !onTableMove || !roomRef.current) return;
    const box = roomRef.current.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, ((e.clientX - box.left) / box.width) * 100));
    const y = Math.min(95, Math.max(5, ((e.clientY - box.top) / box.height) * 100));
    onTableMove(dragging.current, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }

  return (
    <div
      ref={roomRef}
      onPointerMove={pointerMove}
      onPointerUp={() => (dragging.current = null)}
      onPointerLeave={() => (dragging.current = null)}
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border ${room}`}
    >
      {/* Room furniture — placeholder until the venue sends the real plan */}
      <div
        className={`absolute left-1/2 top-[3%] h-[9%] w-[34%] -translate-x-1/2 rounded-md border text-[9px] ${furniture}`}
      >
        <span className="absolute inset-0 grid place-items-center tracking-[0.2em] uppercase">
          Stage
        </span>
      </div>
      <div
        className={`absolute left-1/2 top-[26%] h-[58%] w-[16%] -translate-x-1/2 rounded-lg border border-dashed text-[9px] ${furniture}`}
      >
        <span className="absolute inset-0 grid place-items-center text-center leading-tight tracking-[0.15em] uppercase">
          Dance
          <br />
          floor
        </span>
      </div>
      <div
        className={`absolute bottom-[2%] left-1/2 h-[6%] w-[22%] -translate-x-1/2 rounded-md border text-[9px] ${furniture}`}
      >
        <span className="absolute inset-0 grid place-items-center tracking-[0.2em] uppercase">
          Entrance
        </span>
      </div>

      {tables.map((t) => {
        const full = t.seated >= t.capacity;
        const over = t.seated > t.capacity;
        const isHighlight = t.id === highlightTableId;
        const isSelected = t.id === selectedTableId;

        const size =
          t.shape === "long"
            ? "h-[7%] w-[24%] rounded-md"
            : "h-[10%] w-[7.5%] rounded-full";

        let tone: string;
        if (guest) {
          tone = isHighlight
            ? "border-amber-300/80 bg-amber-300/20 text-amber-100 shadow-[0_0_0_4px_rgba(252,211,77,0.12)]"
            : "border-white/15 bg-white/[0.06] text-white/45";
        } else if (over) {
          tone = "border-rose-400 bg-rose-100 text-rose-800";
        } else if (isSelected) {
          tone = "border-rose-600 bg-rose-600 text-white";
        } else if (full) {
          tone = "border-emerald-400 bg-emerald-50 text-emerald-800";
        } else if (t.seated > 0) {
          tone = "border-stone-400 bg-white text-stone-700";
        } else {
          tone = "border-dashed border-stone-300 bg-white/60 text-stone-400";
        }

        return (
          <button
            key={t.id}
            type="button"
            disabled={!onTableClick && !editLayout}
            onPointerDown={(e) => {
              if (!editLayout) return;
              dragging.current = t.id;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            }}
            onClick={() => !editLayout && onTableClick?.(t.id)}
            title={`${t.name} — ${t.seated} of ${t.capacity} seats`}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 border transition ${size} ${tone} ${
              // The guest's own table is drawn larger so it reads at a glance,
              // and so "You" still fits inside it on a phone.
              guest && isHighlight ? "z-10 scale-[1.4]" : ""
            } ${
              editLayout ? "cursor-move" : onTableClick ? "cursor-pointer hover:brightness-95" : "cursor-default"
            }`}
          >
            {t.flagged && !guest && (
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-amber-500"
                title="Someone seated here has declined"
              />
            )}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-px px-1 leading-none">
              <span className="truncate text-[9px] font-medium">
                {t.name.replace(/^Table /, "T")}
              </span>
              {!guest && (
                <span className="text-[8px] tabular-nums opacity-70">
                  {t.seated}/{t.capacity}
                </span>
              )}
              {guest && isHighlight && (
                <span className="text-[8px] uppercase tracking-wider">You</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
