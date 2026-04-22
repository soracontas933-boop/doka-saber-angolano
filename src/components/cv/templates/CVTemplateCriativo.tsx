import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

// Creative: large name with diagonal accent + timeline
const CVTemplateCriativo: React.FC<Props> = ({ data, theme }) => {
  const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 style={{ fontSize: "12pt", fontWeight: 800, color: theme.primary, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 24, height: 3, backgroundColor: theme.secondary, display: "inline-block" }} />
      {children}
    </h2>
  );
  return (
    <div style={{ minHeight: "297mm", backgroundColor: theme.bg, color: theme.text, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -120, right: -120, width: 380, height: 380, borderRadius: "50%", backgroundColor: `${theme.secondary}22` }} />
      <div style={{ position: "absolute", bottom: -100, left: -100, width: 300, height: 300, borderRadius: "50%", backgroundColor: `${theme.primary}11` }} />
      <div style={{ position: "relative", padding: "44px 48px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 28 }}>
          {data.foto && <img src={data.foto} alt="" style={{ width: 110, height: 110, borderRadius: 16, objectFit: "cover", boxShadow: `0 8px 24px ${theme.primary}33` }} />}
          <div>
            <div style={{ fontSize: "11pt", color: theme.secondary, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>{data.titulo || "Criativo"}</div>
            <h1 style={{ fontSize: "34pt", fontWeight: 900, margin: 0, lineHeight: 1, color: theme.primary }}>{data.nomeCompleto || "Seu Nome"}</h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: "9pt", color: theme.muted, marginBottom: 24 }}>
          {data.email && <span>✉ {data.email}</span>}
          {data.telefone && <span>☎ {data.telefone}</span>}
          {data.endereco && <span>📍 {data.endereco}</span>}
          {data.linkedin && <span>🔗 {data.linkedin}</span>}
          {data.website && <span>🌐 {data.website}</span>}
        </div>
        {data.resumoProfissional && (<div style={{ marginBottom: 22 }}><H>Sobre Mim</H><p style={{ fontSize: "10pt", color: theme.muted, lineHeight: 1.7 }}>{data.resumoProfissional}</p></div>)}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 28 }}>
          <div>
            {data.experiencias.length > 0 && (
              <div style={{ marginBottom: 22 }}><H>Trajetória</H>
                <div style={{ borderLeft: `2px solid ${theme.secondary}`, paddingLeft: 16 }}>
                  {data.experiencias.map((e) => (
                    <div key={e.id} style={{ marginBottom: 14, position: "relative" }}>
                      <span style={{ position: "absolute", left: -22, top: 4, width: 10, height: 10, borderRadius: "50%", backgroundColor: theme.primary }} />
                      <div style={{ fontSize: "10pt", fontWeight: 700 }}>{e.cargo}</div>
                      <div style={{ fontSize: "9pt", color: theme.muted }}>{e.empresa} · {e.dataInicio} — {e.dataFim || "Presente"}</div>
                      {e.descricao && <p style={{ fontSize: "9pt", color: theme.muted, margin: "4px 0 0" }}>{e.descricao}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.projetos.length > 0 && (
              <div><H>Projetos</H>
                {data.projetos.filter((p) => p.nome).map((p) => (
                  <div key={p.id} style={{ fontSize: "9pt", marginBottom: 8, padding: 10, backgroundColor: `${theme.primary}08`, borderRadius: 8 }}>
                    <strong>{p.nome}</strong>{p.descricao && <p style={{ color: theme.muted, margin: "2px 0 0" }}>{p.descricao}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            {data.habilidades.length > 0 && (
              <div style={{ marginBottom: 22 }}><H>Skills</H>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {data.habilidades.filter(Boolean).map((h, i) => (
                    <span key={i} style={{ fontSize: "9pt", padding: "4px 10px", borderRadius: 999, backgroundColor: theme.secondary, color: "#fff" }}>{h}</span>
                  ))}
                </div>
              </div>
            )}
            {data.formacoes.length > 0 && (
              <div style={{ marginBottom: 22 }}><H>Formação</H>
                {data.formacoes.map((f) => (
                  <div key={f.id} style={{ fontSize: "9pt", marginBottom: 8 }}>
                    <strong>{f.curso}</strong><div style={{ color: theme.muted }}>{f.instituicao} · {f.dataInicio} — {f.dataFim || "Presente"}</div>
                  </div>
                ))}
              </div>
            )}
            {data.idiomas.length > 0 && (
              <div style={{ marginBottom: 22 }}><H>Idiomas</H>
                {data.idiomas.filter((i) => i.idioma).map((i) => (
                  <div key={i.id} style={{ fontSize: "9pt", marginBottom: 3 }}>{i.idioma} <span style={{ color: theme.muted }}>· {i.nivel}</span></div>
                ))}
              </div>
            )}
            {data.certificacoes.length > 0 && (
              <div><H>Certificados</H>
                {data.certificacoes.filter((c) => c.nome).map((c) => (
                  <div key={c.id} style={{ fontSize: "9pt", marginBottom: 4 }}>{c.nome} <span style={{ color: theme.muted }}>· {c.ano}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVTemplateCriativo;
