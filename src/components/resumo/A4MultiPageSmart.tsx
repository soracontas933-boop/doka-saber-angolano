/**
 * A4MultiPageSmart — Paginação Inteligente baseada em offsets reais.
 *
 * Estratégia (à prova de cortes e fiel ao PDF):
 * 1. Renderiza o conteúdo UMA VEZ num nó oculto à largura A4.
 * 2. Lê o offsetTop+offsetHeight dos "cards" (top-level children + [data-card]).
 * 3. Calcula pontos de quebra: começa nova página SEMPRE no topo do
 *    primeiro card que não cabe inteiro na página atual.
 * 4. Renderiza N páginas — cada uma é uma janela A4 que mostra o mesmo
 *    DOM "rolado" por marginTop negativo até pageOffsets[i].
 *
 * Resultado: preview = PDF (porque o exportador captura cada [data-a4-page]).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  orientation?: "portrait" | "landscape";
  children: React.ReactNode;
  minPages?: number;
  /** Páginas alvo escolhidas pelo utilizador. */
  targetPages?: number;
  allowAddPage?: boolean;
  extraPages?: number;
  onAddPage?: () => void;
  onRemovePage?: () => void;
  /** Reportado quando muda o nº real de páginas de conteúdo. */
  onContentPagesChange?: (n: number) => void;
  padding?: number;
}

const A4MultiPageSmart: React.FC<Props> = ({
  orientation = "portrait",
  children,
  minPages = 1,
  targetPages,
  allowAddPage = true,
  extraPages = 0,
  onAddPage,
  onRemovePage,
  onContentPagesChange,
  padding = 48,
}) => {
  const W = orientation === "landscape" ? 1123 : 794;
  const H = orientation === "landscape" ? 794 : 1123;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pageOffsets, setPageOffsets] = useState<number[]>([0]);

  // Cálculo de quebras inteligentes
  useLayoutEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    const compute = () => {
      const root = measureRef.current;
      if (!root) return;
      const innerH = H - padding * 2;
      // 1. Recolhe candidatos a "card" — preferimos elementos com [data-card],
      //    senão usamos os filhos diretos do conteúdo (estratégia universal).
      let cards: HTMLElement[] = Array.from(
        root.querySelectorAll<HTMLElement>("[data-card]")
      );
      if (cards.length === 0) {
        // Achata um nível: filhos diretos do primeiro nó "real"
        const firstReal = root.firstElementChild as HTMLElement | null;
        if (firstReal) {
          cards = Array.from(firstReal.children).filter(
            (c): c is HTMLElement => c instanceof HTMLElement
          );
          // Se houver wrappers internos (ex: <Header/> + secções), descer mais um nível
          if (cards.length === 1 && cards[0].children.length > 1) {
            cards = Array.from(cards[0].children).filter(
              (c): c is HTMLElement => c instanceof HTMLElement
            );
          }
        }
      }

      const totalH = root.scrollHeight;
      if (cards.length === 0 || totalH <= innerH) {
        const needed = Math.max(
          minPages,
          Math.max(1, Math.ceil(totalH / innerH))
        );
        const offsets = Array.from({ length: needed }, (_, i) => i * innerH);
        setPageOffsets(offsets);
        return;
      }

      // 2. Greedy: preenche página até que o próximo card não caiba
      const offsets: number[] = [0];
      let currentStart = 0;
      for (const card of cards) {
        const top = card.offsetTop;
        const bottom = top + card.offsetHeight;
        // Se o card já começa antes da página atual, ignora
        if (bottom <= currentStart) continue;
        // Se ultrapassa o limite da página atual → começa nova página no topo deste card
        if (bottom - currentStart > innerH) {
          // Card é maior que uma página inteira: quebra-se obrigatoriamente
          // nele mesmo (não dá para evitar) — começa a página neste card.
          if (top > currentStart) {
            currentStart = top;
            offsets.push(currentStart);
          } else {
            // Card maior que a página: avança "innerH" e segue
            currentStart = currentStart + innerH;
            offsets.push(currentStart);
          }
        }
      }

      // Garante que cobrimos até ao fim
      while (offsets[offsets.length - 1] + innerH < totalH) {
        offsets.push(offsets[offsets.length - 1] + innerH);
      }

      const needed = Math.max(minPages, offsets.length);
      while (offsets.length < needed) {
        offsets.push(offsets[offsets.length - 1] + innerH);
      }
      setPageOffsets(offsets);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(compute);
    });

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(compute);
      });
    });
    if (measureRef.current) ro.observe(measureRef.current);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
    };
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

  const totalPages = pageOffsets.length + extraPages;
  const innerH = H - padding * 2;
  const innerW = W - padding * 2;

  return (
    <div ref={wrapperRef} className="w-full">
      {/* Nó "fonte" oculto para medição (renderiza children uma vez à largura A4) */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          width: innerW,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>

      <div className="flex flex-col items-center gap-5">
        {Array.from({ length: totalPages }).map((_, i) => {
          const isExtra = i >= pageOffsets.length;
          const offset = pageOffsets[i] ?? 0;
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
                      width: innerW,
                      height: innerH,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        marginTop: -offset,
                        width: innerW,
                      }}
                    >
                      {children}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    bottom: 14,
                    right: 18,
                    fontSize: 10,
                    color: "#94a3b8",
                    fontFamily: "'SF Pro Display', system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {isExtra && onRemovePage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePage();
                      }}
                      className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition-colors"
                      title="Remover página extra"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                  <span>
                    Página {i + 1} de {totalPages}
                  </span>
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
