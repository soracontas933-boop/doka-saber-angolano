import React, { useRef, useCallback } from "react";

export interface EditedSection {
  index: number;
  titulo: string;
  html: string;
}

interface EditableSectionProps {
  titulo: string;
  html: string;
  tipo: string;
  index: number;
  onContentChange: (data: EditedSection) => void;
  registerRef?: (index: number, el: HTMLDivElement | null) => void;
}

const EditableSection: React.FC<EditableSectionProps> = ({
  titulo,
  html,
  tipo,
  index,
  onContentChange,
  registerRef,
}) => {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const conteudoRef = useRef<HTMLDivElement>(null);

  const tituloDisplay =
    tipo === "indice" ? "ÍNDICE"
    : tipo === "introducao" ? "INTRODUÇÃO"
    : tipo === "conclusao" ? "CONCLUSÃO"
    : tipo === "bibliografia" ? "BIBLIOGRAFIA"
    : titulo;

  const emitChange = useCallback(() => {
    const newTitulo = tituloRef.current?.textContent || titulo;
    const newHtml = conteudoRef.current?.innerHTML || html;
    onContentChange({ index, titulo: newTitulo, html: newHtml });
  }, [index, titulo, html, onContentChange]);

  return (
    <div className="secao-wrapper editable-section">
      <h2
        ref={tituloRef}
        className="secao-titulo editable-title"
        contentEditable
        suppressContentEditableWarning
        onBlur={emitChange}
        spellCheck={false}
      >
        {tituloDisplay}
      </h2>
      <div className="secao-divisor" />
      <div
        ref={(el) => {
          (conteudoRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          registerRef?.(index, el);
        }}
        className="secao-conteudo editable-content"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: html }}
        onBlur={emitChange}
        spellCheck={false}
      />
    </div>
  );
};

export default EditableSection;
