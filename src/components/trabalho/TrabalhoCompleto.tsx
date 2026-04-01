import React, { useRef, useCallback, useState } from "react";
import PaginaA4 from "./PaginaA4";
import CapaPage from "./CapaPage";
import EditableSection, { type EditedSection } from "./EditableSection";
import FloatingToolbar from "./FloatingToolbar";
import { parseTrabalhoSections, renderMarkdownToHTML } from "@/lib/trabalho-parser";
import type { CoverPageData } from "@/lib/export-utils";

interface TrabalhoCompletoProps {
  conteudo: string;
  coverData: CoverPageData;
  capaImageUrl?: string | null;
  sectionImages?: Map<number, { url: string; caption: string }>;
  editable?: boolean;
  onContentChange?: (updatedHtml: string) => void;
}

const SectionContent: React.FC<{ titulo: string; html: string; tipo: string }> = ({ titulo, html, tipo }) => {
  const tituloDisplay = tipo === "indice" ? "ÍNDICE"
    : tipo === "introducao" ? "INTRODUÇÃO"
    : tipo === "conclusao" ? "CONCLUSÃO"
    : tipo === "bibliografia" ? "BIBLIOGRAFIA"
    : titulo;

  return (
    <div className="secao-wrapper">
      <h2 className="secao-titulo">{tituloDisplay}</h2>
      <div className="secao-divisor" />
      <div
        className="secao-conteudo"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

const TrabalhoCompleto: React.FC<TrabalhoCompletoProps> = ({ conteudo, coverData, capaImageUrl, sectionImages, editable = false, onContentChange }) => {
  const sections = parseTrabalhoSections(conteudo);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [editedSections, setEditedSections] = useState<Map<number, EditedSection>>(new Map());

  const registerRef = useCallback((index: number, el: HTMLDivElement | null) => {
    contentRefs.current.set(index, el);
  }, []);

  const handleSectionChange = useCallback((data: EditedSection) => {
    setEditedSections(prev => {
      const next = new Map(prev);
      next.set(data.index, data);
      return next;
    });

    // Rebuild full HTML content and notify parent
    if (onContentChange) {
      // We rebuild from the sections + edits
      const updatedParts = sections.map((section, i) => {
        const edited = i === data.index ? data : editedSections.get(i);
        const titulo = edited?.titulo || section.titulo;
        const sectionContent = edited?.html || renderMarkdownToHTML(section.conteudo);
        return `## ${titulo}\n\n${sectionContent}`;
      });
      onContentChange(updatedParts.join("\n\n"));
    }
  }, [sections, editedSections, onContentChange]);

  return (
    <div className="trabalho-completo" id="trabalho-completo" ref={containerRef}>
      {editable && <FloatingToolbar containerRef={containerRef} />}

      {/* PÁGINA 1 — CAPA */}
      <PaginaA4 tipo="capa">
        <CapaPage data={coverData} capaImageUrl={capaImageUrl} />
      </PaginaA4>

      {/* DEMAIS PÁGINAS */}
      {sections.map((section, index) => {
        const sectionImage = sectionImages?.get(index);
        return (
          <PaginaA4
            key={index}
            tipo={section.tipo === "indice" ? "indice" : "conteudo"}
            numero={section.numero}
          >
            {editable ? (
              <EditableSection
                titulo={section.titulo}
                html={renderMarkdownToHTML(section.conteudo)}
                tipo={section.tipo}
                index={index}
                onContentChange={handleSectionChange}
                registerRef={registerRef}
              />
            ) : (
              <SectionContent
                titulo={section.titulo}
                html={renderMarkdownToHTML(section.conteudo)}
                tipo={section.tipo}
              />
            )}
            {sectionImage && (
              <div className="secao-imagem" style={{ marginTop: "16px", textAlign: "center" }}>
                <img
                  src={sectionImage.url}
                  alt={sectionImage.caption}
                  style={{ maxWidth: "85%", margin: "0 auto", borderRadius: "4px", border: "1px solid #e0e0e0" }}
                  loading="lazy"
                />
                <p style={{ fontSize: "10px", color: "#666", marginTop: "6px", fontStyle: "italic" }}>
                  {sectionImage.caption}
                </p>
              </div>
            )}
          </PaginaA4>
        );
      })}
    </div>
  );
};

export default TrabalhoCompleto;
