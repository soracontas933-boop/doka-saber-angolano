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
  
  // MELHORIAS: Raios aumentados para melhor aproveitamento de espaço
  // Antes: radiusX = 320/340, radiusY = 210/240
  // Agora: radiusX = 380/420, radiusY = 260/300 (mais expansivo)
  const radiusX = fillA4 ? 380 : 420;
  const radiusY = fillA4 ? 260 : 300;

  // MELHORIAS: Cards maiores para melhor legibilidade
  // Antes: CARD_W = 240
  // Agora: CARD_W = 280 (mais espaço para conteúdo)
  const CARD_W = 280;
  const PAD = 16; // margem mínima da borda da folha

  const positions = branches.map((_, i) => {
    const angle = (i / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radiusX;
    const y = cy + Math.sin(angle) * radiusY;
    return { x, y, angle };
  });

  // Garante que o conteúdo de cada item NUNCA estoura o card.
  // Trunca itens com mais de 12 palavras para 10 palavras + "…"
  const trimItem = (s: string) => {
    const clean = s.replace(/^\d+(\.\d+)*\s*[-.:]?\s*/, "").trim();
    const words = clean.split(/\s+/);
    return words.length > 12 ? words.slice(0, 10).join(" ") + "…" : clean;
  };

  // Ajusta tamanho dos sub-itens para caberem no card, conforme densidade
  const maxItems = Math.max(1, ...branches.map((b) => b.items.length));
  const densityScale = maxItems > 6 ? 0.78 : maxItems > 4 ? 0.88 : 1;
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
      {/* Camada de fundo com padrão decorativo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(30,157,241,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.12) 0%, transparent 40%)",
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
        {/* SVG conexões curvas com melhor profundidade */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <defs>
            {PALETTE.map((c, i) => (
              <linearGradient key={i} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E9DF1" stopOpacity="0.95" />
                <stop offset="100%" stopColor={c.main} stopOpacity="0.95" />
              </linearGradient>
            ))}
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Sombra mais profunda para as linhas */}
            <filter id="deepShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feOffset in="blur" dx="0" dy="1" result="offset" />
              <feComponentTransfer in="offset" result="offsetblur">
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="offsetblur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Linhas de conexão com profundidade aumentada */}
          {positions.map((p, i) => {
            const c = PALETTE[i % PALETTE.length];
            const mx = (cx + p.x) / 2;
            const my = (cy + p.y) / 2 + (i % 2 === 0 ? -50 : 50);
            const path = `M ${cx} ${cy} Q ${mx} ${my} ${p.x} ${p.y}`;
            return (
              <g key={i}>
                {/* Linha de sombra (mais espessa, atrás) */}
                <path
                  d={path}
                  stroke={`${c.main}22`}
                  strokeWidth={6}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.6}
                />
                {/* Linha principal com gradiente */}
                <path
                  d={path}
                  stroke={`url(#grad-${i % PALETTE.length})`}
                  strokeWidth={3.5}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#deepShadow)"
                  opacity={0.9}
                />
                {/* Ponto de conexão maior e mais visível */}
                <circle cx={p.x} cy={p.y} r={8} fill={c.main} opacity={0.95} />
                <circle cx={p.x} cy={p.y} r={5} fill="#fff" opacity={0.7} />
              </g>
            );
          })}
        </svg>

        {/* Nó central com design premium */}
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
              padding: "28px 40px",
              borderRadius: "28px",
              background:
                "linear-gradient(135deg, #1E9DF1 0%, #6366F1 50%, #A855F7 100%)",
              color: "#fff",
              boxShadow:
                "0 25px 60px -15px rgba(30,157,241,0.65), 0 0 0 8px rgba(255,255,255,0.7), 0 0 0 10px rgba(30,157,241,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
              textAlign: "center",
              maxWidth: "320px",
              minWidth: "200px",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                fontSize: fs(10),
                letterSpacing: "4px",
                textTransform: "uppercase",
                opacity: 0.9,
                marginBottom: "8px",
                fontWeight: 700,
                fontFamily: "'SF Pro Display', system-ui, sans-serif",
              }}
            >
              ✦ TEMA CENTRAL ✦
            </div>
            <div
              style={{
                fontSize: fs(22),
                fontWeight: 900,
                lineHeight: 1.25,
                fontFamily: "'SF Pro Display', system-ui, sans-serif",
                letterSpacing: "-0.5px",
              }}
            >
              {central}
            </div>
          </div>
        </div>

        {/* Cards dos ramos com design premium */}
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
          const estHeight = 85 + b.items.length * 26 * fontScale * densityScale;
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
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: `2.5px solid ${c.main}`,
                  borderRadius: "18px",
                  padding: "14px 16px",
                  boxShadow: `0 16px 40px -10px ${c.glow}, 0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)`,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Gradiente de fundo sutil no card */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, ${c.soft} 0%, transparent 100%)`,
                    pointerEvents: "none",
                    borderRadius: "16px",
                  }}
                />

                {/* Header com ícone + número (premium) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    paddingBottom: "10px",
                    borderBottom: `2px solid ${c.main}30`,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: `linear-gradient(135deg, ${c.main}, ${c.deep})`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: fs(18),
                      fontWeight: 900,
                      boxShadow: `0 8px 18px -6px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                      flexShrink: 0,
                      fontFamily: "'SF Pro Display', system-ui, sans-serif",
                    }}
                  >
                    {branchNumber}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: fs(9),
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        color: c.deep,
                        opacity: 0.75,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontFamily: "'SF Pro Display', system-ui, sans-serif",
                      }}
                    >
                      <span>{icon}</span> RAMO {String(branchNumber).padStart(2, "0")}
                    </div>
                    <div
                      style={{
                        fontSize: fs(14),
                        fontWeight: 900,
                        color: c.deep,
                        lineHeight: 1.25,
                        fontFamily: "'SF Pro Display', system-ui, sans-serif",
                        wordBreak: "break-word",
                        marginTop: "2px",
                      }}
                    >
                      {b.label.replace(/^\d+(\.\d+)*\s*[-.:]?\s*/, "").trim()}
                    </div>
                  </div>
                </div>

                {/* Sub-ramos numerados com melhor espaçamento (1.1, 1.2, ...) */}
                <ol style={{ listStyle: "none", padding: 0, margin: 0, position: "relative", zIndex: 1 }}>
                  {b.items.map((it, j) => (
                    <li
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "6px 8px",
                        marginBottom: "4px",
                        borderRadius: "8px",
                        background: c.soft,
                        fontSize: fs(12),
                        color: c.deep,
                        lineHeight: 1.35,
                        fontWeight: 500,
                        fontFamily: "'SF Pro Display', system-ui, sans-serif",
                        wordBreak: "break-word",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: fs(11),
                          fontWeight: 800,
                          color: c.main,
                          minWidth: "30px",
                          flexShrink: 0,
                          fontVariantNumeric: "tabular-nums",
                          fontFamily: "'SF Pro Display', system-ui, sans-serif",
                        }}
                      >
                        {branchNumber}.{j + 1}
                      </span>
                      <span style={{ flex: 1 }}>{trimItem(it)}</span>
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
            marginTop: "20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
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
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  background: "#fff",
                  border: `1.5px solid ${c.main}`,
                  fontSize: fs(11),
                  fontWeight: 700,
                  color: c.deep,
                  boxShadow: "0 3px 8px rgba(0,0,0,0.06)",
                  fontFamily: "'SF Pro Display', system-ui, sans-serif",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: c.main,
                    boxShadow: `0 0 8px ${c.glow}`,
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
