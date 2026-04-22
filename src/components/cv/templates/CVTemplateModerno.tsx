import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

const CVTemplateModerno: React.FC<Props> = ({ data, theme }) => {
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ fontSize: "13pt", fontWeight: 700, color: theme.primary, textTransform: "uppercase", letterSpacing: 2, borderBottom: `2px solid ${theme.primary}`, paddingBottom: 4, marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "297mm", width: "100%", backgroundColor: theme.bg }}>
      <div style={{ width: "35%", backgroundColor: theme.primary, color: theme.sidebarText, padding: "30px 20px" }}>
        {data.foto && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img src={data.foto} alt="Foto" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff" }} />
          </div>
        )}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: "11pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: 4 }}>Contacto</h3>
          <div style={{ fontSize: "9pt", lineHeight: 2 }}>
            {data.email && <div>✉ {data.email}</div>}
            {data.telefone && <div>☎ {data.telefone}</div>}
            {data.endereco && <div>📍 {data.endereco}</div>}
            {data.dataNascimento && <div>📅 {data.dataNascimento}</div>}
            {data.linkedin && <div>🔗 {data.linkedin}</div>}
            {data.website && <div>🌐 {data.website}</div>}
          </div>
        </div>
        {data.habilidades.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: "11pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: 4 }}>Habilidades</h3>
            <ul style={{ listStyle: "none", padding: 0, fontSize: "9pt" }}>
              {data.habilidades.filter(Boolean).map((h, i) => (
                <li key={i} style={{ padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#fff", display: "inline-block", flexShrink: 0 }} />{h}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.idiomas.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: "11pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: 4 }}>Idiomas</h3>
            <div style={{ fontSize: "9pt" }}>
              {data.idiomas.filter((i) => i.idioma).map((i) => (
                <div key={i.id} style={{ padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                  <span>{i.idioma}</span><span style={{ opacity: 0.8 }}>{i.nivel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: "30px 28px", color: theme.text }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "10pt", fontWeight: 600, color: theme.primary, textTransform: "uppercase", letterSpacing: 3, marginBottom: 2 }}>{data.titulo || "Profissional"}</div>
          <h1 style={{ fontSize: "28pt", fontWeight: 800, margin: 0, lineHeight: 1.1, color: theme.text }}>{data.nomeCompleto || "Seu Nome"}</h1>
        </div>
        {data.resumoProfissional && (
          <Section title="Objectivo"><p style={{ fontSize: "10pt", color: theme.muted, lineHeight: 1.6 }}>{data.resumoProfissional}</p></Section>
        )}
        {data.experiencias.length > 0 && (
          <Section title="Experiência">
            {data.experiencias.map((exp) => (
              <div key={exp.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: "10pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{exp.cargo}</div>
                <div style={{ fontSize: "9pt", color: theme.muted }}><em>{exp.empresa}</em>{exp.local ? `, ${exp.local}` : ""} | {exp.dataInicio}{exp.dataFim ? ` - ${exp.dataFim}` : ""}</div>
                {exp.descricao && (
                  <ul style={{ margin: "4px 0 0 16px", fontSize: "9pt", color: theme.muted }}>
                    {exp.descricao.split("\n").filter(Boolean).map((line, i) => <li key={i} style={{ marginBottom: 2 }}>• {line}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        )}
        {data.formacoes.length > 0 && (
          <Section title="Educação">
            {data.formacoes.map((f) => (
              <div key={f.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: "10pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{f.curso}</div>
                <div style={{ fontSize: "9pt", color: theme.muted }}><em>{f.instituicao}</em>{f.local ? `, ${f.local}` : ""} | {f.dataInicio}{f.dataFim ? ` - ${f.dataFim}` : ""}</div>
                {f.descricao && <p style={{ fontSize: "9pt", color: theme.muted, margin: "4px 0 0" }}>• {f.descricao}</p>}
              </div>
            ))}
          </Section>
        )}
        {data.certificacoes.length > 0 && (
          <Section title="Certificações">
            {data.certificacoes.filter((c) => c.nome).map((c) => (
              <div key={c.id} style={{ fontSize: "9pt", marginBottom: 4 }}><strong>{c.nome}</strong> — {c.instituicao} ({c.ano})</div>
            ))}
          </Section>
        )}
        {data.projetos.length > 0 && (
          <Section title="Projetos">
            {data.projetos.filter((p) => p.nome).map((p) => (
              <div key={p.id} style={{ marginBottom: 8, fontSize: "9pt" }}>
                <strong>{p.nome}</strong>
                {p.descricao && <p style={{ color: theme.muted, margin: "2px 0" }}>{p.descricao}</p>}
                {p.link && <div style={{ color: theme.primary }}>{p.link}</div>}
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
};

export default CVTemplateModerno;
