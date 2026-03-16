import React from "react";
import type { CoverPageData } from "@/lib/export-utils";
import brasaoAngola from "@/assets/brasao-angola.svg";

interface CapaPageProps {
  data: CoverPageData;
  capaImageUrl?: string | null;
}

const CapaPage: React.FC<CapaPageProps> = ({ data, capaImageUrl }) => {
  const currentMonth = new Date().toLocaleDateString("pt-AO", { month: "long", year: "numeric" });

  return (
    <div className="capa-page">
      {/* Decorative border */}
      <div className="capa-border">
        {/* Header: Coat of arms + institutional info */}
        <div className="capa-header">
          {capaImageUrl ? (
            <img src={capaImageUrl} alt="Capa" className="capa-img-gerada" />
          ) : (
            <img src={ANGOLA_COAT_OF_ARMS_URL} alt="Brasão de Angola" className="capa-brasao" />
          )}
          <p className="capa-republica">República de Angola</p>
          <p className="capa-ministerio">Ministério da Educação</p>
          {data.nomeEscola && <p className="capa-escola">{data.nomeEscola}</p>}
        </div>

        {/* Title box */}
        <div className="capa-titulo-box">
          <h1 className="capa-tipo">{data.tipoTrabalho.toUpperCase()}</h1>
        </div>

        {/* Theme */}
        <div className="capa-tema-section">
          <p className="capa-label">TEMA:</p>
          <p className="capa-tema">{data.tema.toUpperCase()}</p>
        </div>

        {/* Student info */}
        <div className="capa-info">
          {data.modalidade === "grupo" && data.nomesIntegrantes && data.nomesIntegrantes.length > 0 ? (
            <>
              <p className="capa-info-label">Integrantes:</p>
              {data.nomesIntegrantes.filter(Boolean).map((nome, i) => (
                <p key={i} className="capa-info-integrante">{i + 1}. {nome}</p>
              ))}
            </>
          ) : (
            data.nomeAluno && <p><strong>Nome:</strong> {data.nomeAluno}</p>
          )}
          {data.numero && <p><strong>Nº</strong> {data.numero}</p>}
          {data.sala && <p><strong>Sala:</strong> {data.sala}</p>}
          {data.turma && <p><strong>Turma:</strong> {data.turma}</p>}
          {data.curso && <p><strong>Curso:</strong> {data.curso}</p>}
          {data.disciplina && <p><strong>Disciplina:</strong> {data.disciplina}</p>}
          {data.classe && <p><strong>Classe:</strong> {data.classe}</p>}
        </div>

        {/* Orientador */}
        {data.nomeDocente && (
          <div className="capa-orientador">
            <p className="capa-orientador-label">ORIENTADOR</p>
            <p>{data.nomeDocente}</p>
          </div>
        )}

        {/* Footer */}
        <div className="capa-footer">
          <p>{data.localidade || "Luanda - Angola"}, {currentMonth}</p>
        </div>
      </div>
    </div>
  );
};

export default CapaPage;
