import React from "react";

export type TopicosStyle =
  | "step-cards"
  | "timeline-blocks"
  | "process-indicators"
  | "infographic-panels"
  | "topic-containers"
  | "learning-modules"
  | "flow-cards"
  | "smart-content"
  | "bento-cards"
  | "glassmorphism"
  | "gradient-tiles"
  | "dashboard-widgets"
  | "story-blocks"
  | "numbered-blocks"
  | "ribbon-labels"
  | "highlight-boxes"
  | "milestone-cards"
  | "bento-grid"
  | "glassmorphism-cards"
  | "modern-timeline"
  | "interactive-nodes";

export interface TopicoSection {
  heading: string;
  items: string[];
}

interface Props {
  title: string;
  disciplina?: string;
  sections: TopicoSection[];
  style: TopicosStyle;
  fontScale?: number;
  /** Pré-definida palette */
  palette?: "azul" | "verde" | "roxo" | "laranja" | "cinza";
}

const PALETTES = {
  azul: { primary: "#1E9DF1", soft: "#E6F4FE", deep: "#0B5A91", accent: "#7BC4F4" },
  verde: { primary: "#10B981", soft: "#E6FBF4", deep: "#065F46", accent: "#6EE7B7" },
  roxo: { primary: "#8B5CF6", soft: "#F1ECFE", deep: "#5B21B6", accent: "#C4B5FD" },
  laranja: { primary: "#F59E0B", soft: "#FEF4E2", deep: "#92400E", accent: "#FBD38D" },
  cinza: { primary: "#374151", soft: "#F3F4F6", deep: "#111827", accent: "#9CA3AF" },
};

