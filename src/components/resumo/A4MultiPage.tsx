import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface A4MultiPageProps {
  orientation?: "portrait" | "landscape";
  /** Conteúdo "linear" — será medido e distribuído em páginas A4. */
  children: React.ReactNode;
  /** Número mínimo de páginas (mostra páginas vazias se necessário). */
  minPages?: number;
  /** Permite ao utilizador adicionar páginas vazias manualmente. */
  allowAddPage?: boolean;
  /** Páginas extras vazias adicionadas manualmente. */
  extraPages?: number;
  onAddPage?: () => void;
  /** Padding interno em px de cada página A4. */
  padding?: number;
}

/**
 * Renderiza o conteúdo dentro de UMA OU MAIS folhas A4 reais (uma por página),
 * cada uma com altura fixa e overflow:hidden, simulando o que será o PDF.
 *
 * Estratégia: o conteúdo é renderizado uma única vez "fora do ecrã" para medição.
 * Depois clonamos o nó-raiz N vezes (uma por página), aplicando um translateY
 * negativo (margin-top negativo) para "rolar" o conteúdo dentro de cada folha.
 * Assim cada folha mostra a sua "fatia" do mesmo DOM real.
 *
 * Para o PDF, basta capturar cada `[data-a4-page]` separadamente.
 */
const A4MultiPage: React.FC<A4MultiPageProps> = ({
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
  const [pageCount, setPageCount] = useState(minPages);

  // Medição: calcula nº de páginas com base na altura real do conteúdo.
  useLayoutEffect(() => {
    const measure = () => {
      if (!measureRef.current) return;
      const innerH = H - padding * 2;
      const realH = measureRef.current.scrollHeight;
      const needed = Math.max(minPages, Math.ceil(realH / innerH));
      setPageCount(needed);
    };
    measure();
    const ro = new ResizeObserver(measure);
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
      {/* Nó "fonte" oculto — renderiza o conteúdo real apenas uma vez para medir */}
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
        }}
      >
        {children}
      </div>

      {/* Páginas A4 visíveis */}
      <div className="flex flex-col items-center gap-5">
        {Array.from({ length: totalPages }).map((_, i) => {
          const isExtra = i >= pageCount;
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
                  overflow: "hidden",
                  position: "relative",
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
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        marginTop: -i * innerH,
                        width: W - padding * 2,
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

export default A4MultiPage;
