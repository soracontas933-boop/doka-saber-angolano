import React, { useEffect, useRef, useState } from "react";

interface A4SheetProps {
  orientation?: "portrait" | "landscape";
  children: React.ReactNode;
  /** Ref para captura do conteúdo "real" (1:1) usado pelo PDF export. */
  innerRef?: React.RefObject<HTMLDivElement>;
  /** Se true, a folha cresce verticalmente para acomodar todo o conteúdo sem cortar. */
  multiPage?: boolean;
}

/**
 * Folha A4 com largura fixa em pixels (794×1123 portrait, 1123×794 landscape)
 * que escala proporcionalmente ao container pai. Garante que a pré-visualização
 * é IDÊNTICA ao PDF exportado e que o conteúdo nunca "transborda" o A4.
 */
const A4Sheet: React.FC<A4SheetProps> = ({
  orientation = "landscape",
  children,
  innerRef,
  multiPage = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  const W = orientation === "landscape" ? 1123 : 794;
  const H = orientation === "landscape" ? 794 : 1123;

  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const containerW = wrapperRef.current.clientWidth;
      const newScale = Math.min(1, containerW / W);
      setScale(newScale);

      if (multiPage && contentRef.current) {
        // Mede a altura real do conteúdo para ajustar o wrapper
        const realHeight = contentRef.current.scrollHeight;
        // Garante que tenha pelo menos a altura de uma página A4
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

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: innerHeight * scale,
        position: "relative",
        overflow: "hidden",
        marginBottom: 20,
      }}
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
          overflow: multiPage ? "visible" : "hidden",
          position: "relative",
        }}
      >
        {children}
        
        {/* Linhas de guia de página para multiPage */}
        {multiPage && (
          <div style={{ pointerEvents: "none", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
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
                      justifyContent: "center"
                    }} 
                  >
                    <span style={{ 
                      background: "#1E9DF1", 
                      color: "#fff", 
                      fontSize: "10px", 
                      padding: "2px 8px", 
                      borderRadius: "0 0 8px 8px",
                      fontWeight: "bold",
                      textTransform: "uppercase"
                    }}>
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

export default A4Sheet;
