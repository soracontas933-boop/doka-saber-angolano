import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

const SkillBar: React.FC<{ label: string; pct: number; color: string }> = ({ label, pct, color }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: "9pt", fontWeight: 600, marginBottom: 4, color: "#1a1a1a" }}>{label}</div>
    <div style={{ height: 6, background: "#e5e5e5", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
    </div>
  </div>
);

const CVTemplateCorporativo: React.FC<Props> = ({ data, theme }) => {
  const accent = theme.secondary;
  return (
    <div style={{ width: "100%", minHeight: "297mm", background: "#fff", color: theme.text, fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: theme.primary, color: "#fff", padding: "26px 30px 22px", display: "flex", gap: 20, alignItems: "center" }}>
        {data.foto && (
          <img src={data.foto} alt="" style={{ width: 95, height: 95, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "26pt", fontWeight: 800, margin: 0, lineHeight: 1.05 }}>{data.nomeCompleto || "Seu Nome"}</h1>
          <div style={{ fontSize: "11pt", color: accent, fontWeight: 600, marginTop: 2 }}>{data.titulo || "Profissional"}</div>
        </div>
        <div style={{ fontSize: "8.5pt", textAlign: "right", lineHeight: 1.7, opacity: 0.95 }}>
          {data.telefone && <div><strong>Telefone:</strong> {data.telefone}</div>}
          {data.email && <div><strong>Email:</strong> {data.email}</div>}
          {data.website && <div><strong>Web:</strong> {data.website}</div>}
          {data.linkedin && <div><strong>LinkedIn:</strong> {data.linkedin}</div>}
        </div>
      </div>

      {/* Body 2 cols */}
      <div style={{ display: "flex", padding: "24px 28px", gap: 26 }}>
        {/* LEFT */}
        <div style={{ width: "36%" }}>
          {data.habilidades.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: "11pt", fontWeight: 800, color: theme.primary, letterSpacing: 1, marginBottom: 10, borderBottom: `2px solid ${theme.primary}`, paddingBottom: 4 }}>DATA & ANÁLISE</h3>
              {data.habilidades.filter(Boolean).slice(0, 6).map((h, i) => (
                <SkillBar key={i} label={h} pct={70 + ((i * 7) % 30)} color={accent} />
              ))}
            </section>
          )}
          {data.certificacoes.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: "11pt", fontWeight: 800, color: theme.primary, letterSpacing: 1, marginBottom: 10, borderBottom: `2px solid ${theme.primary}`, paddingBottom: 4 }}>FORMAÇÃO COMPL.</h3>
              {data.certificacoes.filter((c) => c.nome).map((c) => (
                <div key={c.id} style={{ marginBottom: 8, fontSize: "9pt" }}>
                  <div style={{ color: accent, fontWeight: 600 }}>{c.nome}</div>
                  <div style={{ color: theme.muted, fontSize: "8.5pt" }}>{c.instituicao}{c.ano ? ` · ${c.ano}` : ""}</div>
                </div>
              ))}
            </section>
          )}
          {data.projetos.length > 0 && (
            <section>
              <h3 style={{ fontSize: "11pt", fontWeight: 800, color: theme.primary, letterSpacing: 1, marginBottom: 10, borderBottom: `2px solid ${theme.primary}`, paddingBottom: 4 }}>PROJETOS</h3>
              {data.projetos.filter((p) => p.nome).map((p) => (
                <div key={p.id} style={{ marginBottom: 6, fontSize: "9pt" }}>
                  <strong>{p.nome}</strong>
                  {p.descricao && <div style={{ color: theme.muted, fontSize: "8.5pt" }}>{p.descricao}</div>}
                </div>
              ))}
            </section>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1 }}>
          {data.experiencias.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: "11pt", fontWeight: 800, color: theme.primary, letterSpacing: 1, marginBottom: 12, borderBottom: `2px solid ${theme.primary}`, paddingBottom: 4 }}>EXPERIÊNCIAS PROFISSIONAIS</h3>
              {data.experiencias.map((exp) => (
                <div key={exp.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: "10pt", fontWeight: 700, color: accent, textTransform: "uppercase" }}>{exp.cargo}</div>
                  <div style={{ fontSize: "9pt", color: theme.muted, marginBottom: 4 }}>
                    {exp.empresa}{exp.local ? `, ${exp.local}` : ""} | {exp.dataInicio}{exp.dataFim ? ` - ${exp.dataFim}` : " — Presente"}
                  </div>
                  {exp.descricao && <p style={{ fontSize: "9pt", margin: 0, lineHeight: 1.55, color: theme.text }}>{exp.descricao}</p>}
                </div>
              ))}
            </section>
          )}
          {data.formacoes.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: "11pt", fontWeight: 800, color: theme.primary, letterSpacing: 1, marginBottom: 12, borderBottom: `2px solid ${theme.primary}`, paddingBottom: 4 }}>FORMAÇÃO ACADÉMICA</h3>
              {data.formacoes.map((f) => (
                <div key={f.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: "10pt", fontWeight: 700, textTransform: "uppercase" }}>{f.curso}</div>
                  <div style={{ fontSize: "9pt", color: theme.muted }}>{f.instituicao}{f.local ? `, ${f.local}` : ""} · {f.dataFim || f.dataInicio}</div>
                </div>
              ))}
            </section>
          )}
          {data.resumoProfissional && (
            <section>
              <h3 style={{ fontSize: "11pt", fontWeight: 800, color: theme.primary, letterSpacing: 1, marginBottom: 8, borderBottom: `2px solid ${theme.primary}`, paddingBottom: 4 }}>PERFIL</h3>
              <p style={{ fontSize: "9.5pt", lineHeight: 1.55, color: theme.text, margin: 0 }}>{data.resumoProfissional}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVTemplateCorporativo;
