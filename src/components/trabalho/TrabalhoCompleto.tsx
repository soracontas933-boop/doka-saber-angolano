import React from "react";
import PaginaA4 from "./PaginaA4";
import CapaPage from "./CapaPage";
import { parseTrabalhoSections, renderMarkdownToHTML } from "@/lib/trabalho-parser";
import type { CoverPageData } from "@/lib/export-utils";

interface TrabalhoCompletoProps {
  conteudo: string;
  coverData: CoverPageData;
  capaImageUrl?: string | null;
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

const TrabalhoCompleto: React.FC<TrabalhoCompletoProps> = ({ conteudo, coverData, capaImageUrl }) => {
  const sections = parseTrabalhoSections(conteudo);

  return (
    <div className="trabalho-completo" id="trabalho-completo">
      {/* PÁGINA 1 — CAPA */}
      <PaginaA4 tipo="capa">
        <CapaPage data={coverData} capaImageUrl={capaImageUrl} />
      </PaginaA4>

      {/* DEMAIS PÁGINAS */}
      {sections.map((section, index) => (
        <PaginaA4
          key={index}
          tipo={section.tipo === "indice" ? "indice" : "conteudo"}
          numero={section.numero}
        >
          <SectionContent
            titulo={section.titulo}
            html={renderMarkdownToHTML(section.conteudo)}
            tipo={section.tipo}
          />
        </PaginaA4>
      ))}
    </div>
  );
};

export default TrabalhoCompleto;
