import { useState, useCallback } from "react";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, AlertTriangle, CheckCircle2, Download, Eye, Loader2, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { generateWithGroq, DOKA_SYSTEM_PROMPT, prompts } from "@/lib/ai-service";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF, exportToWord } from "@/lib/export-utils";

// ─── Types ───────────────────────────────────────────────────────
interface Problema {
  id: number;
  categoria: "grave" | "moderado" | "conteudo" | "formatacao";
  titulo: string;
  descricao: string;
  localizacao: string;
  sugestao_correcao: string;
  prioridade: number;
}

interface Analise {
  problemas: Problema[];
  pontuacao_actual: number;
  pontuacao_estimada_apos_correcao: number;
  resumo_geral: string;
  nivel_trabalho: string;
}

type Step = "upload" | "analyzing" | "report" | "correcting" | "result";

const CORES_CATEGORIA: Record<string, { bg: string; border: string; text: string; label: string }> = {
  grave: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-l-red-400", text: "text-red-800 dark:text-red-300", label: "Grave" },
  moderado: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-l-amber-400", text: "text-amber-800 dark:text-amber-300", label: "Moderado" },
  conteudo: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-l-blue-400", text: "text-blue-800 dark:text-blue-300", label: "Conteúdo" },
  formatacao: { bg: "bg-green-50 dark:bg-green-950/30", border: "border-l-green-400", text: "text-green-800 dark:text-green-300", label: "Formatação" },
};

// ─── File reader helpers ─────────────────────────────────────────
async function readFileAsText(file: File): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    return file.text();
  }
  // For PDF / DOCX, send to Gemini vision via base64
  const buffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const mimeType = file.type || "application/pdf";

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    body: {
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            {
              type: "text",
              text: prompts.correcaoExtrair("(o conteúdo está no ficheiro anexado)"),
            },
          ],
        },
      ],
      service: "gemini",
      max_tokens: 8192,
      temperature: 0.1,
    },
  });

  if (error) throw new Error(`Erro ao extrair conteúdo: ${error.message}`);
  return data?.choices?.[0]?.message?.content || "";
}

function extractJSON(raw: string): any {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw.trim();
  return JSON.parse(jsonStr);
}

function correctedToMarkdown(c: any): string {
  const lines: string[] = [];
  if (c.introducao) {
    lines.push("# INTRODUÇÃO\n");
    if (typeof c.introducao === "string") {
      lines.push(c.introducao);
    } else {
      if (c.introducao.contextualizacao) lines.push(c.introducao.contextualizacao + "\n");
      if (c.introducao.objetivo_geral) lines.push(`**Objectivo geral:** ${c.introducao.objetivo_geral}\n`);
      if (c.introducao.objetivos_especificos?.length) {
        lines.push("**Objectivos específicos:**");
        c.introducao.objetivos_especificos.forEach((o: string) => lines.push(`- ${o}`));
        lines.push("");
      }
      if (c.introducao.justificativa) lines.push(c.introducao.justificativa + "\n");
      if (c.introducao.metodologia) lines.push(`**Metodologia:** ${c.introducao.metodologia}\n`);
      if (c.introducao.estrutura_trabalho) lines.push(c.introducao.estrutura_trabalho + "\n");
    }
  }
  if (c.capitulos) {
    for (const cap of c.capitulos) {
      lines.push(`\n# CAPÍTULO ${cap.numero} — ${cap.titulo}\n`);
      if (cap.subcapitulos) {
        for (const sub of cap.subcapitulos) {
          lines.push(`## ${sub.numero} ${sub.titulo}\n`);
          lines.push(sub.conteudo + "\n");
        }
      }
    }
  }
  if (c.conclusao) {
    lines.push("\n# CONCLUSÃO\n");
    if (typeof c.conclusao === "string") {
      lines.push(c.conclusao);
    } else {
      if (c.conclusao.sintese) lines.push(c.conclusao.sintese + "\n");
      if (c.conclusao.reflexao_critica) lines.push(c.conclusao.reflexao_critica + "\n");
      if (c.conclusao.perspectivas_futuras) lines.push(c.conclusao.perspectivas_futuras + "\n");
    }
  }
  if (c.bibliografia) {
    lines.push("\n# BIBLIOGRAFIA\n");
    for (const b of c.bibliografia) {
      const ref = typeof b === "string" ? b : b.referencia;
      lines.push(`- ${ref}`);
    }
  }
  return lines.join("\n");
}

