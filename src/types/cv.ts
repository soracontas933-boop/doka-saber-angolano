export interface CVData {
  nomeCompleto: string;
  titulo: string;
  foto?: string;
  email: string;
  telefone: string;
  endereco: string;
  linkedin?: string;
  website?: string;
  dataNascimento?: string;
  resumoProfissional: string;
  experiencias: Experiencia[];
  formacoes: Formacao[];
  habilidades: string[];
  idiomas: Idioma[];
  certificacoes: Certificacao[];
  projetos: Projeto[];
}

export interface Experiencia {
  id: string;
  cargo: string;
  empresa: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  descricao: string;
}

export interface Formacao {
  id: string;
  curso: string;
  instituicao: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  descricao: string;
}

export interface Idioma {
  id: string;
  idioma: string;
  nivel: string;
}

export interface Certificacao {
  id: string;
  nome: string;
  instituicao: string;
  ano: string;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  link?: string;
}

export type CVTemplate =
  | "moderno"
  | "classico"
  | "minimalista"
  | "executivo"
  | "criativo"
  | "compacto"
  | "elegante"
  | "tecnologico";

export const emptyCVData: CVData = {
  nomeCompleto: "",
  titulo: "",
  email: "",
  telefone: "",
  endereco: "",
  linkedin: "",
  website: "",
  dataNascimento: "",
  resumoProfissional: "",
  experiencias: [],
  formacoes: [],
  habilidades: [],
  idiomas: [],
  certificacoes: [],
  projetos: [],
};
