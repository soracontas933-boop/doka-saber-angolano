/**
 * A4SheetSmart — Folha A4 com Paginação Inteligente
 * 
 * Folha A4 que se adapta dinamicamente ao conteúdo sem nunca cortá-lo.
 * Garante que a pré-visualização seja 1:1 com o PDF exportado.
 * 
 * REGRAS APLICADAS:
 * - overflow: visible em todos os containers
 * - height: auto para permitir crescimento
 * - break-inside: avoid e page-break-inside: avoid em todos os elementos
 * - Nenhuma altura fixa que possa cortar conteúdo
 */

import React, { useEffect, useRef, useState } from "react";
import { applyPageBreakStyles } from "@/lib/smart-pagination";

interface A4SheetSmartProps {
  orientation?: "portrait" | "landscape";
  children: React.ReactNode;
  /** Ref para captura do conteúdo "real" (1:1) usado pelo PDF export */
  innerRef?: React.RefObject<HTMLDivElement>;
  /** Se true, a folha cresce verticalmente para acomodar todo o conteúdo */
  multiPage?: boolean;
}

const A4SheetSmart: React.FC<A4SheetSmartProps> = ({
  orientation = "portrait",
  children,
  innerRef,
  multiPage = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  const W = orientation === "portrait" ? 794 : 1123;
  const H = orientation === "portrait" ? 1123 : 794;

  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const containerW = wrapperRef.current.clientWidth;
      const newScale = Math.min(1, containerW / W);
      setScale(newScale);

      if (multiPage && contentRef.current) {
        // Mede a altura real do conteúdo
        const realHeight = contentRef.current.scrollHeight;
        // Garante pelo menos uma página A4
        setInnerHeight(Math.max(H, realHeight));
      } else {
        setInnerHeight(H);
      }
    };

    update();
    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    if (contentRef.current) ro.observe(contentRef.current);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [W, H, multiPage]);

  // Aplica estilos de paginação quando o conteúdo é montado
  useEffect(() => {
    if (contentRef.current) {
      applyPageBreakStyles(contentRef.current);
    }
  }, [children]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: innerHeight * scale,
        position: "relative",
        overflow: "visible",
        marginBottom: 20,
        pageBreakInside: "avoid",
        breakInside: "avoid",
      } as React.CSSProperties}
    >
      <div
        ref={(el) => {
          // Atribui a ambas as refs
          if (innerRef) (innerRef as any).current = el;
          (contentRef as any).current = el;
        }}
        data-a4-sheet
        data-orientation={orientation}
        style={{
          width: W,
          minHeight: H,
          height: multiPage ? "auto" : H,
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "visible",
          position: "relative",
          pageBreakInside: "avoid",
          breakInside: "avoid",
        } as React.CSSProperties}
      >
        {children}

        {/* Linhas de guia de página para multiPage */}
        {multiPage && (
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            } as React.CSSProperties}
          >
            {Array.from({ length: Math.ceil(innerHeight / H) }).map((_, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div
                    data-page-guide="true"
                    style={{
                      position: "absolute",
                      top: i * H,
                      left: 0,
                      right: 0,
                      borderTop: "2px dashed #1E9DF1",
                      opacity: 0.5,
                      zIndex: 50,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                    } as React.CSSProperties}
                  >
                    <span
                      style={{
                        background: "#1E9DF1",
                        color: "#fff",
                        fontSize: "10px",
                        padding: "2px 8px",
                        borderRadius: "0 0 8px 8px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      Início da Página {i + 1}
                    </span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default A4SheetSmart;
