import React, { useEffect, useRef, useState } from "react";

interface A4SheetProps {
  orientation?: "portrait" | "landscape";
  children: React.ReactNode;
  /** Ref para captura do conteúdo "real" (1:1) usado pelo PDF export. */
  innerRef?: React.RefObject<HTMLDivElement>;
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
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const W = orientation === "landscape" ? 1123 : 794;
  const H = orientation === "landscape" ? 794 : 1123;

  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const containerW = wrapperRef.current.clientWidth;
      const newScale = Math.min(1, containerW / W);
      setScale(newScale);
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

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: H * scale,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={innerRef}
        data-a4-sheet
        data-orientation={orientation}
        style={{
          width: W,
          height: H,
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default A4Sheet;