// ─── Component ───────────────────────────────────────────────────
const CorrecaoPage = () => {
  const { checkLimit, logUsage } = useUsageTracker();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [progress, setProgress] = useState(0);
  const [extractedContent, setExtractedContent] = useState("");
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [correctedData, setCorrectedData] = useState<any>(null);
  const [correctedMarkdown, setCorrectedMarkdown] = useState("");
  const [corrigidos, setCorrigidos] = useState<number[]>([]);
  const [vista, setVista] = useState<"original" | "corrigido">("corrigido");

  // ─── Upload & Analyse ─────────────────────────────────────────
  const handleAnalyse = useCallback(async () => {
    const canProceed = await checkLimit("correcao");
    if (!canProceed) return;
    
    try {
      setStep("analyzing");
      setProgress(10);

      // Step 1: Extract
      let content: string;
      if (inputMode === "text") {
        content = pastedText;
      } else if (file) {
        content = await readFileAsText(file);
      } else {
        toast.error("Seleciona um ficheiro ou cola o texto.");
        setStep("upload");
        return;
      }
      setExtractedContent(content);
      setProgress(40);

      // Step 2: Analyse with Groq
      const analysePrompt = prompts.correcaoAnalisar(content);
      const systemPrompt =
        "És um professor corrector especializado no sistema de ensino angolano com 20 anos de experiência a avaliar trabalhos escolares do INIDE. Conheces todas as normas de apresentação de trabalhos do MED Angola.";
      const raw = await generateWithGroq(systemPrompt, analysePrompt, 8000, 0.3);
      setProgress(80);

      const parsed = extractJSON(raw);
      setAnalise(parsed);
      setProgress(100);
      setStep("report");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro na análise.");
      setStep("upload");
    }
  }, [file, pastedText, inputMode, checkLimit]);

  // ─── Correct ──────────────────────────────────────────────────
  const handleCorrect = useCallback(async () => {
    if (!analise) return;
    try {
      setStep("correcting");
      setProgress(10);
      setCorrigidos([]);

      const prompt = prompts.correcaoGerar(
        extractedContent,
        JSON.stringify(analise.problemas),
        "{}" // capa data from extracted
      );
      const systemPrompt =
        "És um assistente educacional angolano especializado em redigir trabalhos escolares perfeitos seguindo as normas do INIDE e MED Angola.";
      const raw = await generateWithGroq(systemPrompt, prompt, 8000, 0.5);
      setProgress(60);

      const parsed = extractJSON(raw);
      setCorrectedData(parsed);
      setCorrectedMarkdown(correctedToMarkdown(parsed));

      // Animate checklist
      const ids = analise.problemas.map((p) => p.id);
      for (let i = 0; i < ids.length; i++) {
        await new Promise((r) => setTimeout(r, 200));
        setCorrigidos((prev) => [...prev, ids[i]]);
      }

      setProgress(100);
      setStep("result");
      logUsage("correcao");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro na correcção.");
      setStep("report");
    }
  }, [analise, extractedContent, logUsage]);

  // ─── Export ───────────────────────────────────────────────────
  const handleExportPDF = () => {
    const coverData = correctedData?.capa
      ? {
          nomeEscola: correctedData.capa.escola,
          tipoTrabalho: "Trabalho de Pesquisa",
          tema: correctedData.capa.titulo,
          nomeAluno: correctedData.capa.nome_aluno,
          numero: correctedData.capa.numero,
          turma: correctedData.capa.turma,
          disciplina: correctedData.capa.disciplina,
          classe: correctedData.capa.classe,
          nomeDocente: correctedData.capa.orientador,
          localidade: correctedData.capa.local,
          anoLectivo: correctedData.capa.ano_letivo,
        }
      : undefined;
    exportToPDF(correctedMarkdown, `trabalho-corrigido-${Date.now()}`, coverData);
  };

  const handleExportWord = () => {
    const coverData = correctedData?.capa
      ? {
          nomeEscola: correctedData.capa.escola,
          tipoTrabalho: "Trabalho de Pesquisa",
          tema: correctedData.capa.titulo,
          nomeAluno: correctedData.capa.nome_aluno,
          numero: correctedData.capa.numero,
          turma: correctedData.capa.turma,
          disciplina: correctedData.capa.disciplina,
          classe: correctedData.capa.classe,
          nomeDocente: correctedData.capa.orientador,
          localidade: correctedData.capa.local,
          anoLectivo: correctedData.capa.ano_letivo,
        }
      : undefined;
    exportToWord(correctedMarkdown, `trabalho-corrigido-${Date.now()}`, coverData);
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1 flex items-center gap-2">
          🔍 Corrigir Trabalho
        </h1>
        <p className="text-muted-foreground">
          Envia o teu trabalho e o Wame analisa e corrige automaticamente
        </p>
      </motion.div>

      {/* Progress bar */}
      {(step === "analyzing" || step === "correcting") && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {step === "analyzing" ? "A analisar o trabalho..." : "A gerar versão corrigida..."}
          </p>
        </motion.div>
      )}

      {/* STEP: Upload */}
      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "file" | "text")}>
              <TabsList className="w-full">
                <TabsTrigger value="file" className="flex-1">📁 Enviar ficheiro</TabsTrigger>
                <TabsTrigger value="text" className="flex-1">📝 Colar texto</TabsTrigger>
              </TabsList>

              <TabsContent value="file">
                <Card className="border-dashed border-2 p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById("file-input")?.click()}>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  {file ? (
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">Clica para selecionar o ficheiro</p>
                      <p className="text-sm text-muted-foreground">PDF, DOCX ou TXT (máx. 20MB)</p>
                    </>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="text">
                <Textarea
                  placeholder="Cola aqui o conteúdo completo do teu trabalho..."
                  className="min-h-[250px]"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                />
              </TabsContent>
            </Tabs>

            <Button
              className="w-full"
              size="lg"
              disabled={inputMode === "file" ? !file : !pastedText.trim()}
              onClick={handleAnalyse}
            >
              <FileText className="h-5 w-5 mr-2" />
              Analisar Trabalho
            </Button>
          </motion.div>
        )}

        {/* STEP: Analyzing skeleton */}
        {step === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </motion.div>
        )}

        {/* STEP: Report */}
        {step === "report" && analise && (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Problemas</p>
                <p className="text-3xl font-bold text-destructive">{analise.problemas.length}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Nota actual</p>
                <p className="text-3xl font-bold">{analise.pontuacao_actual}/20</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Após correcção</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{analise.pontuacao_estimada_apos_correcao}/20</p>
              </Card>
            </div>

            {/* Level badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Nível:</span>
              <Badge variant="secondary" className="capitalize">{analise.nivel_trabalho?.replace("_", " ")}</Badge>
            </div>

            {/* Summary */}
            {analise.resumo_geral && (
              <Card className="p-4">
                <p className="text-sm">{analise.resumo_geral}</p>
              </Card>
            )}

            {/* Problems by category */}
            {(["grave", "moderado", "conteudo", "formatacao"] as const).map((cat) => {
              const items = analise.problemas.filter((p) => p.categoria === cat);
              if (!items.length) return null;
              const c = CORES_CATEGORIA[cat];
              return (
                <div key={cat} className="space-y-2">
                  <div className={`${c.bg} ${c.border} border-l-4 px-4 py-2 rounded-r-lg`}>
                    <span className={`font-semibold ${c.text}`}>{c.label} ({items.length})</span>
                  </div>
                  {items.map((p) => (
                    <Card key={p.id} className="p-4 space-y-1">
                      <p className="font-semibold text-sm">{p.titulo}</p>
                      <p className="text-sm text-muted-foreground">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground">📍 {p.localizacao}</p>
                      <p className="text-xs text-primary">💡 {p.sugestao_correcao}</p>
                    </Card>
                  ))}
                </div>
              );
            })}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button className="flex-1" size="lg" onClick={handleCorrect}>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Corrigir Automaticamente
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP: Correcting */}
        {step === "correcting" && (
          <motion.div key="correcting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="p-8 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="font-display font-semibold">A corrigir o trabalho...</p>
              <p className="text-sm text-muted-foreground text-center">Estamos a gerar uma versão melhorada com todas as correcções aplicadas</p>
            </Card>
            {/* Animated checklist */}
            {analise && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Correcções a aplicar:</h3>
                {analise.problemas.map((p) => (
                  <motion.div
                    key={p.id}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
                      corrigidos.includes(p.id) ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" : "bg-muted text-muted-foreground"
                    }`}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                  >
                    <span className="text-lg">{corrigidos.includes(p.id) ? "✓" : "○"}</span>
                    <span>{p.titulo}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP: Result */}
        {step === "result" && correctedMarkdown && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Checklist done */}
            {analise && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Correcções aplicadas ({analise.problemas.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {analise.problemas.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-300">
                      <span>✓</span>
                      <span>{p.titulo}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* View toggle */}
            <div className="flex gap-2">
              <Button size="sm" variant={vista === "corrigido" ? "default" : "outline"} onClick={() => setVista("corrigido")}>
                Corrigido
              </Button>
              <Button size="sm" variant={vista === "original" ? "default" : "outline"} onClick={() => setVista("original")}>
                Original
              </Button>
            </div>

            {/* Content view */}
            <Card className="p-6 prose prose-sm dark:prose-invert max-w-none overflow-auto max-h-[600px]">
              <div
                dangerouslySetInnerHTML={{
                  __html: (vista === "original" ? extractedContent : correctedMarkdown)
                    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
                    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
                    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
                    .replace(/^- (.+)$/gm, "<li>$1</li>")
                    .replace(/\n\n/g, "<br/><br/>")
                    .replace(/\n/g, "<br/>"),
                }}
              />
            </Card>

            {/* Export buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => { setStep("upload"); setAnalise(null); setCorrectedData(null); setCorrectedMarkdown(""); }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Novo trabalho
              </Button>
              <Button className="flex-1" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" /> Baixar PDF
              </Button>
              <Button variant="secondary" className="flex-1" onClick={handleExportWord}>
                <Download className="h-4 w-4 mr-2" /> Baixar Word
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CorrecaoPage;
