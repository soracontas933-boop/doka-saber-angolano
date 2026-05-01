import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

const CVTemplateVibrante: React.FC<Props> = ({ data, theme }) => {
  const accent = theme.secondary;
  const dark = "#1f1f1f";

  const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ background: accent, color: "#fff", textAlign: "center", padding: "5px 10px", borderRadius: 14, fontSize: "8.5pt", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{children}</div>
  );

  return (
    <div style={{ width: "100%", minHeight: "297mm", background: "#fff", display: "flex", fontFamily: "Arial, sans-serif", color: theme.text }}>
      {/* LEFT 60% */}
      <div style={{ width: "62%", display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ background: "#fcefd6", padding: "26px 24px", display: "flex", gap: 16, alignItems: "center" }}>
          {data.foto && (
            <img src={data.foto} alt="" style={{ width: 78, height: 78, borderRadius: "50%", objectFit: "cover", border: `4px solid ${accent}`, flexShrink: 0 }} />
          )}
          <div>
            <h1 style={{ fontSize: "20pt", fontWeight: 900, margin: 0, color: dark, letterSpacing: 1, textTransform: "uppercase" }}>{data.nomeCompleto || "Seu Nome"}</h1>
            <div style={{ fontSize: "9pt", color: dark, opacity: 0.7, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>{data.titulo || "Profissional"}</div>
          </div>
        </div>

        {/* body */}
        <div style={{ padding: "20px 24px", flex: 1 }}>
          {(data.formacoes.length > 0 || data.resumoProfissional) && (
            <section style={{ marginBottom: 22 }}>
              <Pill>EDUCAÇÃO</Pill>
              {data.formacoes.map((f) => (
                <div key={f.id} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: "9pt" }}>
                  <div style={{ width: 60, color: accent, fontWeight: 700 }}>{f.dataInicio}{f.dataFim ? `–${f.dataFim}` : ""}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: dark }}>{f.curso}</div>
                    <div style={{ color: theme.muted, fontSize: "8.5pt" }}>{f.instituicao}{f.local ? `, ${f.local}` : ""}</div>
                    {f.descricao && <div style={{ color: theme.muted, fontSize: "8.5pt", marginTop: 2 }}>{f.descricao}</div>}
                  </div>
                </div>
              ))}
            </section>
          )}
          {data.experiencias.length > 0 && (
            <section>
              <Pill>EXPERIÊNCIA</Pill>
              {data.experiencias.map((exp) => (
                <div key={exp.id} style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: "9pt" }}>
                  <div style={{ width: 60, color: accent, fontWeight: 700 }}>{exp.dataInicio}{exp.dataFim ? `–${exp.dataFim}` : "–Atual"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: dark }}>{exp.cargo}</div>
                    <div style={{ color: theme.muted, fontSize: "8.5pt" }}>{exp.empresa}{exp.local ? `, ${exp.local}` : ""}</div>
                    {exp.descricao && <div style={{ color: theme.muted, fontSize: "8.5pt", marginTop: 2, lineHeight: 1.5 }}>{exp.descricao}</div>}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      {/* RIGHT 38% dark sidebar */}
      <div style={{ width: "38%", background: dark, color: "#fff", padding: "30px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ background: accent, color: "#fff", textAlign: "center", padding: "6px 10px", borderRadius: 4, fontSize: "9pt", fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 }}>CONTACTO</div>
          <div style={{ fontSize: "8.5pt", lineHeight: 1.9 }}>
            {data.telefone && <div>📞 {data.telefone}</div>}
            {data.email && <div style={{ wordBreak: "break-all" }}>✉ {data.email}</div>}
            {data.endereco && <div>📍 {data.endereco}</div>}
            {data.website && <div style={{ wordBreak: "break-all" }}>🌐 {data.website}</div>}
            {data.linkedin && <div style={{ wordBreak: "break-all" }}>🔗 {data.linkedin}</div>}
          </div>
        </div>

        {data.habilidades.length > 0 && (
          <div>
            <div style={{ background: accent, color: "#fff", textAlign: "center", padding: "6px 10px", borderRadius: 4, fontSize: "9pt", fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 }}>HABILIDADES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.habilidades.filter(Boolean).slice(0, 8).map((h, i) => (
                <div key={i} style={{ background: "#2a2a2a", padding: "6px 10px", borderRadius: 4, fontSize: "8.5pt", fontWeight: 600 }}>{h}</div>
              ))}
            </div>
          </div>
        )}

        {data.idiomas.length > 0 && (
          <div>
            <div style={{ background: accent, color: "#fff", textAlign: "center", padding: "6px 10px", borderRadius: 4, fontSize: "9pt", fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 }}>IDIOMAS</div>
            <div style={{ fontSize: "8.5pt", lineHeight: 1.8 }}>
              {data.idiomas.filter((i) => i.idioma).map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", padding: "3px 0" }}>
                  <span>{i.idioma}</span><span style={{ color: accent }}>{i.nivel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CVTemplateVibrante;
