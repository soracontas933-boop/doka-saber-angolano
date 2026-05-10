import React from "react";

export type TopicosStyle =
  | "clean-a4"
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

export type HighlightStyle = "marker" | "bold" | "underline";
export interface HighlightConfig {
  enabled: boolean;
  style?: HighlightStyle;
  /** Cor base em hex (ex.: "#FACC15") */
  color?: string;
}

interface Props {
  title: string;
  disciplina?: string;
  sections: TopicoSection[];
  style: TopicosStyle;
  fontScale?: number;
  /** Pré-definida palette */
  palette?: "azul" | "verde" | "roxo" | "laranja" | "cinza";
  /** Quando true, headings e itens podem ser editados inline na folha A4. */
  editable?: boolean;
  /** Callback chamado no blur de cada edição com a estrutura atualizada. */
  onChange?: (sections: TopicoSection[]) => void;
  /** Callback quando o título é editado inline. */
  onTitleChange?: (newTitle: string) => void;
  /** Destaque automático de termos-chave */
  highlight?: HighlightConfig;
}

/** Escapa HTML para inserção segura em innerHTML. */
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Mistura cor com branco para usar como background de marca-texto. */
const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Detecta termos-chave e devolve HTML com spans destacados.
 * Padrões:
 *  - **texto** (negrito markdown gerado pela IA)
 *  - Anos (1500–2099)
 *  - Percentagens / números com unidades (%, kg, km, ºC, $, €)
 *  - Acrónimos em MAIÚSCULAS (2–6 letras)
 *  - Datas DD/MM/AAAA
 */
const buildHighlightedHTML = (raw: string, cfg: HighlightConfig): string => {
  const color = cfg.color || "#FACC15";
  const styleAttr =
    cfg.style === "bold"
      ? `color:${color};font-weight:800;`
      : cfg.style === "underline"
        ? `color:inherit;border-bottom:2px solid ${color};padding-bottom:1px;`
        : `background:${hexToRgba(color, 0.45)};border-radius:3px;padding:0 3px;color:#0f172a;`;

  // Tokeniza preservando ordem: primeiro **bold**, depois regex genéricos.
  const parts: { text: string; mark: boolean }[] = [];
  const boldRe = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = boldRe.exec(raw)) !== null) {
    if (m.index > last) parts.push({ text: raw.slice(last, m.index), mark: false });
    parts.push({ text: m[1], mark: true });
    last = m.index + m[0].length;
  }
  if (last < raw.length) parts.push({ text: raw.slice(last), mark: false });

  const genericRe =
    /\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}|\d+(?:[.,]\d+)?\s?(?:%|kg|km|m|cm|mm|ºC|°C|€|\$|USD|AOA|Kz))\b|\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,6}\b/g;

  const wrap = (text: string) =>
    `<span style="${styleAttr}">${escapeHtml(text)}</span>`;

  return parts
    .map((p) => {
      if (p.mark) return wrap(p.text);
      // aplica regex genérico só em pedaços não-bold
      return p.text.replace(genericRe, (mm) => wrap(mm));
    })
    .join("")
    .replace(/\n/g, "<br/>");
};

/** Componente de texto editável inline — aplica contentEditable apenas se editable=true.
 *  Suporta `html` opcional: quando definido e o elemento NÃO está em foco, renderiza via
 *  innerHTML (permitindo destaques). Ao focar, troca para texto plano para edição limpa. */
