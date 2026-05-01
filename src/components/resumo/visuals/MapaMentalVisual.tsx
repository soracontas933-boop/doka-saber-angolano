import React from "react";

interface Branch {
  label: string;
  items: string[];
}

/**
 * Mapa Mental Premium — estrutura radial com:
 * - Nó central destacado (gradiente + glow)
 * - Conexões SVG curvas (linhas coloridas com gradientes)
 * - Cards de ramo com glassmorphism + ícone categórico
 * - Sub-ramos como chips/etiquetas hierárquicos
 * - Paleta inteligente por categoria
 *
 * Renderiza em layout fixo de largura (ideal A4 paisagem)
 * para garantir export idêntico à pré-visualização.
 */

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
}

export const MapaMentalVisual: React.FC<Props> = ({ central, branches, fillA4 = false }) => {
  // Layout radial encaixado em A4 paisagem: 1123 × 794 px
  const W = fillA4 ? 1123 : 1100;
  const H = fillA4 ? 794 : Math.max(720, 380 + Math.ceil(branches.length / 2) * 220);
  const cx = W / 2;
  const cy = H / 2;

  // Posiciona ramos em elipse — raios menores para não sair da folha
  const total = branches.length;
  const radiusX = fillA4 ? 360 : 380;
  const radiusY = fillA4 ? 230 : 260;

  const positions = branches.map((_, i) => {
    const angle = (i / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radiusX,
      y: cy + Math.sin(angle) * radiusY,
      angle,
    };
  });

  return (
    <div
      className="mapa-mental-premium"
      style={{
        position: "relative",
        width: fillA4 ? "100%" : "100%",
        height: fillA4 ? "100%" : "auto",
        background:
          "radial-gradient(ellipse at center, #f8fbff 0%, #eef4fb 50%, #e3ecf6 100%)",
        padding: fillA4 ? "0" : "24px",
        borderRadius: fillA4 ? "0" : "20px",
        overflow: "hidden",
      }}
    >
      {/* Padrão decorativo de fundo */}
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
            // curva bézier do centro até o ramo
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
                {/* ponto de chegada */}
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
              padding: "22px 32px",
              borderRadius: "24px",
              background:
                "linear-gradient(135deg, #1E9DF1 0%, #6366F1 50%, #A855F7 100%)",
              color: "#fff",
              boxShadow:
                "0 20px 50px -10px rgba(30,157,241,0.55), 0 0 0 6px rgba(255,255,255,0.6), 0 0 0 8px rgba(30,157,241,0.25)",
              textAlign: "center",
              maxWidth: "300px",
              minWidth: "200px",
            }}
          >
            <div
              style={{
                fontSize: "9px",
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
                fontSize: "18px",
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
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                transform: `translate(${isLeft ? "-100%" : "0%"}, -50%)`,
                width: "260px",
                zIndex: 4,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: `2px solid ${c.main}`,
                  borderRadius: "18px",
                  padding: "14px 16px",
                  boxShadow: `0 12px 30px -8px ${c.glow}, 0 4px 10px rgba(0,0,0,0.06)`,
                  position: "relative",
                }}
              >
                {/* Header com ícone */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                    paddingBottom: "8px",
                    borderBottom: `1px dashed ${c.main}55`,
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: `linear-gradient(135deg, ${c.main}, ${c.deep})`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      fontWeight: 700,
                      boxShadow: `0 6px 14px -4px ${c.glow}`,
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "8px",
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: c.deep,
                        opacity: 0.7,
                        fontWeight: 700,
                      }}
                    >
                      Ramo {String(i + 1).padStart(2, "0")}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        color: c.deep,
                        lineHeight: 1.2,
                        fontFamily: "'SF Pro Display', system-ui, sans-serif",
                      }}
                    >
                      {b.label}
                    </div>
                  </div>
                </div>

                {/* Sub-ramos como chips */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {b.items.map((it, j) => (
                    <li
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "5px 8px",
                        marginBottom: "3px",
                        borderRadius: "8px",
                        background: c.soft,
                        fontSize: "11px",
                        lineHeight: 1.35,
                        color: "#1a1a1a",
                      }}
                    >
                      <span
                        style={{
                          marginTop: "5px",
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: c.main,
                          flexShrink: 0,
                          boxShadow: `0 0 0 2px ${c.main}33`,
                        }}
                      />
                      <span style={{ flex: 1 }}>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda inferior */}
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
                fontSize: "10px",
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
              {b.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MapaMentalVisual;
