import React from "react";
import type { CVData, CVTemplate } from "@/types/cv";
import CVTemplateModerno from "./templates/CVTemplateModerno";
import CVTemplateClassico from "./templates/CVTemplateClassico";
import CVTemplateMinimalista from "./templates/CVTemplateMinimalista";

interface CVPreviewProps {
  data: CVData;
  template: CVTemplate;
}

const CVPreview: React.FC<CVPreviewProps> = ({ data, template }) => {
  const renderTemplate = () => {
    switch (template) {
      case "moderno":
        return <CVTemplateModerno data={data} />;
      case "classico":
        return <CVTemplateClassico data={data} />;
      case "minimalista":
        return <CVTemplateMinimalista data={data} />;
    }
  };

  return (
    <div className="cv-preview-wrapper flex justify-center">
      <div
        className="bg-white shadow-xl"
        style={{
          width: "210mm",
          minHeight: "297mm",
          transform: "scale(0.55)",
          transformOrigin: "top center",
          fontFamily: "Arial, sans-serif",
          color: "#1a1a1a",
          fontSize: "11pt",
          lineHeight: 1.5,
        }}
      >
        {renderTemplate()}
      </div>
    </div>
  );
};

export default CVPreview;
