"use client";

export type MapTable = {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
  shape: string;
  rotation: number;
  seated: number;
  // Someone seated here has since declined — needs looking at.
  flagged?: boolean;
};

// The venue's standard table sizes. Seats beyond the standard are the
// "squeezed in" 13th/14th chair and are drawn in amber so a stretched
// table is visible at a glance.
function standardSeats(shape: string, capacity: number) {
  if (shape === "oval") return Math.min(18, capacity);
  if (shape === "half" || shape === "round") return Math.min(12, capacity);
  return capacity;
}

// Where each chair sits, relative to the table's centre, before rotation.
function seatSpots(shape: string, capacity: number): [number, number][] {
  const spots: [number, number][] = [];
  for (let i = 0; i < capacity; i++) {
    if (shape === "half") {
      // Chairs along the curve only — the flat side stays clear.
      const a = ((90 + ((i + 0.5) * 180) / capacity) * Math.PI) / 180;
      spots.push([40 * Math.cos(a), 40 * Math.sin(a)]);
    } else if (shape === "oval") {
      const t = (i / capacity) * Math.PI * 2;
      spots.push([62 * Math.cos(t), 33 * Math.sin(t)]);
    } else if (shape === "long") {
      const t = (i / capacity) * Math.PI * 2;
      spots.push([68 * Math.cos(t), 28 * Math.sin(t)]);
    } else {
      const a = (i / capacity) * Math.PI * 2 - Math.PI / 2;
      spots.push([34 * Math.cos(a), 34 * Math.sin(a)]);
    }
  }
  return spots;
}

function Shape({ shape, ...attrs }: { shape: string } & React.SVGProps<SVGElement>) {
  if (shape === "half")
    return <path d="M0 -30 A30 30 0 0 0 0 30 Z" {...(attrs as React.SVGProps<SVGPathElement>)} />;
  if (shape === "oval")
    return <ellipse rx={54} ry={25} {...(attrs as React.SVGProps<SVGEllipseElement>)} />;
  if (shape === "long")
    return (
      <rect x={-60} y={-17} width={120} height={34} rx={6} {...(attrs as React.SVGProps<SVGRectElement>)} />
    );
  return <circle r={26} {...(attrs as React.SVGProps<SVGCircleElement>)} />;
}

export function TableGlyph({
  t,
  cx,
  cy,
  guest,
  isHighlight,
  isSelected,
}: {
  t: MapTable;
  cx: number;
  cy: number;
  guest: boolean;
  isHighlight: boolean;
  isSelected: boolean;
}) {
  const over = t.seated > t.capacity;
  const full = t.seated > 0 && t.seated >= t.capacity;
  const base = standardSeats(t.shape, t.capacity);

  let fill: string, stroke: string, num: string, sub: string;
  let dashed = false;
  let sw = 1.2;
  if (guest) {
    if (isHighlight) {
      fill = "rgba(201,164,106,0.22)";
      stroke = "var(--gold-bright)";
      num = "var(--gold-bright)";
      sub = "var(--gold)";
      sw = 1.6;
    } else {
      fill = "rgba(255,255,255,0.05)";
      stroke = "rgba(255,255,255,0.14)";
      num = "rgba(255,255,255,0.4)";
      sub = "rgba(255,255,255,0.3)";
    }
  } else if (over) {
    fill = "#ffe4e6"; stroke = "#fb7185"; num = "#9f1239"; sub = "#9f1239";
  } else if (full) {
    fill = "#ecfdf5"; stroke = "#34d399"; num = "#065f46"; sub = "#047857";
  } else if (t.seated > 0) {
    fill = "#ffffff"; stroke = "#a8a29e"; num = "#44403c"; sub = "#78716c";
  } else {
    fill = "#fafaf9"; stroke = "#d6d3d1"; num = "#a8a29e"; sub = "#a8a29e";
    dashed = true;
  }
  if (!guest && isSelected) {
    stroke = "#e11d48";
    sw = 2.4;
    dashed = false;
  }

  // The label sits at the table's centre — for a half-round, the centre of the
  // half-disc, which is offset toward the curve.
  const rad = (t.rotation * Math.PI) / 180;
  const lx = t.shape === "half" ? cx - 13 * Math.cos(rad) : cx;
  const ly = t.shape === "half" ? cy - 13 * Math.sin(rad) : cy;
  const number = t.name.replace(/^Table\s+/, "");

  return (
    <>
      <title>{`${t.name} — ${t.seated} of ${t.capacity} seats taken`}</title>
      {guest && isHighlight &&
        (t.shape === "oval" ? (
          <ellipse cx={cx} cy={cy} rx={72} ry={43} transform={`rotate(${t.rotation} ${cx} ${cy})`}
            fill="none" stroke="var(--gold)" strokeOpacity={0.3} strokeWidth={5} />
        ) : (
          <circle cx={cx} cy={cy} r={t.shape === "long" ? 74 : 46}
            fill="none" stroke="var(--gold)" strokeOpacity={0.3} strokeWidth={5} />
        ))}
      <g transform={`rotate(${t.rotation} ${cx} ${cy})`}>
        <g transform={`translate(${cx} ${cy})`}>
          <Shape
            shape={t.shape}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={dashed ? "3 3" : undefined}
          />
          {!guest &&
            seatSpots(t.shape, t.capacity).map(([sx, sy], i) => {
              const taken = i < t.seated;
              const extra = i >= base;
              return (
                <circle
                  key={i}
                  cx={Math.round(sx * 10) / 10}
                  cy={Math.round(sy * 10) / 10}
                  r={3.2}
                  fill={taken ? (extra ? "#f59e0b" : "#10b981") : extra ? "none" : "#ffffff"}
                  stroke={taken ? "none" : extra ? "#f59e0b" : "#d6d3d1"}
                  strokeWidth={1.1}
                />
              );
            })}
        </g>
      </g>
      <text x={lx} y={guest && !isHighlight ? ly + 4 : ly - 1} textAnchor="middle"
        fontSize={guest ? 12 : 11} fontWeight={500} fill={num} style={{ pointerEvents: "none" }}>
        {number}
      </text>
      {!guest && (
        <text x={lx} y={ly + 10} textAnchor="middle" fontSize={7.5} fill={sub}
          style={{ pointerEvents: "none" }}>
          {t.seated}/{t.capacity}
        </text>
      )}
      {guest && isHighlight && (
        <text x={lx} y={ly + 11} textAnchor="middle" fontSize={7} letterSpacing={1.5}
          fill={sub} style={{ pointerEvents: "none" }}>
          YOU
        </text>
      )}
      {!guest && t.flagged && (
        <circle cx={cx + 20} cy={cy - 22} r={4.5} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5}>
          <title>Someone seated here has declined</title>
        </circle>
      )}
    </>
  );
}
