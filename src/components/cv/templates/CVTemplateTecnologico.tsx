import React from "react";
import type { CVData } from "@/types/cv";
import type { CVTheme } from "@/lib/cv-themes";

interface Props { data: CVData; theme: CVTheme; }

// Tech: monospace touches, code-like sections
const CVTemplateTecnologico: React.FC<Props> = ({ data, theme }) => {
  const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 style={{ fontSize: "11pt", fontWeight: 700, color: theme.primary, marginBottom: 8, fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      <span style={{ color: theme.secondary }}>{"// "}</span>{children}
    </h2>
  );
  return (
    <div style={{ minHeight: "297mm", backgroundColor: theme.bg, color: theme.text, display: "grid", gridTemplateColumns: "1fr 2fr" }}>
      <div style={{ backgroundColor: theme.primary, color: theme.sidebarText, padding: "32px 24px", fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
        {data.foto && <img src={data.foto} alt="" style={{ width: 100, height: 100, borderRadius: 8, objectFit: "cover", marginBottom: 16, display: "block" }} />}
        <div style={{ fontSize: "8.5pt", opacity: 0.7, marginBottom: 4 }}>$ whoami</div>
        <h1 style={{ fontSize: "16pt", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{data.nomeCompleto || "Seu Nome"}</h1>
        {data.titulo && <div style={{ fontSize: "10pt", opacity: 0.85, marginTop: 4 }}>{data.titulo}</div>}
        <div style={{ marginTop: 18, fontSize: "8.5pt", lineHeight: 1.9 }}>
          {data.email && <div><span style={{ opacity: 0.6 }}>email:</span> {data.email}</div>}
          {data.telefone && <div><span style={{ opacity: 0.6 }}>tel:</span> {data.telefone}</div>}
          {data.endereco && <div><span style={{ opacity: 0.6 }}>loc:</span> {data.endereco}</div>}
          {data.linkedin && <div><span style={{ opacity: 0.6 }}>in:</span> {data.linkedin}</div>}
          {data.website && <div><span style={{ opacity: 0.6 }}>web:</span> {data.website}</div>}
        </div>
        {data.habilidades.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: "9pt", opacity: 0.7, marginBottom: 6 }}>// stack</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {data.habilidades.filter(Boolean).map((h, i) => (
                <span key={i} style={{ fontSize: "8pt", padding: "2px 6px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 3 }}>{h}</span>
              ))}
            </div>
          </div>
        )}
        {data.idiomas.length > 0 && (
          <div style={{ marginTop: 22, fontSize: "8.5pt" }}>
            <div style={{ opacity: 0.7, marginBottom: 6 }}>// langs</div>
            {data.idiomas.filter((i) => i.idioma).map((i) => (
              <div key={i.id} style={{ marginBottom: 2 }}>{i.idioma} <span style={{ opacity: 0.6 }}>// {i.nivel}</span></div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "32px 30px" }}>
        {data.resumoProfissional && (<div style={{ marginBottom: 18 }}><H>README.md</H><p style={{ fontSize: "10pt", color: theme.muted, lineHeight: 1.6 }}>{data.resumoProfissional}</p></div>)}
        {data.experiencias.length > 0 && (
          <div style={{ marginBottom: 18 }}><H>experience.log</H>
            {data.experiencias.map((e) => (
              <div key={e.id} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: `2px solid ${theme.secondary}` }}>
                <div style={{ fontSize: "10pt", fontWeight: 700 }}>{e.cargo} <span style={{ color: theme.secondary }}>@</span> {e.empresa}</div>
                <div style={{ fontSize: "8.5pt", color: theme.muted, fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>[{e.dataInicio} → {e.dataFim || "now"}]</div>
                {e.descricao && <ul style={{ fontSize: "9pt", color: theme.muted, margin: "4px 0 0 16px" }}>{e.descricao.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>}
              </div>
            ))}
          </div>
        )}
        {data.projetos.length > 0 && (
          <div style={{ marginBottom: 18 }}><H>projects/</H>
            {data.projetos.filter((p) => p.nome).map((p) => (
              <div key={p.id} style={{ fontSize: "9pt", marginBottom: 6 }}>
                <strong>{p.nome}</strong>
                {p.descricao && <p style={{ color: theme.muted, margin: "2px 0" }}>{p.descricao}</p>}
                {p.link && <code style={{ fontSize: "8.5pt", color: theme.secondary }}>{p.link}</code>}
              </div>
            ))}
          </div>
        )}
        {data.formacoes.length > 0 && (
          <div style={{ marginBottom: 18 }}><H>education.json</H>
            {data.formacoes.map((f) => (
              <div key={f.id} style={{ fontSize: "9pt", marginBottom: 6 }}>
                <strong>{f.curso}</strong> — {f.instituicao} <span style={{ color: theme.muted }}>({f.dataInicio} — {f.dataFim || "Presente"})</span>
              </div>
            ))}
          </div>
        )}
        {data.certificacoes.length > 0 && (
          <div><H>certs/</H>
            {data.certificacoes.filter((c) => c.nome).map((c) => (
              <div key={c.id} style={{ fontSize: "9pt", marginBottom: 3 }}>✓ {c.nome} — {c.instituicao} ({c.ano})</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CVTemplateTecnologico;
