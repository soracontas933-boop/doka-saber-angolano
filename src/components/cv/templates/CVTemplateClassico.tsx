import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

const CVTemplateClassico: React.FC<Props> = ({ data, theme }) => {
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: "12pt", fontWeight: 700, color: theme.primary, textTransform: "uppercase", letterSpacing: 1.5, borderBottom: `1px solid ${theme.primary}`, paddingBottom: 4, marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "36px 40px", fontFamily: "'Times New Roman', Georgia, serif", minHeight: "297mm", backgroundColor: theme.bg, color: theme.text }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        {data.foto && <img src={data.foto} alt="Foto" style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", margin: "0 auto 10px", display: "block" }} />}
        <h1 style={{ fontSize: "24pt", fontWeight: 700, margin: 0, color: theme.primary }}>{data.nomeCompleto || "Seu Nome"}</h1>
        {data.titulo && <div style={{ fontSize: "11pt", color: theme.muted, marginTop: 4 }}>{data.titulo}</div>}
        <div style={{ fontSize: "9pt", color: theme.muted, marginTop: 8, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {data.email && <span>✉ {data.email}</span>}
          {data.telefone && <span>☎ {data.telefone}</span>}
          {data.endereco && <span>📍 {data.endereco}</span>}
          {data.linkedin && <span>🔗 {data.linkedin}</span>}
        </div>
      </div>
      {data.resumoProfissional && (
        <Section title="Perfil Profissional"><p style={{ fontSize: "10pt", color: theme.muted, textAlign: "justify", lineHeight: 1.7 }}>{data.resumoProfissional}</p></Section>
      )}
      {data.experiencias.length > 0 && (
        <Section title="Experiência Profissional">
          {data.experiencias.map((exp) => (
            <div key={exp.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10pt" }}>
                <strong>{exp.cargo}</strong><span style={{ color: theme.muted }}>{exp.dataInicio} - {exp.dataFim || "Presente"}</span>
              </div>
              <div style={{ fontSize: "9pt", color: theme.muted, fontStyle: "italic" }}>{exp.empresa}{exp.local ? `, ${exp.local}` : ""}</div>
              {exp.descricao && <ul style={{ fontSize: "9pt", color: theme.muted, margin: "4px 0 0 16px" }}>{exp.descricao.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>}
            </div>
          ))}
        </Section>
      )}
      {data.formacoes.length > 0 && (
        <Section title="Formação Académica">
          {data.formacoes.map((f) => (
            <div key={f.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10pt" }}>
                <strong>{f.curso}</strong><span style={{ color: theme.muted }}>{f.dataInicio} - {f.dataFim || "Presente"}</span>
              </div>
              <div style={{ fontSize: "9pt", color: theme.muted, fontStyle: "italic" }}>{f.instituicao}{f.local ? `, ${f.local}` : ""}</div>
              {f.descricao && <p style={{ fontSize: "9pt", color: theme.muted, margin: "2px 0 0" }}>{f.descricao}</p>}
            </div>
          ))}
        </Section>
      )}
      <div style={{ display: "flex", gap: 30 }}>
        {data.habilidades.length > 0 && (
          <div style={{ flex: 1 }}>
            <Section title="Habilidades">
              <ul style={{ listStyle: "disc", paddingLeft: 18, fontSize: "9pt", color: theme.muted }}>
                {data.habilidades.filter(Boolean).map((h, i) => <li key={i} style={{ marginBottom: 2 }}>{h}</li>)}
              </ul>
            </Section>
          </div>
        )}
        {data.idiomas.length > 0 && (
          <div style={{ flex: 1 }}>
            <Section title="Idiomas">
              {data.idiomas.filter((i) => i.idioma).map((i) => (
                <div key={i.id} style={{ fontSize: "9pt", marginBottom: 2 }}><strong>{i.idioma}</strong> — {i.nivel}</div>
              ))}
            </Section>
          </div>
        )}
      </div>
      {data.certificacoes.length > 0 && (
        <Section title="Certificações">
          {data.certificacoes.filter((c) => c.nome).map((c) => (
            <div key={c.id} style={{ fontSize: "9pt", marginBottom: 3 }}><strong>{c.nome}</strong> — {c.instituicao}, {c.ano}</div>
          ))}
        </Section>
      )}
      {data.projetos.length > 0 && (
        <Section title="Projetos">
          {data.projetos.filter((p) => p.nome).map((p) => (
            <div key={p.id} style={{ fontSize: "9pt", marginBottom: 6 }}><strong>{p.nome}</strong>{p.descricao && <span> — {p.descricao}</span>}</div>
          ))}
        </Section>
      )}
    </div>
  );
};

export default CVTemplateClassico;
