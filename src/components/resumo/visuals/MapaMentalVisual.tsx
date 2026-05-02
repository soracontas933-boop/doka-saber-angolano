import React from "react";

interface Branch {
  label: string;
  items: string[];
}

const PALETTE = [
  { main: "#1E9DF1", soft: "rgba(30,157,241,0.10)", deep: "#0B5FA0", glow: "rgba(30,157,241,0.45)" },
  { main: "#A855F7", soft: "rgba(168,85,247,0.10)", deep: "#6B21A8", glow: "rgba(168,85,247,0.45)" },
  { main: "#10B981", soft: "rgba(16,185,129,0.10)", deep: "#065F46", glow: "rgba(16,185,129,0.45)" },
  { main: "#F59E0B", soft: "rgba(245,158,11,0.10)", deep: "#92400E", glow: "rgba(245,158,11,0.45)" },
  { main: "#EF4444", soft: "rgba(239,68,68,0.10)", deep: "#991B1B", glow: "rgba(239,68,68,0.45)" },
  { main: "#EC4899", soft: "rgba(236,72,153,0.10)", deep: "#9D174D", glow: "rgba(236,72,153,0.45)" },
  { main: "#14B8A6", soft: "rgba(20,184,166,0.10)", deep: "#115E59", glow: "rgba(20,184,166,0.45)" },
  { main: "#6366F1", soft: "rgba(99,102,241,0.10)", deep: "#3730A3", glow: "rgba(99,102,241,0.45)" },
];

const ICONS = ["◆", "★", "●", "▲", "✦", "■", "✚", "◉", "♦", "◈"];

interface Props {
  central: string;
  branches: Branch[];
  /** Quando true, ocupa toda a folha A4 paisagem (1123×794) sem padding extra. */
  fillA4?: boolean;
  accent?: string;
  /** Multiplicador global do tamanho da letra (1 = 100%). */
  fontScale?: number;
}