const TopicosVisual: React.FC<Props> = ({
  title,
  disciplina,
  sections,
  style,
  fontScale = 1,
  palette = "azul",
}) => {
  const C = PALETTES[palette];
  const fs = (n: number) => `${n * fontScale}px`;

  // Render do conteúdo de um item, suportando sub-items (linhas iniciadas por "  -" ou "→")
  const renderItem = (raw: string, idx: number, total: number, sectionN: number) => {
    const text = raw.replace(/\*\*/g, "");
    return (
      <div
        key={idx}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: fs(11),
            fontWeight: 800,
            color: C.deep,
            minWidth: 28,
            textAlign: "right",
            lineHeight: 1.3,
          }}
        >
          {sectionN}.{idx + 1}
        </span>
        <span
          style={{
            fontSize: fs(11),
            color: "#1f2937",
            lineHeight: 1.55,
            textAlign: "justify",
            flex: 1,
          }}
        >
          {text}
        </span>
      </div>
    );
  };

  // ╭─── Header comum ──────────────────────────╮
  const Header = () => (
    <div
      style={{
        textAlign: "center",
        marginBottom: 18,
        paddingBottom: 12,
        borderBottom: `2px solid ${C.primary}`,
      }}
    >
      <h1
        style={{
          fontSize: fs(20),
          fontWeight: 800,
          color: C.deep,
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </h1>
      {disciplina && (
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            padding: "3px 12px",
            borderRadius: 999,
            background: C.soft,
            color: C.deep,
            fontSize: fs(10),
            fontWeight: 700,
          }}
        >
          {disciplina}
        </div>
      )}
    </div>
  );

  // ╭─── Estilos ───────────────────────────────╮
  const renderSection = (s: TopicoSection, i: number) => {
    const n = i + 1;
    switch (style) {
      case "step-cards":
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 14,
              padding: 14,
              borderRadius: 14,
              background: "#fff",
              border: `1px solid ${C.soft}`,
              boxShadow: `0 4px 14px ${C.primary}15`,
              breakInside: "avoid",
            }}
          >
            <div
              style={{
                minWidth: 44,
                height: 44,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${C.primary}, ${C.deep})`,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: fs(16),
              }}
            >
              {n}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(13), fontWeight: 800, color: C.deep }}>
                {s.heading}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "timeline-blocks":
        return (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, position: "relative", breakInside: "avoid" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: C.primary,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: fs(13),
                  border: `3px solid ${C.soft}`,
                }}
              >
                {n}
              </div>
              <div style={{ flex: 1, width: 2, background: C.soft, marginTop: 4 }} />
            </div>
            <div
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                background: C.soft,
                borderLeft: `4px solid ${C.primary}`,
              }}
            >
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(13), fontWeight: 800, color: C.deep }}>
                {s.heading}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "process-indicators":
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              background: "#fff",
              border: `2px dashed ${C.primary}`,
              breakInside: "avoid",
            }}
          >
            <div
              style={{
                fontSize: fs(28),
                fontWeight: 900,
                color: C.primary,
                opacity: 0.4,
                lineHeight: 1,
                minWidth: 36,
              }}
            >
              {String(n).padStart(2, "0")}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(13), fontWeight: 800, color: C.deep }}>
                {s.heading}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "infographic-panels":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
              border: `1px solid ${C.soft}`,
              breakInside: "avoid",
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                background: `linear-gradient(90deg, ${C.deep}, ${C.primary})`,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontWeight: 900, fontSize: fs(14) }}>{n}</span>
              <span style={{ width: 1, height: 16, background: "#ffffff66" }} />
              <h3 style={{ margin: 0, fontSize: fs(12), fontWeight: 700 }}>{s.heading}</h3>
            </div>
            <div style={{ padding: 12 }}>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "topic-containers":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 14,
              background: "#fff",
              border: `1px solid #e5e7eb`,
              borderLeft: `6px solid ${C.primary}`,
              breakInside: "avoid",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  background: C.soft,
                  color: C.deep,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: fs(10),
                  fontWeight: 800,
                }}
              >
                Tópico {n}
              </span>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: "#111827" }}>
                {s.heading}
              </h3>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "learning-modules":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              borderRadius: 16,
              padding: 14,
              background: C.soft,
              border: `1px solid ${C.accent}`,
              breakInside: "avoid",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: C.deep }}>
                {s.heading}
              </h3>
              <span
                style={{
                  background: C.primary,
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 8,
                  fontSize: fs(10),
                  fontWeight: 800,
                }}
              >
                Módulo {n}
              </span>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "flow-cards":
        return (
          <div key={i} style={{ marginBottom: 14, display: "flex", alignItems: "stretch", gap: 0 }}>
            <div
              style={{
                background: C.primary,
                color: "#fff",
                padding: "10px 14px",
                borderRadius: "12px 0 0 12px",
                fontWeight: 900,
                fontSize: fs(16),
                display: "flex",
                alignItems: "center",
              }}
            >
              {n}
            </div>
            <div
              style={{
                flex: 1,
                background: "#fff",
                padding: 12,
                border: `1px solid ${C.soft}`,
                borderLeft: "none",
                borderRadius: "0 12px 12px 0",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(13), fontWeight: 800, color: C.deep }}>
                {s.heading}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "smart-content":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 12,
              background: "#fff",
              boxShadow: `0 2px 12px rgba(0,0,0,0.06)`,
              borderTop: `3px solid ${C.primary}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={{ color: C.primary, fontWeight: 900, fontSize: fs(14) }}>§ {n}</span>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: "#111827" }}>
                {s.heading}
              </h3>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "bento-cards":
        // Renderizado em grid pelo container
        return (
          <div
            key={i}
            style={{
              padding: 12,
              borderRadius: 14,
              background: "#fff",
              border: `1px solid ${C.soft}`,
              boxShadow: `0 4px 12px ${C.primary}10`,
              height: "100%",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: C.deep,
                color: "#fff",
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: fs(9),
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              {String(n).padStart(2, "0")}
            </div>
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(12), fontWeight: 800, color: C.deep }}>
              {s.heading}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "glassmorphism":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.primary}15, ${C.accent}25)`,
              border: `1px solid ${C.primary}30`,
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "#ffffffaa",
                  border: `1px solid ${C.primary}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: C.deep,
                  fontSize: fs(13),
                }}
              >
                {n}
              </div>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: C.deep }}>{s.heading}</h3>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "gradient-tiles":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.primary}, ${C.deep})`,
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span
                style={{
                  background: "#ffffff30",
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: fs(10),
                  fontWeight: 800,
                }}
              >
                {n}
              </span>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800 }}>{s.heading}</h3>
            </div>
            {s.items.map((it, j) => (
              <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: fs(11), fontWeight: 800, minWidth: 28, textAlign: "right" }}>
                  {n}.{j + 1}
                </span>
                <span style={{ fontSize: fs(11), lineHeight: 1.55, flex: 1, textAlign: "justify" }}>
                  {it.replace(/\*\*/g, "")}
                </span>
              </div>
            ))}
          </div>
        );

      case "dashboard-widgets":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              borderRadius: 12,
              background: "#fff",
              border: `1px solid #e5e7eb`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "#f9fafb",
                borderBottom: `1px solid #e5e7eb`,
              }}
            >
              <h3 style={{ margin: 0, fontSize: fs(12), fontWeight: 800, color: "#111827" }}>
                {s.heading}
              </h3>
              <span
                style={{
                  fontSize: fs(9),
                  fontWeight: 800,
                  color: C.primary,
                  background: C.soft,
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                #{n}
              </span>
            </div>
            <div style={{ padding: 12 }}>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "story-blocks":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 12,
              background: "#fff",
              borderLeft: `5px solid ${C.primary}`,
              borderTop: `1px solid #f3f4f6`,
              borderRight: `1px solid #f3f4f6`,
              borderBottom: `1px solid #f3f4f6`,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: fs(11),
                  fontWeight: 800,
                  color: C.primary,
                  fontStyle: "italic",
                }}
              >
                Capítulo {n}
              </span>
            </div>
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(14), fontWeight: 800, color: C.deep, fontFamily: "Georgia, serif" }}>
              {s.heading}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "numbered-blocks":
        return (
          <div
            key={i}
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                fontSize: fs(34),
                fontWeight: 900,
                color: C.primary,
                lineHeight: 1,
                minWidth: 50,
              }}
            >
              {String(n).padStart(2, "0")}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(13), fontWeight: 800, color: C.deep, borderBottom: `1px solid ${C.soft}`, paddingBottom: 6 }}>
                {s.heading}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "ribbon-labels":
        return (
          <div key={i} style={{ marginBottom: 14, position: "relative", paddingLeft: 0 }}>
            <div
              style={{
                display: "inline-block",
                background: C.primary,
                color: "#fff",
                padding: "4px 14px 4px 10px",
                fontWeight: 800,
                fontSize: fs(11),
                clipPath: "polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%)",
                marginBottom: -1,
                paddingRight: 22,
              }}
            >
              {n}. {s.heading}
            </div>
            <div
              style={{
                padding: 12,
                background: "#fff",
                border: `1px solid ${C.soft}`,
                borderRadius: "0 12px 12px 12px",
              }}
            >
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "highlight-boxes":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 10,
              background: C.soft,
              border: `1px solid ${C.accent}`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -10,
                left: 14,
                background: C.primary,
                color: "#fff",
                padding: "2px 10px",
                borderRadius: 6,
                fontSize: fs(10),
                fontWeight: 800,
              }}
            >
              {n}
            </div>
            <h3 style={{ margin: "4px 0 8px 0", fontSize: fs(13), fontWeight: 800, color: C.deep }}>
              {s.heading}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "milestone-cards":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 14,
              background: "#fff",
              boxShadow: `0 6px 20px ${C.primary}18`,
              borderTop: `4px solid ${C.primary}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: C.deep }}>
                {s.heading}
              </h3>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `2px solid ${C.primary}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: C.deep,
                  fontSize: fs(12),
                }}
              >
                {n}
              </div>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "bento-grid":
        return (
          <div
            key={i}
            style={{
              padding: 14,
              borderRadius: 16,
              background: "#fff",
              border: `1px solid ${C.soft}`,
              boxShadow: `0 4px 12px ${C.primary}10`,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 24, borderRadius: 4, background: C.primary }} />
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: C.deep }}>{s.heading}</h3>
            </div>
            <div style={{ flex: 1 }}>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
            </div>
          </div>
        );

      case "glassmorphism-cards":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 16,
              borderRadius: 20,
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 10, fontSize: fs(14), fontWeight: 800, color: C.deep, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.primary }}>✦</span> {s.heading}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      case "modern-timeline":
        return (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.primary, border: `3px solid ${C.soft}`, zIndex: 2 }} />
              <div style={{ flex: 1, width: 2, background: `linear-gradient(${C.primary}, ${C.soft})`, marginTop: 4 }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 10 }}>
              <div style={{ fontSize: fs(10), fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Fase {n}
              </div>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(14), fontWeight: 800, color: "#1e293b" }}>
                {s.heading}
              </h3>
              <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: `1px solid ${C.soft}` }}>
                {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
              </div>
            </div>
          </div>
        );

      case "interactive-nodes":
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 12,
              background: `linear-gradient(to right, ${C.soft}, #fff)`,
              border: `1px solid ${C.soft}`,
              position: "relative",
              overflow: "hidden",
              breakInside: "avoid",
            }}
          >
            <div style={{ position: "absolute", right: -10, top: -10, fontSize: fs(40), fontWeight: 900, color: C.primary, opacity: 0.05 }}>
              {n}
            </div>
            <h3 style={{ margin: 0, marginBottom: 10, fontSize: fs(13), fontWeight: 800, color: C.deep, borderLeft: `4px solid ${C.primary}`, paddingLeft: 10 }}>
              {s.heading}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n))}
          </div>
        );

      default:
        return null;
    }
  };

  // Bento usa grid de 2 colunas
  if (style === "bento-grid") {
    return (
      <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%", overflow: "visible" }}>
        <Header />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {sections.map((s, i) => renderSection(s, i))}
        </div>
      </div>
    );
  }

  if (style === "bento-cards") {
    return (
      <div style={{ padding: 24, background: "#fafafa", minHeight: "100%", overflow: "visible" }}>
        <Header />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {sections.map((s, i) => renderSection(s, i))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "100%", overflow: "visible" }}>
      <Header />
      {sections.map((s, i) => renderSection(s, i))}
    </div>
  );
};

export default TopicosVisual;
