import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

const CVTemplatePremium: React.FC<Props> = ({ data, theme }) => {
  const accent = theme.secondary;
  return (
    <div style={{ width: "100%", minHeight: "297mm", background: "#f5f3ef", padding: "32px 28px", fontFamily: "Georgia, 'Times New Roman', serif", color: theme.text }}>
      {/* Card */}
      <div style={{ background: "#fff", border: `1px solid ${accent}`, padding: "30px 32px", boxShadow: "0 0 0 4px #fff inset" }}>
        {/* Header */}
        <div style={{ display: "flex", gap: 22, paddingBottom: 18, borderBottom: `1px solid ${accent}` }}>
          {data.foto && (
            <img src={data.foto} alt="" style={{ width: 110, height: 130, objectFit: "cover", flexShrink: 0, filter: "grayscale(0.1)" }} />
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h1 style={{ fontSize: "30pt", fontWeight: 700, margin: 0, color: theme.primary, lineHeight: 1, letterSpacing: -0.5 }}>{data.nomeCompleto || "Seu Nome"}</h1>
            <div style={{ fontSize: "11pt", color: accent, fontWeight: 600, marginTop: 4, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>{data.titulo || "Profissional"}</div>
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 14, fontSize: "8.5pt", color: theme.muted, fontFamily: "Arial, sans-serif" }}>
              {data.telefone && <span>☎ {data.telefone}</span>}
              {data.email && <span>✉ {data.email}</span>}
              {data.endereco && <span>📍 {data.endereco}</span>}
              {data.website && <span>🌐 {data.website}</span>}
            </div>
          </div>
        </div>

        {/* Summary */}
        {data.resumoProfissional && (
          <div style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: "13pt", color: theme.primary, fontWeight: 700, margin: "0 0 8px", fontStyle: "italic" }}>Perfil Profissional</h2>
            <p style={{ fontSize: "10pt", lineHeight: 1.65, color: theme.text, margin: 0, fontFamily: "Arial, sans-serif" }}>{data.resumoProfissional}</p>
          </div>
        )}

        {/* Two columns */}
        <div style={{ display: "flex", gap: 32, marginTop: 22 }}>
          {/* Left */}
          <div style={{ flex: 1.4, fontFamily: "Arial, sans-serif" }}>
            {data.experiencias.length > 0 && (
              <section style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: "11pt", color: theme.primary, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", borderBottom: `1px solid ${accent}`, paddingBottom: 4, marginBottom: 10, fontFamily: "Georgia, serif" }}>Experiência</h3>
                {data.experiencias.map((exp) => (
                  <div key={exp.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: "10pt", fontWeight: 700 }}>{exp.cargo}</div>
                    <div style={{ fontSize: "8.5pt", color: accent, fontWeight: 600 }}>{exp.empresa}{exp.local ? `, ${exp.local}` : ""} · {exp.dataInicio}{exp.dataFim ? ` – ${exp.dataFim}` : " – Presente"}</div>
                    {exp.descricao && <p style={{ fontSize: "9pt", color: theme.muted, lineHeight: 1.55, margin: "4px 0 0" }}>{exp.descricao}</p>}
                  </div>
                ))}
              </section>
            )}

            {data.formacoes.length > 0 && (
              <section>
                <h3 style={{ fontSize: "11pt", color: theme.primary, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", borderBottom: `1px solid ${accent}`, paddingBottom: 4, marginBottom: 10, fontFamily: "Georgia, serif" }}>Educação</h3>
                {data.formacoes.map((f) => (
                  <div key={f.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: "10pt", fontWeight: 700 }}>{f.curso}</div>
                    <div style={{ fontSize: "8.5pt", color: theme.muted }}>{f.instituicao}{f.local ? `, ${f.local}` : ""} · {f.dataInicio}{f.dataFim ? ` – ${f.dataFim}` : ""}</div>
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Right */}
          <div style={{ width: "34%", fontFamily: "Arial, sans-serif" }}>
            {data.habilidades.length > 0 && (
              <section style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: "11pt", color: theme.primary, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", borderBottom: `1px solid ${accent}`, paddingBottom: 4, marginBottom: 10, fontFamily: "Georgia, serif" }}>Skills</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {data.habilidades.filter(Boolean).map((h, i) => (
                    <span key={i} style={{ background: "#f5f3ef", color: theme.primary, padding: "4px 10px", border: `1px solid ${accent}`, fontSize: "8.5pt", fontWeight: 600 }}>{h}</span>
                  ))}
                </div>
              </section>
            )}

            {data.idiomas.length > 0 && (
              <section style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: "11pt", color: theme.primary, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", borderBottom: `1px solid ${accent}`, paddingBottom: 4, marginBottom: 10, fontFamily: "Georgia, serif" }}>Idiomas</h3>
                {data.idiomas.filter((i) => i.idioma).map((i) => (
                  <div key={i.id} style={{ fontSize: "9pt", display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ fontWeight: 600 }}>{i.idioma}</span>
                    <span style={{ color: theme.muted }}>{i.nivel}</span>
                  </div>
                ))}
              </section>
            )}

            {data.certificacoes.length > 0 && (
              <section>
                <h3 style={{ fontSize: "11pt", color: theme.primary, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", borderBottom: `1px solid ${accent}`, paddingBottom: 4, marginBottom: 10, fontFamily: "Georgia, serif" }}>Certificações</h3>
                {data.certificacoes.filter((c) => c.nome).map((c) => (
                  <div key={c.id} style={{ fontSize: "9pt", marginBottom: 5 }}>
                    <strong>{c.nome}</strong>
                    <div style={{ color: theme.muted, fontSize: "8.5pt" }}>{c.instituicao}{c.ano ? ` · ${c.ano}` : ""}</div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVTemplatePremium;
