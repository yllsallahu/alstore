import type { Block } from "../schemas";

type FigureBlock = Extract<Block, { type: "figure" }>;

/*
 * Original explanatory diagrams (no product drawings, photos or icons). The SVG
 * is decorative for assistive technology: numbered markers point to the
 * legend list below it, which carries the meaning as text.
 */

function Marker({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9" className="fill-ink" />
      <text
        x={x}
        y={y}
        dy="0.35em"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        className="fill-paper"
      >
        {n}
      </text>
    </g>
  );
}

function ThermalBreakDiagram({ inside, outside }: { inside: string; outside: string }) {
  return (
    <svg viewBox="0 0 360 230" className="h-auto w-full" aria-hidden="true" focusable="false">
      <text x="16" y="20" fontSize="12" fontWeight="600" className="fill-ink-muted">
        {inside}
      </text>
      <text
        x="344"
        y="20"
        fontSize="12"
        fontWeight="600"
        textAnchor="end"
        className="fill-ink-muted"
      >
        {outside}
      </text>

      {/* Insulating glass unit standing in the rebate */}
      <rect x="150" y="30" width="8" height="92" className="fill-paper stroke-ink-muted" />
      <rect x="194" y="30" width="8" height="92" className="fill-paper stroke-ink-muted" />
      <rect x="158" y="108" width="36" height="14" className="fill-line stroke-ink-muted" />

      {/* Inner and outer aluminium shells (hollow) */}
      <rect
        x="40"
        y="122"
        width="116"
        height="80"
        className="fill-paper-sunken stroke-ink"
        strokeWidth="2"
      />
      <rect x="56" y="138" width="84" height="48" className="fill-paper stroke-ink" />
      <rect
        x="196"
        y="122"
        width="116"
        height="80"
        className="fill-paper-sunken stroke-ink"
        strokeWidth="2"
      />
      <rect x="212" y="138" width="84" height="48" className="fill-paper stroke-ink" />

      {/* Thermal break: two insulating strips and the cavity between them */}
      <rect x="156" y="128" width="40" height="12" className="fill-accent" />
      <rect x="156" y="184" width="40" height="12" className="fill-accent" />
      <rect
        x="160"
        y="144"
        width="32"
        height="36"
        className="fill-paper stroke-line-strong"
        strokeDasharray="3 3"
      />

      {/* Heat flow from the room, slowed at the break */}
      <path d="M16 162 H150" className="stroke-accent-ink" strokeWidth="2" />
      <path d="M150 156 L158 162 L150 168" className="fill-accent-ink" />
      <path d="M202 162 H330" className="stroke-accent-ink" strokeWidth="2" strokeDasharray="2 6" />

      <Marker x={98} y={112} n={1} />
      <Marker x={176} y={214} n={2} />
      <Marker x={254} y={112} n={3} />
      <Marker x={226} y={60} n={4} />
    </svg>
  );
}

function WindowAreasDiagram() {
  return (
    <svg
      viewBox="0 0 240 300"
      className="mx-auto h-auto w-full max-w-xs"
      aria-hidden="true"
      focusable="false"
    >
      {/* Frame and sash seen from the front (Af) */}
      <rect
        x="20"
        y="20"
        width="200"
        height="260"
        className="fill-paper-sunken stroke-ink"
        strokeWidth="2"
      />
      <rect x="34" y="34" width="172" height="232" className="fill-none stroke-ink" />
      {/* Visible glass (Ag) */}
      <rect x="50" y="50" width="140" height="200" className="fill-paper stroke-ink-muted" />
      {/* Visible glass perimeter (lg) */}
      <rect
        x="50"
        y="50"
        width="140"
        height="200"
        className="fill-none stroke-accent"
        strokeWidth="3"
        strokeDasharray="8 5"
      />

      <Marker x={27} y={150} n={1} />
      <Marker x={120} y={150} n={2} />
      <Marker x={190} y={100} n={3} />
    </svg>
  );
}

/** Explanatory figure with a numbered text legend and caption. */
export function ArticleFigure({ block }: { block: FigureBlock }) {
  const legend =
    block.figure === "thermal-break"
      ? [
          block.labels.innerShell,
          block.labels.barrier,
          block.labels.outerShell,
          block.labels.glazing,
        ]
      : [block.labels.frame, block.labels.glass, block.labels.edge];

  return (
    <figure className="mt-8 border-y border-line py-6">
      <div className="bg-paper-sunken/40 px-4 py-6">
        {block.figure === "thermal-break" ? (
          <ThermalBreakDiagram inside={block.labels.inside} outside={block.labels.outside} />
        ) : (
          <WindowAreasDiagram />
        )}
      </div>
      <ol className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
        {legend.map((label, index) => (
          <li key={label} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper"
            >
              {index + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 text-sm text-pretty text-ink-muted">{block.caption}</figcaption>
    </figure>
  );
}