const EditableText: React.FC<{
  text: string;
  editable: boolean;
  multiline?: boolean;
  onCommit: (newText: string) => void;
  style?: React.CSSProperties;
  as?: "span" | "div";
  html?: string;
}> = ({ text, editable, multiline, onCommit, style, as = "span", html }) => {
  const ref = React.useRef<HTMLElement>(null);
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (focusedRef.current) return; // não interromper edição
    if (html != null) {
      if (el.innerHTML !== html) el.innerHTML = html;
    } else if (el.textContent !== text) {
      el.textContent = text;
    }
  }, [text, html]);

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck={editable}
      onFocus={(e: any) => {
        focusedRef.current = true;
        if (html != null) e.currentTarget.textContent = text; // edição em texto plano
        if (editable) e.currentTarget.style.backgroundColor = "rgba(30,157,241,0.10)";
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        focusedRef.current = false;
        const v = (e.currentTarget.textContent || "").replace(/\s+/g, " ").trim();
        if (editable) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
        if (v !== text) {
          onCommit(v);
        } else if (html != null) {
          // restaurar versão destacada
          (e.currentTarget as HTMLElement).innerHTML = html;
        }
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!editable) return;
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      style={{
        outline: editable ? "none" : undefined,
        cursor: editable ? "text" : undefined,
        borderRadius: editable ? 4 : undefined,
        transition: "background-color 120ms",
        ...style,
      }}
      onMouseEnter={editable ? (e: any) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.backgroundColor = "rgba(30,157,241,0.05)"; } : undefined}
      onMouseLeave={editable ? (e: any) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.backgroundColor = "transparent"; } : undefined}
    >
      {html == null ? text : null}
    </Tag>
  );
};

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
  editable = false,
  onChange,
  onTitleChange,
  highlight,
}) => {
  const C = PALETTES[palette];
  const fs = (n: number) => `${n * fontScale}px`;
  const hl: HighlightConfig = {
    enabled: !!highlight?.enabled,
    style: highlight?.style || "marker",
    color: highlight?.color || "#FACC15",
  };

  // Helpers para emitir alterações preservando o array de sections
  const updateSection = (sectionIdx: number, partial: Partial<TopicoSection>) => {
    if (!onChange) return;
    const next = sections.map((s, i) => (i === sectionIdx ? { ...s, ...partial } : s));
    onChange(next);
  };
  const updateItem = (sectionIdx: number, itemIdx: number, newText: string) => {
    if (!onChange) return;
    const next = sections.map((s, i) => {
      if (i !== sectionIdx) return s;
      const items = s.items.slice();
      items[itemIdx] = newText;
      return { ...s, items };
    });
    onChange(next);
  };

  // Render do conteúdo de um item, suportando edição inline
  const renderItem = (raw: string, idx: number, total: number, sectionN: number, sectionIdx: number = 0) => {
    const text = raw.replace(/\*\*/g, "");
    const html = hl.enabled ? buildHighlightedHTML(raw, hl) : undefined;
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
        <EditableText
          text={text}
          html={html}
          editable={editable}
          multiline
          onCommit={(v) => updateItem(sectionIdx, idx, v)}
          style={{
            fontSize: fs(11),
            color: "#1f2937",
            lineHeight: 1.55,
            textAlign: "justify",
            flex: 1,
            display: "block",
          }}
        />
      </div>
    );
  };

  // Helper para tornar headings editáveis em qualquer variante (preserva o estilo do <h3>/<span> existente)
  const H = (text: string, sectionIdx: number, extraStyle?: React.CSSProperties) => (
    <EditableText
      text={text}
      html={hl.enabled ? buildHighlightedHTML(text, hl) : undefined}
      editable={editable}
      onCommit={(v) => updateSection(sectionIdx, { heading: v })}
      style={extraStyle}
    />
  );

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
        <EditableText
          text={title}
          editable={editable && !!onTitleChange}
          onCommit={(v) => onTitleChange?.(v)}
        />

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
      case "clean-a4":
        return (
          <div
            key={i}
            data-card
            style={{
              marginBottom: 18,
              paddingBottom: 14,
              borderBottom: i < sections.length - 1 ? "1px solid #e2e8f0" : "none",
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  fontSize: fs(12),
                  fontWeight: 800,
                  color: C.primary,
                  minWidth: 28,
                  lineHeight: 1.3,
                }}
              >
                {n}.
              </span>
              <h3 style={{ margin: 0, fontSize: fs(14), fontWeight: 700, color: "#0f172a", flex: 1, lineHeight: 1.35 }}>
                {H(s.heading, i)}
              </h3>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
          </div>
        );

      case "step-cards":
        return (
          <div
            key={i}
            data-card
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
              pageBreakInside: "avoid",
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
                {H(s.heading, i)}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
            </div>
          </div>
        );

      case "timeline-blocks":
        return (
          <div key={i} data-card style={{ display: "flex", gap: 12, marginBottom: 14, position: "relative", breakInside: "avoid", pageBreakInside: "avoid" }}>
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
                {H(s.heading, i)}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
            </div>
          </div>
        );

      case "process-indicators":
        return (
          <div
            key={i}
            data-card
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              background: "#fff",
              border: `2px dashed ${C.primary}`,
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
                {H(s.heading, i)}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
            </div>
          </div>
        );

      case "infographic-panels":
        return (
          <div
            key={i}
            data-card
            style={{
              marginBottom: 14,
              borderRadius: 14,
              overflow: "visible",
              background: "#fff",
              border: `1px solid ${C.soft}`,
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
              <h3 style={{ margin: 0, fontSize: fs(12), fontWeight: 700 }}>{H(s.heading, i)}</h3>
            </div>
            <div style={{ padding: 12 }}>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
            </div>
          </div>
        );

      case "topic-containers":
        return (
          <div
            key={i}
            data-card
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 14,
              background: "#fff",
              border: `1px solid #e5e7eb`,
              borderLeft: `6px solid ${C.primary}`,
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
                {H(s.heading, i)}
              </h3>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: C.deep }}>
                {H(s.heading, i)}
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
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
          </div>
        );

      case "flow-cards":
        return (
          <div key={i} style={{ marginBottom: 14, display: "flex", alignItems: "stretch", gap: 0, breakInside: "avoid", pageBreakInside: "avoid" }}>
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
                {H(s.heading, i)}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={{ color: C.primary, fontWeight: 900, fontSize: fs(14) }}>§ {n}</span>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: "#111827" }}>
                {H(s.heading, i)}
              </h3>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
              {H(s.heading, i)}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: C.deep }}>{H(s.heading, i)}</h3>
            </div>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800 }}>{H(s.heading, i)}</h3>
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
              overflow: "visible",
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
                {H(s.heading, i)}
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
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
              {H(s.heading, i)}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
                {H(s.heading, i)}
              </h3>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
            </div>
          </div>
        );

      case "ribbon-labels":
        return (
          <div key={i} style={{ marginBottom: 14, position: "relative", paddingLeft: 0, breakInside: "avoid", pageBreakInside: "avoid" }}>
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
              {n}. {H(s.heading, i)}
            </div>
            <div
              style={{
                padding: 12,
                background: "#fff",
                border: `1px solid ${C.soft}`,
                borderRadius: "0 12px 12px 12px",
              }}
            >
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
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
              {H(s.heading, i)}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: C.deep }}>
                {H(s.heading, i)}
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
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              height: "auto",
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 24, borderRadius: 4, background: C.primary }} />
              <h3 style={{ margin: 0, fontSize: fs(13), fontWeight: 800, color: C.deep }}>{H(s.heading, i)}</h3>
            </div>
            <div style={{ flex: 1 }}>
              {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 10, fontSize: fs(14), fontWeight: 800, color: C.deep, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.primary }}>✦</span> {H(s.heading, i)}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
          </div>
        );

      case "modern-timeline":
        return (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16, position: "relative", breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.primary, border: `3px solid ${C.soft}`, zIndex: 2 }} />
              <div style={{ flex: 1, width: 2, background: `linear-gradient(${C.primary}, ${C.soft})`, marginTop: 4 }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 10 }}>
              <div style={{ fontSize: fs(10), fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Fase {n}
              </div>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: fs(14), fontWeight: 800, color: "#1e293b" }}>
                {H(s.heading, i)}
              </h3>
              <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: `1px solid ${C.soft}` }}>
                {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
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
              overflow: "visible",
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ position: "absolute", right: -10, top: -10, fontSize: fs(40), fontWeight: 900, color: C.primary, opacity: 0.05 }}>
              {n}
            </div>
            <h3 style={{ margin: 0, marginBottom: 10, fontSize: fs(13), fontWeight: 800, color: C.deep, borderLeft: `4px solid ${C.primary}`, paddingLeft: 10 }}>
              {H(s.heading, i)}
            </h3>
            {s.items.map((it, j) => renderItem(it, j, s.items.length, n, i))}
          </div>
        );

      default:
        return null;
    }
  };

  // Bento usa grid de 2 colunas
  if (style === "bento-grid") {
  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "auto", overflow: "visible", pageBreakInside: "avoid" }}>
      <Header />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          pageBreakInside: "avoid",
        }}
      >
        {sections.map((s, i) => renderSection(s, i))}
      </div>
    </div>
  );
  }

  if (style === "bento-cards") {
    return (
      <div style={{ padding: 24, background: "#fafafa", minHeight: "auto", overflow: "visible", pageBreakInside: "avoid" }}>
        <Header />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            pageBreakInside: "avoid",
          }}
        >
          {sections.map((s, i) => renderSection(s, i))}
        </div>
      </div>
    );
  }

  if (style === "clean-a4") {
    return (
      <div style={{ padding: "16px 20px", background: "#ffffff", minHeight: "auto", overflow: "visible", pageBreakInside: "avoid" }}>
        <Header />
        {sections.map((s, i) => renderSection(s, i))}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "auto", overflow: "visible", pageBreakInside: "avoid" }}>
      <Header />
      {sections.map((s, i) => renderSection(s, i))}
    </div>
  );
};

export default TopicosVisual;
