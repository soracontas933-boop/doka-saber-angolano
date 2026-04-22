import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

const CVTemplateMinimalista: React.FC<Props> = ({ data, theme }) => {
  const Divider = () => <hr style={{ border: "none", borderTop: `1px solid ${theme.primary}22`, margin: "14px 0" }} />;
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <>
      <Divider />
      <h2 style={{ fontSize: "10pt", fontWeight: 600, textTransform: "uppercase", letterSpacing: 3, color: theme.primary, marginBottom: 10 }}>{title}</h2>
      {children}
    </>
  );

  return (
    <div style={{ padding: "40px 44px", fontFamily: "'Helvetica Neue', Arial, sans-serif", minHeight: "297mm", backgroundColor: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 6 }}>
        {data.foto && <img src={data.foto} alt="" style={{ width: 70, height: 70, borderRadius: 4, objectFit: "cover" }} />}
        <div>
          <h1 style={{ fontSize: "22pt", fontWeight: 300, margin: 0, letterSpacing: 1, color: theme.text }}>{data.nomeCompleto || "Seu Nome"}</h1>
          {data.titulo && <div style={{ fontSize: "10pt", color: theme.muted, marginTop: 2 }}>{data.titulo}</div>}
        </div>
      </div>
      <div style={{ fontSize: "8.5pt", color: theme.muted, display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 4 }}>
        {data.email && <span>{data.email}</span>}
        {data.telefone && <span>{data.telefone}</span>}
        {data.endereco && <span>{data.endereco}</span>}
        {data.linkedin && <span>{data.linkedin}</span>}
      </div>
      {data.resumoProfissional && <Section title="Sobre"><p style={{ fontSize: "9.5pt", color: theme.muted, lineHeight: 1.7 }}>{data.resumoProfissional}</p></Section>}
      {data.experiencias.length > 0 && (
        <Section title="Experiência">
          {data.experiencias.map((exp) => (
            <div key={exp.id} style={{ marginBottom: 12, display: "flex", gap: 20 }}>
              <div style={{ width: 90, fontSize: "8pt", color: theme.muted, flexShrink: 0, paddingTop: 2 }}>{exp.dataInicio}<br />{exp.dataFim ? `- ${exp.dataFim}` : "- Presente"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "10pt", fontWeight: 600, color: theme.text }}>{exp.cargo}</div>
                <div style={{ fontSize: "9pt", color: theme.muted, fontStyle: "italic" }}>{exp.empresa}{exp.local ? `, ${exp.local}` : ""}</div>
                {exp.descricao && <ul style={{ fontSize: "8.5pt", color: theme.muted, margin: "4px 0 0 14px" }}>{exp.descricao.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>}
              </div>
            </div>
          ))}
        </Section>
      )}
      {data.formacoes.length > 0 && (
        <Section title="Formação">
          {data.formacoes.map((f) => (
            <div key={f.id} style={{ marginBottom: 10, display: "flex", gap: 20 }}>
              <div style={{ width: 90, fontSize: "8pt", color: theme.muted, flexShrink: 0, paddingTop: 2 }}>{f.dataInicio}<br />{f.dataFim ? `- ${f.dataFim}` : ""}</div>
              <div>
                <div style={{ fontSize: "10pt", fontWeight: 600, color: theme.text }}>{f.curso}</div>
                <div style={{ fontSize: "9pt", color: theme.muted, fontStyle: "italic" }}>{f.instituicao}{f.local ? `, ${f.local}` : ""}</div>
              </div>
            </div>
          ))}
        </Section>
      )}
      <div style={{ display: "flex", gap: 40 }}>
        {data.habilidades.length > 0 && (
          <div style={{ flex: 1 }}>
            <Section title="Habilidades">
              <div style={{ fontSize: "9pt", color: theme.muted, display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
                {data.habilidades.filter(Boolean).map((h, i) => <span key={i} style={{ padding: "2px 8px", borderRadius: 3, backgroundColor: `${theme.primary}11` }}>{h}</span>)}
              </div>
            </Section>
          </div>
        )}
        {data.idiomas.length > 0 && (
          <div style={{ flex: 1 }}>
            <Section title="Idiomas">
              {data.idiomas.filter((i) => i.idioma).map((i) => (
                <div key={i.id} style={{ fontSize: "9pt", color: theme.muted, marginBottom: 2 }}>{i.idioma} · <span style={{ color: theme.muted }}>{i.nivel}</span></div>
              ))}
            </Section>
          </div>
        )}
      </div>
      {data.certificacoes.length > 0 && (
        <Section title="Certificações">
          {data.certificacoes.filter((c) => c.nome).map((c) => (
            <div key={c.id} style={{ fontSize: "9pt", color: theme.muted, marginBottom: 2 }}>{c.nome} — {c.instituicao} ({c.ano})</div>
          ))}
        </Section>
      )}
    </div>
  );
};

export default CVTemplateMinimalista;
