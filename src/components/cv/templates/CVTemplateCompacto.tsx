import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

// Compact: dense single column, ATS-friendly
const CVTemplateCompacto: React.FC<Props> = ({ data, theme }) => {
  const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 style={{ fontSize: "10.5pt", fontWeight: 700, color: theme.primary, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${theme.primary}`, paddingBottom: 2, margin: "12px 0 6px" }}>{children}</h2>
  );
  return (
    <div style={{ padding: "30px 36px", minHeight: "297mm", backgroundColor: theme.bg, color: theme.text, fontFamily: "Calibri, Arial, sans-serif" }}>
      <div style={{ borderBottom: `3px solid ${theme.primary}`, paddingBottom: 8, marginBottom: 10 }}>
        <h1 style={{ fontSize: "20pt", fontWeight: 700, margin: 0, color: theme.primary }}>{data.nomeCompleto || "Seu Nome"}</h1>
        {data.titulo && <div style={{ fontSize: "10pt", color: theme.muted, marginTop: 2 }}>{data.titulo}</div>}
        <div style={{ fontSize: "8.5pt", color: theme.muted, marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {data.email && <span>{data.email}</span>}
          {data.telefone && <span>{data.telefone}</span>}
          {data.endereco && <span>{data.endereco}</span>}
          {data.linkedin && <span>{data.linkedin}</span>}
          {data.website && <span>{data.website}</span>}
        </div>
      </div>
      {data.resumoProfissional && (<div><H>Resumo</H><p style={{ fontSize: "9.5pt", color: theme.muted, margin: 0, lineHeight: 1.5 }}>{data.resumoProfissional}</p></div>)}
      {data.experiencias.length > 0 && (
        <><H>Experiência</H>
          {data.experiencias.map((e) => (
            <div key={e.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10pt" }}>
                <strong>{e.cargo} — {e.empresa}</strong><span style={{ color: theme.muted, fontSize: "9pt" }}>{e.dataInicio} — {e.dataFim || "Presente"}</span>
              </div>
              {e.descricao && <ul style={{ fontSize: "9pt", color: theme.muted, margin: "2px 0 0 18px" }}>{e.descricao.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>}
            </div>
          ))}
        </>
      )}
      {data.formacoes.length > 0 && (
        <><H>Formação</H>
          {data.formacoes.map((f) => (
            <div key={f.id} style={{ fontSize: "9.5pt", marginBottom: 4 }}>
              <strong>{f.curso}</strong> — {f.instituicao} <span style={{ color: theme.muted }}>({f.dataInicio} — {f.dataFim || "Presente"})</span>
            </div>
          ))}
        </>
      )}
      {data.habilidades.length > 0 && (
        <><H>Habilidades</H>
          <div style={{ fontSize: "9.5pt", color: theme.muted }}>{data.habilidades.filter(Boolean).join(" · ")}</div>
        </>
      )}
      {data.idiomas.length > 0 && (
        <><H>Idiomas</H>
          <div style={{ fontSize: "9.5pt", color: theme.muted }}>{data.idiomas.filter((i) => i.idioma).map((i) => `${i.idioma} (${i.nivel})`).join(" · ")}</div>
        </>
      )}
      {data.certificacoes.length > 0 && (
        <><H>Certificações</H>
          {data.certificacoes.filter((c) => c.nome).map((c) => (
            <div key={c.id} style={{ fontSize: "9.5pt", marginBottom: 2 }}>• {c.nome} — {c.instituicao}, {c.ano}</div>
          ))}
        </>
      )}
      {data.projetos.length > 0 && (
        <><H>Projetos</H>
          {data.projetos.filter((p) => p.nome).map((p) => (
            <div key={p.id} style={{ fontSize: "9.5pt", marginBottom: 2 }}>• <strong>{p.nome}</strong>{p.descricao && ` — ${p.descricao}`}</div>
          ))}
        </>
      )}
    </div>
  );
};

export default CVTemplateCompacto;
