/**
 * A4MultiPageSmart — Paginação Inteligente
 * 
 * Renderiza conteúdo em múltiplas folhas A4 garantindo que:
 * - Nenhum card/bloco seja cortado entre páginas
 * - A pré-visualização seja idêntica ao PDF exportado
 * - Todos os elementos respeitem break-inside: avoid
 * - Não haja overflow: hidden ou alturas fixas
 * 
 * Estratégia: Mede a altura real de cada card, distribui em páginas
 * respeitando o limite de altura, e renderiza cada página separadamente.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  measureElementHeight,
  collectCardMetrics,
  paginateCards,
  applyPageBreakStyles,
  type PageLayout,
} from "@/lib/smart-pagination";

interface A4MultiPageSmartProps {
  orientation?: "portrait" | "landscape";
  /** Conteúdo que será distribuído inteligentemente em páginas A4 */
  children: React.ReactNode;
  /** Número mínimo de páginas */
  minPages?: number;
  /** Permite adicionar páginas vazias manualmente */
  allowAddPage?: boolean;
  /** Páginas extras adicionadas manualmente */
  extraPages?: number;
  onAddPage?: () => void;
  /** Padding interno em px de cada página A4 */
  padding?: number;
}

const A4MultiPageSmart: React.FC<A4MultiPageSmartProps> = ({
  orientation = "portrait",
  children,
  minPages = 1,
  allowAddPage = true,
  extraPages = 0,
  onAddPage,
  padding = 48,
}) => {
  const W = orientation === "landscape" ? 1123 : 794;
  const H = orientation === "landscape" ? 794 : 1123;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pages, setPages] = useState<PageLayout[]>([]);
  const [pageCount, setPageCount] = useState(minPages);

  // Medição inteligente: calcula nº de páginas com base na altura real dos cards
  useLayoutEffect(() => {
    const measure = async () => {
      if (!measureRef.current) return;

      try {
        // Aguarda um frame para garantir que o conteúdo foi renderizado
        await new Promise((r) => requestAnimationFrame(r));

        // Coleta métricas de todos os cards
        const cardMetrics = collectCardMetrics(measureRef.current);

        if (cardMetrics.length === 0) {
          // Se não encontrou cards, usa a altura total do conteúdo
          const totalHeight = measureRef.current.scrollHeight;
          const innerH = H - padding * 2;
          const needed = Math.max(minPages, Math.ceil(totalHeight / innerH));
          setPageCount(needed);
          setPages([]);
          return;
        }

        // Distribui cards em páginas
        const innerH = H - padding * 2;
        const layouts = paginateCards(cardMetrics, H, padding);
        const needed = Math.max(minPages, layouts.length);

        setPages(layouts);
        setPageCount(needed);
      } catch (error) {
        console.error("Erro ao medir conteúdo:", error);
        // Fallback: usa altura total
        if (measureRef.current) {
          const totalHeight = measureRef.current.scrollHeight;
          const innerH = H - padding * 2;
          const needed = Math.max(minPages, Math.ceil(totalHeight / innerH));
          setPageCount(needed);
        }
      }
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    if (measureRef.current) ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, [children, H, padding, minPages]);

  // Escala responsiva
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const cw = wrapperRef.current.clientWidth;
      setScale(Math.min(1, cw / W));
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [W]);

  const totalPages = pageCount + extraPages;
  const innerH = H - padding * 2;

  return (
    <div ref={wrapperRef} className="w-full">
      {/* Nó "fonte" oculto — renderiza o conteúdo real apenas uma vez para medição */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          width: W - padding * 2,
          visibility: "hidden",
          pointerEvents: "none",
          overflow: "visible",
          height: "auto",
        }}
      >
        {children}
      </div>

      {/* Páginas A4 visíveis */}
      <div className="flex flex-col items-center gap-5">
        {Array.from({ length: totalPages }).map((_, i) => {
          const isExtra = i >= pageCount;
          const pageLayout = pages[i];

          return (
            <div
              key={i}
              style={{
                width: W * scale,
                height: H * scale,
                position: "relative",
              }}
            >
              <div
                data-a4-page={i + 1}
                data-a4-orientation={orientation}
                style={{
                  width: W,
                  height: H,
                  background: "#ffffff",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  overflow: "visible",
                  position: "relative",
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {!isExtra && (
                  <div
                    style={{
                      position: "absolute",
                      top: padding,
                      left: padding,
                      right: padding,
                      bottom: padding,
                      overflow: "visible",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                    }}
                  >
                    <div
                      style={{
                        width: W - padding * 2,
                        height: "auto",
                        overflow: "visible",
                        pageBreakInside: "avoid",
                        breakInside: "avoid",
                      }}
                    >
                      {children}
                    </div>
                  </div>
                )}

                {/* Número da página */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 14,
                    right: 18,
                    fontSize: 10,
                    color: "#94a3b8",
                    fontFamily: "'SF Pro Display', system-ui, sans-serif",
                  }}
                >
                  Página {i + 1} de {totalPages}
                </div>
              </div>
            </div>
          );
        })}

        {allowAddPage && onAddPage && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddPage}
            className="gap-2 rounded-full mt-2"
          >
            <Plus className="h-4 w-4" /> Adicionar página
          </Button>
        )}
      </div>
    </div>
  );
};

export default A4MultiPageSmart;
