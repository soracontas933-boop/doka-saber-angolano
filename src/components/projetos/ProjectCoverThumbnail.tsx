import { useEffect, useRef, useState, type CSSProperties } from "react";
import CapaPage from "@/components/trabalho/CapaPage";
import type { CoverPageData } from "@/lib/export-utils";

interface ProjectCoverThumbnailProps {
  project: {
    tipo: string;
    titulo: string;
    conteudo: unknown;
  };
}

type UnknownRecord = Record<string, unknown>;

const typeLabels: Record<string, string> = {
  trabalho: "Trabalho",
  resumo: "Resumo",
  questionario: "Questionário",
  "plano-aula": "Plano de Aula",
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function getString(record: UnknownRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getStringArray(record: UnknownRecord, key: string): string[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : undefined;
}

function getCoverData(project: ProjectCoverThumbnailProps["project"]): CoverPageData {
  const content = asRecord(project.conteudo);
  const savedCoverData = asRecord(content.coverData);
  const value = (key: string) => getString(savedCoverData, key) || getString(content, key);

  return {
    tipoTrabalho: value("tipoTrabalho") || typeLabels[project.tipo] || "Trabalho",
    // O título guardado pelo próprio aplicativo é sempre o último fallback
    // para que projetos antigos também tenham um nome visível na capa.
    tema: value("tema") || project.titulo || "Sem título",
    nomeEscola: value("nomeEscola"),
    nomeAluno: value("nomeAluno"),
    numero: value("numero"),
    sala: value("sala"),
    turma: value("turma"),
    curso: value("curso"),
    disciplina: value("disciplina"),
    nomeDocente: value("nomeDocente"),
    localidade: value("localidade"),
    classe: value("classe"),
    modalidade: value("modalidade") === "grupo" ? "grupo" : "individual",
    nomesIntegrantes: getStringArray(savedCoverData, "nomesIntegrantes") || getStringArray(content, "nomesIntegrantes"),
  };
}

const A4_WIDTH_IN_CSS_PIXELS = (210 / 25.4) * 96;

export default function ProjectCoverThumbnail({ project }: ProjectCoverThumbnailProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const thumbnail = thumbnailRef.current;
    if (!thumbnail) return;

    const updateScale = () => {
      const width = thumbnail.clientWidth;
      if (width > 0) setScale(width / A4_WIDTH_IN_CSS_PIXELS);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(thumbnail);
    return () => observer.disconnect();
  }, []);

  const content = asRecord(project.conteudo);
  const coverData = getCoverData(project);
  const capaImageUrl = getString(content, "capaImageUrl");
  const logoUrl = getString(content, "logoUrl");

  return (
    <div
      ref={thumbnailRef}
      className="project-cover-thumbnail md:hidden"
      role="img"
      aria-label={`Capa de ${project.titulo}`}
    >
      <div
        className="project-cover-thumbnail__page"
        style={{ "--project-cover-scale": scale } as CSSProperties}
      >
        <CapaPage data={coverData} capaImageUrl={capaImageUrl} logoUrl={logoUrl} />
      </div>
    </div>
  );
}
