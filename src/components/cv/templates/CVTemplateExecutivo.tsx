import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

// Two-column executive: dark band header + 2 columns
const CVTemplateExecutivo: React.FC<Props> = ({ data, theme }) => {
  const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 style={{ fontSize: "11pt", fontWeight: 700, color: theme.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${theme.primary}` }}>{children}</h2>
  );
  return (
    <div style={{ minHeight: "297mm", backgroundColor: theme.bg, color: theme.text }}>
      <div style={{ backgroundColor: theme.primary, color: theme.sidebarText, padding: "32px 40px", display: "flex", alignItems: "center", gap: 20 }}>
        {data.foto && <img src={data.foto} alt="" style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff" }} />}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "26pt", fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{data.nomeCompleto || "Seu Nome"}</h1>
          {data.titulo && <div style={{ fontSize: "12pt", opacity: 0.9, marginTop: 4 }}>{data.titulo}</div>}
          <div style={{ fontSize: "9pt", opacity: 0.85, marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
            {data.email && <span>✉ {data.email}</span>}
            {data.telefone && <span>☎ {data.telefone}</span>}
            {data.endereco && <span>📍 {data.endereco}</span>}
            {data.linkedin && <span>🔗 {data.linkedin}</span>}
          </div>
        </div>
      </div>
      <div style={{ padding: "28px 40px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 30 }}>
        <div>
          {data.resumoProfissional && (<div style={{ marginBottom: 18 }}><H>Sumário Executivo</H><p style={{ fontSize: "10pt", color: theme.muted, lineHeight: 1.6, textAlign: "justify" }}>{data.resumoProfissional}</p></div>)}
          {data.experiencias.length > 0 && (
            <div style={{ marginBottom: 18 }}><H>Experiência</H>
              {data.experiencias.map((e) => (
                <div key={e.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: "10.5pt", fontWeight: 700 }}>{e.cargo}</div>
                  <div style={{ fontSize: "9pt", color: theme.muted }}>{e.empresa}{e.local ? `, ${e.local}` : ""} · {e.dataInicio} — {e.dataFim || "Presente"}</div>
                  {e.descricao && <ul style={{ margin: "4px 0 0 16px", fontSize: "9pt", color: theme.muted }}>{e.descricao.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>}
                </div>
              ))}
            </div>
          )}
          {data.projetos.length > 0 && (
            <div><H>Projetos</H>
              {data.projetos.filter((p) => p.nome).map((p) => (
                <div key={p.id} style={{ fontSize: "9pt", marginBottom: 6 }}><strong>{p.nome}</strong>{p.descricao && <p style={{ color: theme.muted, margin: "2px 0" }}>{p.descricao}</p>}</div>
              ))}
            </div>
          )}
        </div>
        <div>
          {data.formacoes.length > 0 && (
            <div style={{ marginBottom: 18 }}><H>Formação</H>
              {data.formacoes.map((f) => (
                <div key={f.id} style={{ marginBottom: 10, fontSize: "9pt" }}>
                  <div style={{ fontWeight: 700 }}>{f.curso}</div>
                  <div style={{ color: theme.muted }}>{f.instituicao}</div>
                  <div style={{ color: theme.muted, fontSize: "8.5pt" }}>{f.dataInicio} — {f.dataFim || "Presente"}</div>
                </div>
              ))}
            </div>
          )}
          {data.habilidades.length > 0 && (
            <div style={{ marginBottom: 18 }}><H>Competências</H>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.habilidades.filter(Boolean).map((h, i) => (
                  <span key={i} style={{ fontSize: "8.5pt", padding: "3px 8px", border: `1px solid ${theme.primary}`, color: theme.primary, borderRadius: 3 }}>{h}</span>
                ))}
              </div>
            </div>
          )}
          {data.idiomas.length > 0 && (
            <div style={{ marginBottom: 18 }}><H>Idiomas</H>
              {data.idiomas.filter((i) => i.idioma).map((i) => (
                <div key={i.id} style={{ fontSize: "9pt", marginBottom: 3 }}><strong>{i.idioma}</strong> <span style={{ color: theme.muted }}>· {i.nivel}</span></div>
              ))}
            </div>
          )}
          {data.certificacoes.length > 0 && (
            <div><H>Certificações</H>
              {data.certificacoes.filter((c) => c.nome).map((c) => (
                <div key={c.id} style={{ fontSize: "9pt", marginBottom: 4 }}><strong>{c.nome}</strong><div style={{ color: theme.muted, fontSize: "8.5pt" }}>{c.instituicao} · {c.ano}</div></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVTemplateExecutivo;
