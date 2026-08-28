"use client";

import { useEffect, useRef, useState } from "react";
import { ROOM_CANVAS } from "@/lib/room-layout";
import { TableGlyph, type MapTable } from "./venue-table";

export type { MapTable };

const W = ROOM_CANVAS.w;
const H = ROOM_CANVAS.h;

/**
 * The floor plan of the Buta Palace hall, drawn from the venue's own plan:
 * stage and apron at the top, the runway down the middle, the couple's
 * platform and the two entrances at the bottom. Shared by the family's
 * seating screen and the guest's invitation page, so a guest sees exactly
 * the room the family arranged — minus who sits where, which stays private.
 *
 * Table positions are percentages of the canvas, so the plan scales to any
 * screen. The family's view can zoom (pinch on an iPad, ⌘/ctrl-scroll or the
 * buttons on a laptop) and pan by dragging the background.
 */
export function VenueMap({
  tables,
  variant = "admin",
  highlightTableId = null,
  selectedTableId = null,
  onTableClick,
  onTableMove,
  editLayout = false,
  platformLabel = "Agil & Samra",
}: {
  tables: MapTable[];
  variant?: "admin" | "guest";
  highlightTableId?: string | null;
  selectedTableId?: string | null;
  onTableClick?: (tableId: string) => void;
  onTableMove?: (tableId: string, x: number, y: number) => void;
  editLayout?: boolean;
  platformLabel?: string;
}) {
  const guest = variant === "guest";
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ s: 1, tx: 0, ty: 0 });

  // Fingers/pointers currently down, in canvas coordinates — two at once is a pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragTable = useRef<string | null>(null);
  const panning = useRef<{ x: number; y: number } | null>(null);
  // How far the pointer travelled while down — a real pan must not end in a table click.
  const moved = useRef(0);

  function toCanvas(clientX: number, clientY: number): [number, number] {
    const rect = svgRef.current!.getBoundingClientRect();
    return [((clientX - rect.left) / rect.width) * W, ((clientY - rect.top) / rect.height) * H];
  }

  function clamped(s: number, tx: number, ty: number) {
    const s2 = Math.min(4, Math.max(1, s));
    return {
      s: s2,
      tx: Math.min(0, Math.max(W * (1 - s2), tx)),
      ty: Math.min(0, Math.max(H * (1 - s2), ty)),
    };
  }

  function zoomAt(vx: number, vy: number, factor: number) {
    setView((v) => {
      const s2 = Math.min(4, Math.max(1, v.s * factor));
      const k = s2 / v.s;
      return clamped(s2, vx - (vx - v.tx) * k, vy - (vy - v.ty) * k);
    });
  }

  // Trackpad pinch arrives as ctrl+wheel; a plain scroll keeps scrolling the page.
  useEffect(() => {
    if (guest) return;
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const vx = ((e.clientX - rect.left) / rect.width) * W;
      const vy = ((e.clientY - rect.top) / rect.height) * H;
      zoomAt(vx, vy, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [guest]);

  function onPointerDown(e: React.PointerEvent) {
    if (guest) return;
    const [x, y] = toCanvas(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, { x, y });
    svgRef.current?.setPointerCapture(e.pointerId);
    moved.current = 0;
    if (!dragTable.current && pointers.current.size === 1) panning.current = { x, y };
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const [x, y] = toCanvas(e.clientX, e.clientY);
    moved.current += Math.hypot(x - prev.x, y - prev.y);

    if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
      pointers.current.set(e.pointerId, { x, y });
      if (!other) return;
      const oldDist = Math.hypot(prev.x - other.x, prev.y - other.y);
      const newDist = Math.hypot(x - other.x, y - other.y);
      if (oldDist > 0) zoomAt((x + other.x) / 2, (y + other.y) / 2, newDist / oldDist);
      return;
    }
    pointers.current.set(e.pointerId, { x, y });

    if (dragTable.current && editLayout && onTableMove) {
      const cx = (x - view.tx) / view.s;
      const cy = (y - view.ty) / view.s;
      const px = Math.min(96, Math.max(4, (cx / W) * 100));
      const py = Math.min(97, Math.max(2, (cy / H) * 100));
      onTableMove(dragTable.current, Math.round(px * 10) / 10, Math.round(py * 10) / 10);
    } else if (panning.current) {
      const dx = x - panning.current.x;
      const dy = y - panning.current.y;
      panning.current = { x, y };
      setView((v) => clamped(v.s, v.tx + dx, v.ty + dy));
    }
  }

  function onPointerEnd(e: React.PointerEvent) {
    // Taps are detected here rather than with onClick: pointer capture on the
    // svg retargets pointerup to it, which stops the browser's own click from
    // ever reaching a table. A short press that didn't drag or pan is a tap.
    const wasTap =
      pointers.current.has(e.pointerId) &&
      pointers.current.size === 1 &&
      moved.current < 8 &&
      !editLayout &&
      onTableClick;
    if (wasTap) {
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const id = hit?.closest?.("[data-table-id]")?.getAttribute("data-table-id");
      if (id) onTableClick(id);
    }
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      dragTable.current = null;
      panning.current = null;
    }
  }

  const wall = guest ? "rgba(255,255,255,0.16)" : "#d6d3d1";
  const surf = guest ? "rgba(255,255,255,0.04)" : "#f5f5f4";
  const label = guest ? "rgba(255,255,255,0.35)" : "#a8a29e";
  const platFill = guest ? "rgba(201,164,106,0.12)" : "#fef3c7";
  const platStroke = guest ? "rgba(201,164,106,0.45)" : "#fcd34d";
  const platText = guest ? "var(--gold-bright)" : "#92400e";
  const arrows = guest ? "rgba(201,164,106,0.55)" : "#b45309";

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Floor plan of the hall"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={`block w-full rounded-xl border ${
          guest ? "border-white/15 bg-white/[0.02]" : "border-stone-200 bg-white"
        }`}
        style={{ height: "auto", touchAction: guest ? undefined : "none" }}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
          {/* The room itself */}
          <rect x={180} y={18} width={340} height={84} rx={6} fill={surf} stroke={wall} />
          <text x={350} y={66} textAnchor="middle" fontSize={11} letterSpacing={3} fill={label}>
            STAGE
          </text>
          <path
            d="M130 100 H570 L670 200 V780 L570 880 H130 L30 780 V200 Z"
            fill="none"
            stroke={wall}
            strokeWidth={1.5}
          />
          <rect x={310} y={102} width={80} height={598} fill={surf} />
          <path d="M302 102 A48 48 0 0 0 398 102 Z" fill={surf} stroke={wall} />
          <text x={350} y={420} textAnchor="middle" fontSize={9} letterSpacing={4} fill={label}
            transform="rotate(90 350 420)">
            RUNWAY
          </text>
          <rect x={296} y={700} width={108} height={78} rx={8} fill={platFill} stroke={platStroke} />
          <text x={350} y={743} textAnchor="middle" fontSize={10} fill={platText}>
            {platformLabel}
          </text>
          <line x1={210} y1={928} x2={210} y2={902} stroke={arrows} strokeWidth={3} />
          <path d="M204 906 L210 894 L216 906 Z" fill={arrows} />
          <line x1={490} y1={928} x2={490} y2={902} stroke={arrows} strokeWidth={3} />
          <path d="M484 906 L490 894 L496 906 Z" fill={arrows} />
          <text x={350} y={922} textAnchor="middle" fontSize={10} letterSpacing={2} fill={label}>
            ENTRANCE
          </text>

          {tables.map((t) => (
            <g
              key={t.id}
              data-table-id={t.id}
              role={onTableClick && !guest ? "button" : undefined}
              aria-label={`${t.name} — ${t.seated} of ${t.capacity} seats taken`}
              onPointerDown={() => {
                if (editLayout) dragTable.current = t.id;
              }}
              style={{
                cursor: editLayout
                  ? "move"
                  : onTableClick
                    ? "pointer"
                    : "default",
              }}
            >
              <TableGlyph
                t={t}
                cx={(t.x / 100) * W}
                cy={(t.y / 100) * H}
                guest={guest}
                isHighlight={t.id === highlightTableId}
                isSelected={t.id === selectedTableId}
              />
            </g>
          ))}
        </g>
      </svg>

      {!guest && (
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomAt(W / 2, H / 2, 1.4)}
            className="h-8 w-8 rounded-lg border border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomAt(W / 2, H / 2, 1 / 1.4)}
            className="h-8 w-8 rounded-lg border border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50"
          >
            −
          </button>
          {view.s > 1 && (
            <button
              type="button"
              aria-label="Reset zoom"
              onClick={() => setView({ s: 1, tx: 0, ty: 0 })}
              className="h-8 w-8 rounded-lg border border-stone-200 bg-white text-xs text-stone-600 shadow-sm hover:bg-stone-50"
            >
              1×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
