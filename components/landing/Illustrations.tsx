import type { CSSProperties } from "react";

const vars = (v: Record<string, string | number>) => v as CSSProperties;

// Top-down coach: 2+2 seater rows up front, sleeper berths at the back.
const SEAT_COLS = [72, 96, 120, 144, 168];
const SEAT_ROWS = [36, 58, 106, 128];
const BERTH_COLS = [192, 246];
const BERTH_ROWS = [36, 60, 104, 128];

function BusOutline() {
  return (
    <>
      <rect x="12" y="22" width="296" height="140" rx="24" className="plan-body" />
      {/* Windscreen and steering wheel */}
      <path d="M40 30 Q28 92 40 154" className="plan-line" />
      <circle cx="54" cy="58" r="8" className="plan-line" />
      {/* Aisle */}
      <path d="M62 92 H300" className="plan-aisle" />
    </>
  );
}

/** "pick": one seat and one berth light up. "fill": the whole bus fills, back to front. */
export function BusPlan({ mode, label }: { mode: "pick" | "fill"; label: string }) {
  const picked = (kind: "seat" | "berth", c: number, r: number) =>
    mode === "pick" && ((kind === "seat" && c === 2 && r === 0) || (kind === "berth" && c === 1 && r === 2));

  const cls = (kind: "seat" | "berth", c: number, r: number) =>
    mode === "fill" ? "plan-seat plan-fill" : picked(kind, c, r) ? "plan-seat plan-pick" : "plan-seat";

  // Fill order runs from the back of the bus (right) to the front.
  const order = (x: number) => Math.round((308 - x) / 24);

  return (
    <svg viewBox="0 0 320 192" role="img" aria-label={label} className="h-auto w-full">
      <BusOutline />
      {SEAT_COLS.map((x, c) =>
        SEAT_ROWS.map((y, r) => (
          <rect
            key={`s${c}${r}`}
            x={x}
            y={y}
            width="17"
            height="17"
            rx="4.5"
            className={cls("seat", c, r)}
            style={vars({ "--delay": mode === "pick" ? "350ms" : `${200 + order(x) * 70}ms` })}
          />
        )),
      )}
      {BERTH_COLS.map((x, c) =>
        BERTH_ROWS.map((y, r) => (
          <rect
            key={`b${c}${r}`}
            x={x}
            y={y}
            width="48"
            height="19"
            rx="5"
            className={cls("berth", c, r)}
            style={vars({ "--delay": mode === "pick" ? "800ms" : `${200 + order(x + 24) * 70}ms` })}
          />
        )),
      )}
      {mode === "pick" && (
        <>
          <text x="120" y="184" textAnchor="middle" className="plan-label">Seater</text>
          <text x="249" y="184" textAnchor="middle" className="plan-label">Sleeper</text>
        </>
      )}
    </svg>
  );
}

// A winding road with stops; the road draws in red and each pin drops as it's reached.
const ROAD = "M24 150 C 70 150, 74 84, 120 84 S 166 140, 206 126 S 246 58, 296 62";
// Stops sit where the curve segments join, so they're exactly on the road.
const STOPS: { x: number; y: number; at: number }[] = [
  { x: 24, y: 150, at: 0 },
  { x: 120, y: 84, at: 0.34 },
  { x: 206, y: 126, at: 0.66 },
  { x: 296, y: 62, at: 1 },
];

const pinPath = (x: number, y: number) =>
  `M${x} ${y} c-6 -8 -11 -12.5 -11 -18.5 a11 11 0 1 1 22 0 c0 6 -5 10.5 -11 18.5z`;

export function TourRoute({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 320 192" role="img" aria-label={label} className="h-auto w-full">
      <path d={ROAD} className="route-base" />
      <path d={ROAD} pathLength={1} className="route-draw" />
      {STOPS.map(({ x, y, at }, i) => {
        const last = i === STOPS.length - 1;
        return (
          <g key={i} className="pin" style={vars({ "--delay": `${Math.round(200 + at * 1800)}ms` })}>
            <path d={pinPath(x, y)} className={last ? "pin-end" : "pin-stop"} />
            <circle cx={x} cy={y - 18.5} r="4" className={last ? "pin-dot-end" : "pin-dot"} />
          </g>
        );
      })}
    </svg>
  );
}
