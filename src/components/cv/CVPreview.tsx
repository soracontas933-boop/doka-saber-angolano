import React, { useEffect, useRef, useState } from "react";
import type { CVData, CVTemplate } from "@/types/cv";
import { getTheme } from "@/lib/cv-themes";
import CVTemplateModerno from "./templates/CVTemplateModerno";
import CVTemplateClassico from "./templates/CVTemplateClassico";
import CVTemplateMinimalista from "./templates/CVTemplateMinimalista";
import CVTemplateExecutivo from "./templates/CVTemplateExecutivo";
import CVTemplateCriativo from "./templates/CVTemplateCriativo";
import CVTemplateCompacto from "./templates/CVTemplateCompacto";
import CVTemplateElegante from "./templates/CVTemplateElegante";
import CVTemplateTecnologico from "./templates/CVTemplateTecnologico";

interface CVPreviewProps {
  data: CVData;
  template: CVTemplate;
  themeId?: string;
}

// A4 at 96dpi: 794 x 1123 px
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const CVPreview: React.FC<CVPreviewProps> = ({ data, template, themeId = "navy" }) => {
  const theme = getTheme(themeId);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Responsive scaling: fit A4 width to container width
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const containerWidth = wrapperRef.current.clientWidth;
      const next = Math.min(1, (containerWidth - 8) / A4_WIDTH);
      setScale(next);
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

  const renderTemplate = () => {
    switch (template) {
      case "moderno": return <CVTemplateModerno data={data} theme={theme} />;
      case "classico": return <CVTemplateClassico data={data} theme={theme} />;
      case "minimalista": return <CVTemplateMinimalista data={data} theme={theme} />;
      case "executivo": return <CVTemplateExecutivo data={data} theme={theme} />;
      case "criativo": return <CVTemplateCriativo data={data} theme={theme} />;
      case "compacto": return <CVTemplateCompacto data={data} theme={theme} />;
      case "elegante": return <CVTemplateElegante data={data} theme={theme} />;
      case "tecnologico": return <CVTemplateTecnologico data={data} theme={theme} />;
      default: return <CVTemplateModerno data={data} theme={theme} />;
    }
  };

  // Measure inner content to scale wrapper height correctly (supports multi-page A4)
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerHeight, setInnerHeight] = useState(A4_HEIGHT);

  useEffect(() => {
    if (!innerRef.current) return;
    const update = () => {
      if (innerRef.current) {
        setInnerHeight(Math.max(A4_HEIGHT, innerRef.current.scrollHeight));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [data, template, themeId]);

  return (
    <div
      ref={wrapperRef}
      className="cv-preview-wrapper w-full flex justify-center"
      style={{ height: innerHeight * scale + 16 }}
    >
      <div
        ref={innerRef}
        className="bg-white shadow-xl"
        style={{
          width: A4_WIDTH,
          minHeight: A4_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          fontFamily: "Arial, sans-serif",
          color: "#1a1a1a",
          fontSize: "11pt",
          lineHeight: 1.5,
          overflow: "visible",
        }}
      >
        {renderTemplate()}
      </div>
    </div>
  );
};

export default CVPreview;
