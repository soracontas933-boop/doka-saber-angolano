import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Info, Lightbulb, BookOpen, Target, ExternalLink, Maximize2 } from "lucide-react";
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
  const [responsiveScale, setResponsiveScale] = useState(1);
  const zoomLevel = data.zoomLevel || 100;
  const zoomScale = zoomLevel / 100;
  
  const fontLevel = data.fontLevel || 25;
  const fontScale = 0.55 + (fontLevel - 1) * ((2.2 - 0.55) / 49);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  
  const resizeRef = useRef<{
    id: string;
    startW: number;
    startH: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [, force] = useState(0);

  // Escala responsiva mantendo a folha A4 paisagem completa
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const w = wrapperRef.current.clientWidth;
      setResponsiveScale(Math.min(1, w / CANVAS_W));
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

  const totalScale = responsiveScale * zoomScale;

  const updateNode = (id: string, patch: Partial<MindNode>) => {
    onChange({
      ...data,
      nodes: data.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  };

  const clientToCanvas = (cx: number, cy: number) => {
    const rect = wrapperRef.current!.getBoundingClientRect();
    return { 
      x: (cx - rect.left) / totalScale, 
      y: (cy - rect.top) / totalScale 
    };
  };

  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  /* ---------- Drag & Resize ---------- */
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

  const handleResizeDown = (e: React.PointerEvent, node: MindNode) => {
    if (readOnly) return;
    e.stopPropagation();
    const { w, h } = nodeRadius(node.size);
    const currentW = node.width || w;
    const currentH = node.height || h;
    
    resizeRef.current = {
      id: node.id,
      startW: currentW,
      startH: currentH,
      startX: e.clientX,
      startY: e.clientY,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      const p = clientToCanvas(e.clientX, e.clientY);
      const id = dragRef.current.id;
      const nx = clamp(p.x - dragRef.current.offsetX, 40, CANVAS_W - 40);
      const ny = clamp(p.y - dragRef.current.offsetY, 40, CANVAS_H - 40);
      
      const target = data.nodes.find((n) => n.id === id);
      if (target) {
        target.x = nx;
        target.y = ny;
        force((v) => v + 1);
      }
    } else if (resizeRef.current) {
      const { id, startW, startH, startX, startY } = resizeRef.current;
      const dx = (e.clientX - startX) / totalScale;
      const dy = (e.clientY - startY) / totalScale;
      
      const target = data.nodes.find((n) => n.id === id);
      if (target) {
        target.width = Math.max(100, startW + dx * 2);
        target.height = Math.max(40, startH + dy * 2);
        force((v) => v + 1);
      }
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current || resizeRef.current) {
      onChange({ ...data, nodes: [...data.nodes] });
      dragRef.current = null;
      resizeRef.current = null;
    }
  };

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

  /* ---------- Enumeração Lógica ---------- */
  const nodeNumbers = useMemo(() => {
    const numbers: Record<string, string> = {};
    const centralNode = data.nodes.find(n => n.parentId === null);
    if (!centralNode) return numbers;

    const branches = data.nodes
      .filter(n => n.parentId === centralNode.id)
      .sort((a, b) => {
        const angleA = Math.atan2(a.y - centralNode.y, a.x - centralNode.x);
        const angleB = Math.atan2(b.y - centralNode.y, b.x - centralNode.x);
        return angleA - angleB;
      });

    branches.forEach((branch, bIdx) => {
      const bNum = (bIdx + 1).toString();
      numbers[branch.id] = bNum;
      
      const children = data.nodes
        .filter(n => n.parentId === branch.id)
        .sort((a, b) => a.y - b.y);
        
      children.forEach((child, cIdx) => {
        numbers[child.id] = `${bNum}.${cIdx + 1}`;
      });
    });

    return numbers;
  }, [data.nodes]);

  const nodesById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: CANVAS_H * totalScale,
        position: "relative",
        userSelect: "none",
        touchAction: "none",
        overflow: "hidden",
        borderRadius: "12px",
        border: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      <div
        ref={innerRef}
        data-mindmap-canvas
        style={{
          position: "relative",
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${totalScale})`,
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
          const { w: defW, h: defH } = nodeRadius(node.size);
          const w = node.width || defW;
          const h = node.height || defH;
          
          const color = getColorForNode(data, node);
          const isCentral = node.parentId === null;
          const selected = selectedId === node.id;
          const isEditing = editingId === node.id;
          const isExpanded = expandedIds.has(node.id);
          const setIsExpanded = (val: boolean) => setExpandedIds((prev) => {
            const next = new Set(prev);
            if (val) next.add(node.id); else next.delete(node.id);
            return next;
          });
          const hasDetails = !!(node.description || (node.metadata && Object.keys(node.metadata).length > 0));
          const nodeNum = nodeNumbers[node.id];

          return (
            <motion.div
              key={node.id}
              layout
              initial={false}
              animate={{
                width: isExpanded ? Math.max(w, 320) : w,
                height: isExpanded ? "auto" : h,
                zIndex: isExpanded ? 50 : (selected ? 10 : isCentral ? 5 : 3),
              }}
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
                left: node.x - (isExpanded ? Math.max(w, 320) : w) / 2,
                top: node.y - (isExpanded ? 100 : h / 2),
                cursor: readOnly ? "default" : "grab",
                display: "flex",
                flexDirection: "column",
                padding: "12px 16px",
                borderRadius: isCentral ? 22 : 16,
                background: isCentral
                  ? `linear-gradient(135deg, ${color}, ${shade(color, -30)})`
                  : "rgba(255,255,255,0.96)",
                backdropFilter: "blur(10px)",
                color: isCentral ? "#fff" : shade(color, -45),
                border: isCentral
                  ? `3px solid rgba(255,255,255,0.7)`
                  : `2px solid ${color}`,
                boxShadow: isExpanded 
                  ? `0 20px 40px -10px ${color}44, 0 0 0 2px ${color}`
                  : (selected
                    ? `0 0 0 3px ${color}, 0 12px 30px -8px ${color}66`
                    : `0 8px 20px -6px ${color}55, 0 2px 6px rgba(0,0,0,0.06)`),
                fontFamily: data.fontFamily,
                transition: "box-shadow 0.2s, border-color 0.2s",
                overflow: isExpanded ? "visible" : "hidden",
                wordBreak: "break-word",
                minHeight: isExpanded ? "200px" : "auto",
              }}
            >
              <div className="flex flex-col w-full h-full relative">
                {/* Enumeração */}
                {nodeNum && !isCentral && (
                  <div 
                    className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm"
                    style={{ 
                      background: color, 
                      color: "#fff",
                      border: "1.5px solid #fff"
                    }}
                  >
                    {nodeNum}
                  </div>
                )}

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
                      height: isExpanded ? "100px" : "100%",
                      resize: "none",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: "inherit",
                      fontFamily: "inherit",
                      fontWeight: 700,
                      fontSize: (node.size === "large" ? 16 : node.size === "medium" ? 13 : 11) * fontScale,
                      textAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1">
                    <span style={{ 
                      fontWeight: 800,
                      fontSize: (node.size === "large" ? 17 : node.size === "medium" ? 14 : 12) * fontScale,
                      lineHeight: 1.2,
                      textAlign: "center",
                      width: "100%",
                      display: "-webkit-box",
                      WebkitLineClamp: isExpanded ? 20 : (node.size === "large" ? 4 : 3),
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {node.label}
                    </span>
                  </div>
                )}

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-current/20 flex flex-col gap-3 text-left overflow-y-auto max-h-[300px] pr-2"
                      style={{ fontSize: 12 * fontScale }}
                    >
                      {node.description && (
                        <div className="flex gap-2">
                          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
                          <p className="opacity-90">{node.description}</p>
                        </div>
                      )}
                      {node.metadata?.definicao && (
                        <div className="bg-current/5 p-2 rounded-lg flex gap-2">
                          <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
                          <div>
                            <span className="font-bold block mb-1 opacity-70">Definição</span>
                            <span className="opacity-90">{node.metadata.definicao}</span>
                          </div>
                        </div>
                      )}
                      {node.metadata?.exemplo && (
                        <div className="bg-current/5 p-2 rounded-lg flex gap-2 border-l-4 border-current/20">
                          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
                          <div>
                            <span className="font-bold block mb-1 opacity-70">Exemplo</span>
                            <span className="opacity-90">{node.metadata.exemplo}</span>
                          </div>
                        </div>
                      )}
                      {node.metadata?.importancia && (
                        <div className="bg-current/5 p-2 rounded-lg flex gap-2">
                          <Target className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
                          <div>
                            <span className="font-bold block mb-1 opacity-70">Importância</span>
                            <span className="opacity-90">{node.metadata.importancia}</span>
                          </div>
                        </div>
                      )}
                      {node.metadata?.fonte && (
                        <div className="mt-2 text-[10px] opacity-60 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Fonte: {node.metadata.fonte}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {hasDetails && !readOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full p-1 shadow-md border border-current/20 hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ color: color, width: "24px", height: "24px" }}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}

                {/* Resize Handle */}
                {!readOnly && selected && !isExpanded && (
                  <div
                    onPointerDown={(e) => handleResizeDown(e, node)}
                    className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                    style={{ color: color }}
                  >
                    <Maximize2 className="w-3 h-3 rotate-90" />
                  </div>
                )}
              </div>
            </motion.div>
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
