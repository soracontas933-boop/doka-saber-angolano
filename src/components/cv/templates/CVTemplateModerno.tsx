import React from "react";
import { Mail, Phone, MapPin, Globe, Linkedin, Calendar } from "lucide-react";
import type { CVData } from "@/types/cv";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <h2 style={{ fontSize: "13pt", fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, borderBottom: "2px solid #1e3a5f", paddingBottom: 4, marginBottom: 10 }}>
      {title}
    </h2>
    {children}
  </div>
);

const CVTemplateModerno: React.FC<{ data: CVData }> = ({ data }) => {
  return (
    <div style={{ display: "flex", minHeight: "297mm" }}>
      {/* Sidebar */}
      <div style={{ width: "35%", backgroundColor: "#1e3a5f", color: "#fff", padding: "30px 20px" }}>
        {/* Photo */}
        {data.foto && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img
              src={data.foto}
              alt="Foto"
              style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff" }}
            />
          </div>
        )}

        {/* Contact */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: "11pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: 4 }}>
            Contacto
          </h3>
          <div style={{ fontSize: "9pt", lineHeight: 2 }}>
            {data.email && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>✉ {data.email}</div>}
            {data.telefone && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>☎ {data.telefone}</div>}
            {data.endereco && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>📍 {data.endereco}</div>}
            {data.dataNascimento && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>📅 {data.dataNascimento}</div>}
            {data.linkedin && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>🔗 {data.linkedin}</div>}
            {data.website && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>🌐 {data.website}</div>}
          </div>
        </div>

        {/* Skills */}
        {data.habilidades.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: "11pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: 4 }}>
              Habilidades
            </h3>
            <ul style={{ listStyle: "none", padding: 0, fontSize: "9pt" }}>
              {data.habilidades.filter(Boolean).map((h, i) => (
                <li key={i} style={{ padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#fff", display: "inline-block", flexShrink: 0 }} />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Languages */}
        {data.idiomas.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: "11pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: 4 }}>
              Idiomas
            </h3>
            <div style={{ fontSize: "9pt" }}>
              {data.idiomas.filter((i) => i.idioma).map((i) => (
                <div key={i.id} style={{ padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                  <span>{i.idioma}</span>
                  <span style={{ opacity: 0.8 }}>{i.nivel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "30px 28px" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "10pt", fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 3, marginBottom: 2 }}>
            {data.titulo || "Profissional"}
          </div>
          <h1 style={{ fontSize: "28pt", fontWeight: 800, margin: 0, lineHeight: 1.1, color: "#1a1a1a" }}>
            {data.nomeCompleto || "Seu Nome"}
          </h1>
        </div>

        {/* Summary */}
        {data.resumoProfissional && (
          <Section title="Objectivo">
            <p style={{ fontSize: "10pt", color: "#444", lineHeight: 1.6 }}>{data.resumoProfissional}</p>
          </Section>
        )}

        {/* Experience */}
        {data.experiencias.length > 0 && (
          <Section title="Experiência">
            {data.experiencias.map((exp) => (
              <div key={exp.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: "10pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{exp.cargo}</div>
                <div style={{ fontSize: "9pt", color: "#666" }}>
                  <em>{exp.empresa}</em>{exp.local ? `, ${exp.local}` : ""} | {exp.dataInicio}{exp.dataFim ? ` - ${exp.dataFim}` : ""}
                </div>
                {exp.descricao && (
                  <ul style={{ margin: "4px 0 0 16px", fontSize: "9pt", color: "#444" }}>
                    {exp.descricao.split("\n").filter(Boolean).map((line, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>• {line}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Education */}
        {data.formacoes.length > 0 && (
          <Section title="Educação">
            {data.formacoes.map((f) => (
              <div key={f.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: "10pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{f.curso}</div>
                <div style={{ fontSize: "9pt", color: "#666" }}>
                  <em>{f.instituicao}</em>{f.local ? `, ${f.local}` : ""} | {f.dataInicio}{f.dataFim ? ` - ${f.dataFim}` : ""}
                </div>
                {f.descricao && <p style={{ fontSize: "9pt", color: "#444", margin: "4px 0 0" }}>• {f.descricao}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Certifications */}
        {data.certificacoes.length > 0 && (
          <Section title="Certificações">
            {data.certificacoes.filter((c) => c.nome).map((c) => (
              <div key={c.id} style={{ fontSize: "9pt", marginBottom: 4 }}>
                <strong>{c.nome}</strong> — {c.instituicao} ({c.ano})
              </div>
            ))}
          </Section>
        )}

        {/* Projects */}
        {data.projetos.length > 0 && (
          <Section title="Projetos">
            {data.projetos.filter((p) => p.nome).map((p) => (
              <div key={p.id} style={{ marginBottom: 8, fontSize: "9pt" }}>
                <strong>{p.nome}</strong>
                {p.descricao && <p style={{ color: "#444", margin: "2px 0" }}>{p.descricao}</p>}
                {p.link && <div style={{ color: "#1e3a5f" }}>{p.link}</div>}
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
};

export default CVTemplateModerno;
