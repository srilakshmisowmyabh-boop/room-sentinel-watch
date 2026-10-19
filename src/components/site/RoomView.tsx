import { useEffect, useState } from "react";
import { useGuard } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

// Node positions in a 600x400 room coordinate space
// Labels sit inside the room, away from the edges, so they are never clipped.
const NODE_POS = [
  { x: 90, y: 90, corner: "Corner A", anchor: "start" as const, dx: -14 },
  { x: 510, y: 90, corner: "Corner B", anchor: "end" as const, dx: 14 },
  { x: 300, y: 330, corner: "Corner C", anchor: "middle" as const, dx: 0 },
];

export function RoomView({ view = "room", compact = false }: { view?: "room" | "sensing"; compact?: boolean }) {
  const { nodes, presence, sensorOk } = useGuard();
  const [pos, setPos] = useState({ x: 330, y: 200 });
  const [hover, setHover] = useState<string | null>(null);
  const present = presence !== "NO_PERSON";
  const intrusion = presence === "INTRUSION";

  // Simulated wandering presence
  useEffect(() => {
    const t = setInterval(() => {
      setPos((p) => ({
        x: Math.max(150, Math.min(470, p.x + (Math.random() - 0.5) * 70)),
        y: Math.max(120, Math.min(300, p.y + (Math.random() - 0.5) * 50)),
      }));
    }, 1600);
    return () => clearInterval(t);
  }, []);

  const blobColor = intrusion ? "var(--danger)" : presence === "POSSIBLE_PERSON" ? "var(--warning)" : "var(--cyan)";

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl border border-border bg-background/60 bg-grid", compact ? "aspect-[3/2]" : "aspect-[3/2]")}>
      <svg viewBox="0 0 600 400" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="heat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={blobColor} stopOpacity="0.85" />
            <stop offset="45%" stopColor={blobColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={blobColor} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="field" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Floor plan */}
        <rect x="30" y="30" width="540" height="340" rx="14" fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.5" strokeWidth="2.5" />
        {view === "room" && (
          <g stroke="var(--muted-foreground)" strokeOpacity="0.35" fill="var(--muted)" fillOpacity="0.5">
            <rect x="70" y="250" width="150" height="70" rx="10" />
            <rect x="420" y="110" width="110" height="60" rx="8" />
            <circle cx="300" cy="200" r="28" />
            <rect x="250" y="34" width="100" height="6" fill="var(--cyan)" fillOpacity="0.4" stroke="none" />
            <text x="300" y="56" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" stroke="none" fontFamily="JetBrains Mono">WINDOW</text>
            <rect x="566" y="250" width="6" height="70" fill="var(--warning)" fillOpacity="0.5" stroke="none" />
            <text x="548" y="290" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" stroke="none" fontFamily="JetBrains Mono" transform="rotate(-90 548 290)">DOOR</text>
          </g>
        )}

        {/* Sensing field */}
        {view === "sensing" && NODE_POS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="230" fill="url(#field)" />
        ))}

        {/* Links between nodes and to presence */}
        {NODE_POS.map((p, i) => {
          const n = NODE_POS[(i + 1) % 3]!;
          const online = nodes[i]?.online;
          return (
            <g key={i}>
              <line x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke="var(--primary)" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="6 6" className="animate-dash" />
              {present && online && (
                <line x1={p.x} y1={p.y} x2={pos.x} y2={pos.y} stroke={blobColor} strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="4 8" className="animate-dash" style={{ transition: "all 1.5s ease" }} />
              )}
            </g>
          );
        })}

        {/* Presence heat */}
        {present && (
          <g style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transition: "transform 1.5s ease" }}>
            <circle r={view === "sensing" ? 110 : 80} fill="url(#heat)">
              <animate attributeName="r" values={view === "sensing" ? "95;120;95" : "65;85;65"} dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle r="7" fill={blobColor} />
          </g>
        )}

        {/* Nodes */}
        {NODE_POS.map((p, i) => {
          const n = nodes[i]!;
          const ok = n?.online;
          return (
            <g key={i} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
              <circle cx={p.x} cy={p.y} r="22" fill={ok ? "var(--cyan)" : "var(--danger)"} fillOpacity="0.15">
                <animate attributeName="r" values="18;34;18" dur="2.6s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
                <animate attributeName="fill-opacity" values="0.35;0;0.35" dur="2.6s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
              </circle>
              <circle cx={p.x} cy={p.y} r="11" fill="var(--card)" stroke={ok ? "var(--cyan)" : "var(--danger)"} strokeWidth="3" />
              <text x={p.x + p.dx} y={p.y + (p.y > 200 ? -40 : 34)} textAnchor={p.anchor} fontSize="13" fontWeight="600" fill="var(--foreground)" fontFamily="JetBrains Mono">{n.label}</text>
              <text x={p.x + p.dx} y={p.y + (p.y > 200 ? -26 : 48)} textAnchor={p.anchor} fontSize="11" fill="var(--muted-foreground)" fontFamily="JetBrains Mono">{p.corner}</text>
              {(hover === n.id || !compact) && (
                <text x={p.x + p.dx} y={p.y + (p.y > 200 ? 32 : 62)} textAnchor={p.anchor} fontSize="11" fill={ok ? "var(--muted-foreground)" : "var(--danger)"} fontFamily="JetBrains Mono">
                  {ok ? `${n.rssi.toFixed(0)} dBm` : "FAULT"}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute left-3 top-3 rounded-md bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
        Living Room · {view === "room" ? "Floor Plan" : "Sensing Field"}{!sensorOk && " · degraded"}
      </div>
    </div>
  );
}
