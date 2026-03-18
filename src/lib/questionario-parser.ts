export interface ParsedQuestion {
  number: number;
  text: string;
  options?: string[];
  answer?: string;
  explanation?: string;
}

export interface ParsedQuestionario {
  title: string;
  questions: ParsedQuestion[];
}

export function isShortAnswerTipo(tipo: string): boolean {
  return ["resposta_curta", "completar_espacos", "dissertativa"].includes(tipo);
}

export function cleanOptionLabel(option: string): string {
  return option
    .replace(/^[a-eA-E][\.\)]\s*/, "")
    .replace(/^\(\s*\)\s*/, "")
    .replace(/^\d+\.?\s*\(\s*\)\s*/, "")
    .trim();
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\*\*/g, "").trim();
}

function decodeJsonString(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
}

function extractJsonCandidate(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    if (/"(perguntas|questions)"\s*:/i.test(candidate)) {
      return candidate.trim();
    }
  }

  return null;
}

function parseFromJson(text: string): ParsedQuestionario | null {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate);
    const root = Array.isArray(parsed) ? { perguntas: parsed } : parsed;

    const rawQuestions = Array.isArray(root?.perguntas)
      ? root.perguntas
      : Array.isArray(root?.questions)
        ? root.questions
        : [];

    if (!rawQuestions.length) return null;

    const title =
      normalizeText(root?.titulo) ||
      normalizeText(root?.title) ||
      normalizeText(root?.nome) ||
      "Questionário";

    const questions: ParsedQuestion[] = rawQuestions
      .map((item: any, index: number) => {
        const numberRaw = Number(item?.id ?? item?.numero ?? index + 1);
        const number = Number.isFinite(numberRaw) ? numberRaw : index + 1;

        const text =
          normalizeText(item?.enunciado) ||
          normalizeText(item?.pergunta) ||
          normalizeText(item?.question) ||
          normalizeText(item?.text);

        let options: string[] | undefined;
        if (Array.isArray(item?.opcoes)) {
          options = item.opcoes.map((o: unknown) => normalizeText(o)).filter(Boolean);
        } else if (Array.isArray(item?.options)) {
          options = item.options.map((o: unknown) => normalizeText(o)).filter(Boolean);
        } else if (item?.alternativas && typeof item.alternativas === "object") {
          options = Object.values(item.alternativas).map((o) => normalizeText(o)).filter(Boolean);
        }

        if ((item?.tipo === "verdadeiro_falso" || item?.tipo === "verdadeiro/falso") && (!options || options.length === 0)) {
          options = ["Verdadeiro", "Falso"];
        }

        const answer =
          normalizeText(item?.resposta_correta) ||
          normalizeText(item?.resposta) ||
          normalizeText(item?.answer) ||
          normalizeText(item?.correct_answer);

        const explanation =
          normalizeText(item?.explicacao) ||
          normalizeText(item?.explanation);

        return {
          number,
          text,
          options: options && options.length > 0 ? options : undefined,
          answer: answer || undefined,
          explanation: explanation || undefined,
        };
      })
      .filter((q) => q.text);

    return { title, questions };
  } catch {
    return null;
  }
}

function parseFromPlainText(text: string): ParsedQuestionario {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let title = "";
  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;

  for (const line of lines) {
    if (line.startsWith("```")) continue;

    const questionMatch =
      line.match(/^(?:\*\*)?(?:pergunta\s*)?(\d+)[\.\)\-:\s]*(?:\*\*)?\s*(.+)/i) ||
      line.match(/^#{1,4}\s*(?:pergunta\s*)?(\d+)[\.\)\-:\s]*(.+)/i) ||
      line.match(/^(\d+)\s+[\-–]\s+(.+)/);

    if (questionMatch) {
      if (current) questions.push(current);
      current = {
        number: parseInt(questionMatch[1], 10),
        text: normalizeText(questionMatch[2]),
      };
      continue;
    }

    const optionMatch = line.match(/^(?:[a-eA-E][\.\)]\s+|\(\s*\)\s+|\d+\.?\s*\(\s*\)\s+|[-•]\s+)(.+)/);
    if (optionMatch && current) {
      if (!current.options) current.options = [];
      current.options.push(normalizeText(line));
      continue;
    }

    if (
      !title &&
      !line.match(/^(?:pergunta\s*)?\d+[\.\)\-:]/i) &&
      !line.match(/^[\[{"].*$/)
    ) {
      title = normalizeText(line.replace(/^[#*]+\s*/, ""));
      continue;
    }

    if (current && !line.match(/^(gabarito|respostas|correção)/i)) {
      if (!current.options) {
        current.text += ` ${normalizeText(line)}`;
      }
    }
  }

  if (current) questions.push(current);
  return { title: title || "Questionário", questions };
}

function parseFromEnunciadoKey(text: string): ParsedQuestionario | null {
  const matches = [...text.matchAll(/"enunciado"\s*:\s*"([\s\S]*?)"\s*(?:,|})/gi)];
  if (!matches.length) return null;

  const questions: ParsedQuestion[] = matches.map((match, index) => ({
    number: index + 1,
    text: decodeJsonString(match[1]),
  }));

  return {
    title: "Questionário",
    questions,
  };
}

export function parseQuestionarioContent(text: string): ParsedQuestionario {
  const json = parseFromJson(text);
  if (json && json.questions.length > 0) return json;

  const plain = parseFromPlainText(text);
  if (plain.questions.length > 0) return plain;

  const byEnunciado = parseFromEnunciadoKey(text);
  if (byEnunciado && byEnunciado.questions.length > 0) return byEnunciado;

  return plain;
}
