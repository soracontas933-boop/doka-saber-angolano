import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MindMapData,
  MindNode,
  getColorForNode,
  makeId,
  nodeRadius,
} from "@/lib/mindmap/types";

const CANVAS_W = 1123;
const CANVAS_H = 794;

interface MindMapCanvasProps {
  data: MindMapData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: MindMapData) => void;
  /** Quando true, desactiva interacção (modo export). */
  readOnly?: boolean;
  /** Ref opcional para captura externa (PDF). */
  innerRef?: React.RefObject<HTMLDivElement>;
}

const BG_STYLES: Record<MindMapData["background"], React.CSSProperties> = {
  blueprint: {
    background:
      "radial-gradient(ellipse at center, #f8fbff 0%, #eef4fb 50%, #e3ecf6 100%)",
    backgroundImage:
      "radial-gradient(circle at 20% 20%, rgba(30,157,241,0.08) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.08) 0%, transparent 40%)",
  },
  white: { background: "#ffffff" },
  paper: {
    background:
      "repeating-linear-gradient(0deg, #fafaf5, #fafaf5 28px, #f0ebe0 29px)",
  },
  dark: {
    background:
      "radial-gradient(ellipse at center, #0f172a 0%, #020617 80%)",
  },
};

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  data,
  selectedId,
  onSelect,
  onChange,
  readOnly = false,
  innerRef,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [, force] = useState(0);

  // Escala responsiva mantendo a folha A4 paisagem completa
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const w = wrapperRef.current.clientWidth;
      setScale(Math.min(1, w / CANVAS_W));
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const updateNode = (id: string, patch: Partial<MindNode>) => {
    onChange({
      ...data,
      nodes: data.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  };

  /* ---------- Drag ---------- */
  const handlePointerDown = (e: React.PointerEvent, node: MindNode) => {
    if (readOnly || editingId) return;
    e.stopPropagation();
    onSelect(node.id);
    const point = clientToCanvas(e.clientX, e.clientY);
    dragRef.current = {
      id: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const p = clientToCanvas(e.clientX, e.clientY);
    const id = dragRef.current.id;
    const nx = clamp(p.x - dragRef.current.offsetX, 40, CANVAS_W - 40);
    const ny = clamp(p.y - dragRef.current.offsetY, 40, CANVAS_H - 40);
    // mutação direta para fluidez, render via force update
    const target = data.nodes.find((n) => n.id === id);
    if (target) {
      target.x = nx;
      target.y = ny;
      force((v) => v + 1);
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      // commit final
      onChange({ ...data, nodes: [...data.nodes] });
      dragRef.current = null;
    }
  };

  const clientToCanvas = (cx: number, cy: number) => {
    const rect = wrapperRef.current!.getBoundingClientRect();
    return { x: (cx - rect.left) / scale, y: (cy - rect.top) / scale };
  };

  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  /* ---------- Edição inline ---------- */
  const startEditing = (node: MindNode) => {
    if (readOnly) return;
    setEditingId(node.id);
    setEditingValue(node.label);
  };
  const commitEditing = () => {
    if (editingId) {
      updateNode(editingId, { label: editingValue.trim() || "(sem título)" });
    }
    setEditingId(null);
  };

  /* ---------- Helpers visuais ---------- */
  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: CANVAS_H * scale,
        position: "relative",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <div
        ref={innerRef}
        data-mindmap-canvas
        style={{
          position: "relative",
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          ...BG_STYLES[data.background],
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          overflow: "hidden",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={() => onSelect(null)}
      >
        {/* Conexões SVG */}
        <svg
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <defs>
            <filter id="mm-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {data.nodes.map((n) => {
            if (!n.parentId) return null;
            const p = nodesById.get(n.parentId);
            if (!p) return null;
            const color = getColorForNode(data, n);
            const dx = n.x - p.x;
            const dy = n.y - p.y;
            const mx = p.x + dx / 2;
            const my = p.y + dy / 2 + (Math.abs(dx) > Math.abs(dy) ? 0 : 30);
            const path = `M ${p.x} ${p.y} Q ${mx} ${my} ${n.x} ${n.y}`;
            return (
              <g key={`edge-${n.id}`}>
                <path
                  d={path}
                  stroke={color}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.85}
                  filter="url(#mm-glow)"
                />
              </g>
            );
          })}
        </svg>

        {/* Nós */}
        {data.nodes.map((node) => {
          const { w, h } = nodeRadius(node.size);
          const color = getColorForNode(data, node);
          const isCentral = node.parentId === null;
          const selected = selectedId === node.id;
          const isEditing = editingId === node.id;

          return (
            <div
              key={node.id}
              onPointerDown={(e) => handlePointerDown(e, node)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEditing(node);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(node.id);
              }}
              style={{
                position: "absolute",
                left: node.x - w / 2,
                top: node.y - h / 2,
                width: w,
                height: h,
                cursor: readOnly ? "default" : "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 12px",
                borderRadius: isCentral ? 22 : 14,
                background: isCentral
                  ? `linear-gradient(135deg, ${color}, ${shade(color, -30)})`
                  : "rgba(255,255,255,0.94)",
                color: isCentral ? "#fff" : shade(color, -45),
                border: isCentral
                  ? `3px solid rgba(255,255,255,0.7)`
                  : `2px solid ${color}`,
                boxShadow: selected
                  ? `0 0 0 3px ${color}, 0 12px 30px -8px ${color}66`
                  : `0 8px 20px -6px ${color}55, 0 2px 6px rgba(0,0,0,0.06)`,
                fontFamily: data.fontFamily,
                fontWeight: isCentral ? 800 : 700,
                fontSize: node.size === "large" ? 16 : node.size === "medium" ? 13 : 11,
                textAlign: "center",
                lineHeight: 1.2,
                transition: "box-shadow 0.15s",
                zIndex: selected ? 10 : isCentral ? 5 : 3,
              }}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={commitEditing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      commitEditing();
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    width: "100%",
                    height: "100%",
                    resize: "none",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "inherit",
                    fontFamily: "inherit",
                    fontWeight: "inherit",
                    fontSize: "inherit",
                    textAlign: "center",
                  }}
                />
              ) : (
                <span style={{ pointerEvents: "none" }}>{node.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Ajusta luminosidade de uma cor hex (-100 a +100). */
function shade(hex: string, percent: number): string {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 * percent) / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round((255 * percent) / 100)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round((255 * percent) / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default MindMapCanvas;
