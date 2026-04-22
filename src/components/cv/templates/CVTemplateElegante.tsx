import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

// Elegant: serif headings, soft borders, generous spacing
const CVTemplateElegante: React.FC<Props> = ({ data, theme }) => {
  const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 style={{ fontSize: "13pt", fontWeight: 400, color: theme.primary, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${theme.primary}33` }}>{children}</h2>
  );
  return (
    <div style={{ padding: "48px 56px", minHeight: "297mm", backgroundColor: theme.bg, color: theme.text, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div style={{ textAlign: "center", marginBottom: 28, paddingBottom: 20, borderBottom: `2px solid ${theme.primary}` }}>
        {data.foto && <img src={data.foto} alt="" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", margin: "0 auto 12px", display: "block", border: `3px solid ${theme.primary}33` }} />}
        <h1 style={{ fontSize: "30pt", fontWeight: 400, margin: 0, color: theme.primary, letterSpacing: 4 }}>{data.nomeCompleto || "Seu Nome"}</h1>
        {data.titulo && <div style={{ fontSize: "11pt", color: theme.muted, marginTop: 6, fontStyle: "italic", letterSpacing: 2 }}>{data.titulo}</div>}
        <div style={{ fontSize: "9pt", color: theme.muted, marginTop: 10, display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          {data.email && <span>{data.email}</span>}
          {data.telefone && <span>{data.telefone}</span>}
          {data.endereco && <span>{data.endereco}</span>}
          {data.linkedin && <span>{data.linkedin}</span>}
        </div>
      </div>
      {data.resumoProfissional && (<div style={{ marginBottom: 18 }}><H>Perfil</H><p style={{ fontSize: "10.5pt", color: theme.muted, lineHeight: 1.8, textAlign: "justify" }}>{data.resumoProfissional}</p></div>)}
      {data.experiencias.length > 0 && (
        <div style={{ marginBottom: 18 }}><H>Experiência Profissional</H>
          {data.experiencias.map((e) => (
            <div key={e.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "11pt", fontWeight: 700 }}>{e.cargo}</div>
              <div style={{ fontSize: "10pt", color: theme.muted, fontStyle: "italic" }}>{e.empresa}{e.local ? `, ${e.local}` : ""} — {e.dataInicio} a {e.dataFim || "Presente"}</div>
              {e.descricao && <p style={{ fontSize: "10pt", color: theme.muted, margin: "6px 0 0", lineHeight: 1.7 }}>{e.descricao}</p>}
            </div>
          ))}
        </div>
      )}
      {data.formacoes.length > 0 && (
        <div style={{ marginBottom: 18 }}><H>Formação Académica</H>
          {data.formacoes.map((f) => (
            <div key={f.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: "11pt", fontWeight: 700 }}>{f.curso}</div>
              <div style={{ fontSize: "10pt", color: theme.muted, fontStyle: "italic" }}>{f.instituicao} — {f.dataInicio} a {f.dataFim || "Presente"}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {data.habilidades.length > 0 && (
          <div><H>Competências</H>
            <ul style={{ fontSize: "10pt", color: theme.muted, paddingLeft: 18, margin: 0 }}>
              {data.habilidades.filter(Boolean).map((h, i) => <li key={i} style={{ marginBottom: 3 }}>{h}</li>)}
            </ul>
          </div>
        )}
        {data.idiomas.length > 0 && (
          <div><H>Idiomas</H>
            {data.idiomas.filter((i) => i.idioma).map((i) => (
              <div key={i.id} style={{ fontSize: "10pt", color: theme.muted, marginBottom: 3 }}><strong>{i.idioma}</strong> — {i.nivel}</div>
            ))}
          </div>
        )}
      </div>
      {data.certificacoes.length > 0 && (
        <div style={{ marginTop: 18 }}><H>Certificações</H>
          {data.certificacoes.filter((c) => c.nome).map((c) => (
            <div key={c.id} style={{ fontSize: "10pt", color: theme.muted, marginBottom: 3 }}>{c.nome} — <em>{c.instituicao}</em>, {c.ano}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CVTemplateElegante;