export const MapaMentalVisual: React.FC<Props> = ({
  central,
  branches,
  fillA4 = false,
  fontScale = 1,
}) => {
  const W = fillA4 ? 1123 : 1100;
  const H = fillA4 ? 794 : Math.max(720, 380 + Math.ceil(branches.length / 2) * 220);
  const cx = W / 2;
  const cy = H / 2;

  const total = branches.length;
  // raios menores para garantir que cards de 260px ficam totalmente DENTRO da folha
  const radiusX = fillA4 ? 320 : 340;
  const radiusY = fillA4 ? 210 : 240;

  const CARD_W = 240;
  const PAD = 18; // margem mínima da borda da folha

  const positions = branches.map((_, i) => {
    const angle = (i / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radiusX;
    const y = cy + Math.sin(angle) * radiusY;
    return { x, y, angle };
  });

  // Ajusta tamanho dos sub-itens para caberem no card, conforme densidade
  const maxItems = Math.max(1, ...branches.map((b) => b.items.length));
  const densityScale = maxItems > 8 ? 0.78 : maxItems > 6 ? 0.88 : 1;
  const fs = (px: number) => `${px * fontScale * densityScale}px`;

  return (
    <div
      className="mapa-mental-premium"
      style={{
        position: "relative",
        width: "100%",
        minHeight: fillA4 ? "100%" : "auto",
        background:
          "radial-gradient(ellipse at center, #f8fbff 0%, #eef4fb 50%, #e3ecf6 100%)",
        padding: fillA4 ? "0" : "24px",
        borderRadius: fillA4 ? "0" : "20px",
        overflow: "visible",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(30,157,241,0.08) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.08) 0%, transparent 40%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: `${W}px`,
          height: `${H}px`,
          margin: "0 auto",
          maxWidth: "100%",
        }}
      >
        {/* SVG conexões curvas */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <defs>
            {PALETTE.map((c, i) => (
              <linearGradient key={i} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E9DF1" stopOpacity="0.9" />
                <stop offset="100%" stopColor={c.main} stopOpacity="0.9" />
              </linearGradient>
            ))}
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {positions.map((p, i) => {
            const c = PALETTE[i % PALETTE.length];
            const mx = (cx + p.x) / 2;
            const my = (cy + p.y) / 2 + (i % 2 === 0 ? -40 : 40);
            const path = `M ${cx} ${cy} Q ${mx} ${my} ${p.x} ${p.y}`;
            return (
              <g key={i}>
                <path
                  d={path}
                  stroke={`url(#grad-${i % PALETTE.length})`}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#softGlow)"
                  opacity={0.85}
                />
                <circle cx={p.x} cy={p.y} r={6} fill={c.main} opacity={0.9} />
              </g>
            );
          })}
        </svg>

        {/* Nó central */}
        <div
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            transform: "translate(-50%, -50%)",
            zIndex: 5,
          }}
        >
          <div
            style={{
              padding: "20px 30px",
              borderRadius: "24px",
              background:
                "linear-gradient(135deg, #1E9DF1 0%, #6366F1 50%, #A855F7 100%)",
              color: "#fff",
              boxShadow:
                "0 20px 50px -10px rgba(30,157,241,0.55), 0 0 0 6px rgba(255,255,255,0.6), 0 0 0 8px rgba(30,157,241,0.25)",
              textAlign: "center",
              maxWidth: "280px",
              minWidth: "180px",
            }}
          >
            <div
              style={{
                fontSize: fs(9),
                letterSpacing: "3px",
                textTransform: "uppercase",
                opacity: 0.85,
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              ✦ Tema Central ✦
            </div>
            <div
              style={{
                fontSize: fs(18),
                fontWeight: 800,
                lineHeight: 1.2,
                fontFamily: "'SF Pro Display', system-ui, sans-serif",
              }}
            >
              {central}
            </div>
          </div>
        </div>

        {/* Cards dos ramos */}
        {branches.map((b, i) => {
          const c = PALETTE[i % PALETTE.length];
          const icon = ICONS[i % ICONS.length];
          const p = positions[i];
          const isLeft = p.x < cx;

          // Calcula posição do card e CLAMP para nunca sair da folha A4
          let cardLeft = isLeft ? p.x - CARD_W : p.x;
          if (cardLeft < PAD) cardLeft = PAD;
          if (cardLeft + CARD_W > W - PAD) cardLeft = W - PAD - CARD_W;

          // Limite vertical: estima altura e clampa
          const estHeight = 70 + b.items.length * 22 * fontScale * densityScale;
          let cardTop = p.y - estHeight / 2;
          if (cardTop < PAD) cardTop = PAD;
          if (cardTop + estHeight > H - PAD) cardTop = H - PAD - estHeight;

          const branchNumber = i + 1;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: cardLeft,
                top: cardTop,
                width: `${CARD_W}px`,
                maxHeight: `${H - PAD * 2}px`,
                zIndex: 4,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: `2px solid ${c.main}`,
                  borderRadius: "16px",
                  padding: "12px 14px",
                  boxShadow: `0 12px 30px -8px ${c.glow}, 0 4px 10px rgba(0,0,0,0.06)`,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {/* Header com ícone + número */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    paddingBottom: "8px",
                    borderBottom: `1px dashed ${c.main}55`,
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: `linear-gradient(135deg, ${c.main}, ${c.deep})`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: fs(14),
                      fontWeight: 800,
                      boxShadow: `0 6px 14px -4px ${c.glow}`,
                      flexShrink: 0,
                    }}
                  >
                    {branchNumber}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: fs(8),
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: c.deep,
                        opacity: 0.7,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{icon}</span> Ramo {String(branchNumber).padStart(2, "0")}
                    </div>
                    <div
                      style={{
                        fontSize: fs(13),
                        fontWeight: 800,
                        color: c.deep,
                        lineHeight: 1.2,
                        fontFamily: "'SF Pro Display', system-ui, sans-serif",
                        wordBreak: "break-word",
                      }}
                    >
                      {b.label.replace(/^\d+(\.\d+)*\s*[-.:]?\s*/, "").trim()}
                    </div>
                  </div>
                </div>

                {/* Sub-ramos numerados (1.1, 1.2, ...) */}
                <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {b.items.map((it, j) => (
                    <li
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "6px",
                        padding: "4px 6px",
                        marginBottom: "3px",
                        borderRadius: "7px",
                        background: c.soft,
                        fontSize: fs(11),
                        lineHeight: 1.35,
                        color: "#1a1a1a",
                        wordBreak: "break-word",
                      }}
                    >
                      <span
                        style={{
                          fontSize: fs(10),
                          fontWeight: 800,
                          color: c.deep,
                          minWidth: "26px",
                          flexShrink: 0,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {branchNumber}.{j + 1}
                      </span>
                      <span style={{ flex: 1 }}>{it.replace(/^\d+(\.\d+)*\s*[-.:]?\s*/, "").trim()}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda — apenas fora do A4 */}
      {!fillA4 && (
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {branches.map((b, i) => {
            const c = PALETTE[i % PALETTE.length];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "#fff",
                  border: `1px solid ${c.main}55`,
                  fontSize: fs(10),
                  fontWeight: 600,
                  color: c.deep,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: c.main,
                  }}
                />
                {i + 1}. {b.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MapaMentalVisual;
