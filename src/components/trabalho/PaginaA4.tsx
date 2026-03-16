import React from "react";

interface PaginaA4Props {
  numero?: number;
  tipo?: "capa" | "indice" | "conteudo";
  children: React.ReactNode;
}

const PaginaA4: React.FC<PaginaA4Props> = ({ numero, tipo = "conteudo", children }) => {
  return (
    <div className="pagina-a4-wrapper">
      <div className="pagina-a4">
        <div className="pagina-a4-content">
          {children}
        </div>
        {tipo === "conteudo" && numero && (
          <div className="pagina-a4-numero">{numero}</div>
        )}
      </div>
    </div>
  );
};

export default PaginaA4;
