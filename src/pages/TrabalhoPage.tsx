import { useState } from "react";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import CreditCostBadge from "@/components/CreditCostBadge";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useTrabalhoSettings, FONT_OPTIONS, TRABALHO_DEFAULTS } from "@/hooks/use-trabalho-settings";
import { motion } from "framer-motion";
import { FileText, Download, Copy, Upload, Plus, Minus, Image, Loader2, FileDown, ArrowLeft, Pencil, Eye, Save, Type, Ruler, RotateCcw, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { generateWithGroq, generateImageUrl, imagePrompts, prompts, DOKA_SYSTEM_PROMPT } from "@/lib/ai-service";
import { validarBibliografia } from "@/lib/referencias-reais";
import { exportToWord, exportToPDF, type CoverPageData } from "@/lib/export-utils";
import TrabalhoCompleto from "@/components/trabalho/TrabalhoCompleto";
import SubtemasEditor, { type Subtema } from "@/components/trabalho/SubtemasEditor";
import { saveProject } from "@/lib/save-project";

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
  "Economia", "Direito", "Contabilidade", "Gestão",
];

const classesSecundario = Array.from({ length: 13 }, (_, i) => `${i + 1}ª Classe`);
const classesOptions = [...classesSecundario, "Ensino Superior"];

const tiposTrabalho = [
  "Trabalho de Pesquisa",
  "Trabalho de Campo",
  "Monografia",
  "Relatório",
  "Ensaio",
  "Projecto",
  "Trabalho Prático",
];

type Fase = "formulario" | "estrutura" | "resultado";

const TrabalhoPage = () => {
  const { checkLimit, logUsage } = useUsageTracker();
  const [tema, setTema] = useLocalStorage("doka_trabalho_tema", "");
  const [nomeEscola, setNomeEscola] = useLocalStorage("doka_trabalho_escola", "");
  const [logoEscola, setLogoEscola] = useState<File | null>(null);
  const [modalidade, setModalidade] = useLocalStorage<"individual" | "grupo">("doka_trabalho_modalidade", "individual");
  const [numIntegrantes, setNumIntegrantes] = useLocalStorage("doka_trabalho_numIntegrantes", 4);
  const [nomesIntegrantes, setNomesIntegrantes] = useLocalStorage<string[]>("doka_trabalho_integrantes", ["", "", "", ""]);
  const [nomeAluno, setNomeAluno] = useLocalStorage("doka_trabalho_aluno", "");
  const [nomeDocente, setNomeDocente] = useLocalStorage("doka_trabalho_docente", "");
  const [classe, setClasse] = useLocalStorage("doka_trabalho_classe", "");
  const [turma, setTurma] = useLocalStorage("doka_trabalho_turma", "");
  const [sala, setSala] = useLocalStorage("doka_trabalho_sala", "");
  const [localidade, setLocalidade] = useLocalStorage("doka_trabalho_localidade", "Luanda - Angola");
  const [anoLectivo, setAnoLectivo] = useLocalStorage("doka_trabalho_anoLectivo", "2025/2026");
  const [tipoTrabalho, setTipoTrabalho] = useLocalStorage("doka_trabalho_tipo", "Trabalho de Pesquisa");
  const [disciplina, setDisciplina] = useLocalStorage("doka_trabalho_disciplina", "");
  const [paginas, setPaginas] = useLocalStorage("doka_trabalho_paginas", 5);
  const [numero, setNumero] = useLocalStorage("doka_trabalho_numero", "");
  const [curso, setCurso] = useLocalStorage("doka_trabalho_curso", "");
  const [elementosVisuais, setElementosVisuais] = useLocalStorage("doka_trabalho_elementosVisuais", 2);
  const [tipoCapa, setTipoCapa] = useLocalStorage<"padrao" | "upload" | "personalizada">("doka_trabalho_tipoCapa", "padrao");
  const [capaUpload, setCapaUpload] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");

  // Multi-step state
  const [fase, setFase] = useState<Fase>("formulario");
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [resultadoCompilado, setResultadoCompilado] = useState<string | null>(null);
  const [capaImageUrl, setCapaImageUrl] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("O logotipo deve ter no máximo 2MB");
        return;
      }
      setLogoEscola(file);
      toast.success("Logotipo carregado");
    }
  };

  const handleCapaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapaUpload(file);
      toast.success("Capa carregada");
    }
  };

  const updateIntegrante = (index: number, value: string) => {
    const updated = [...nomesIntegrantes];
    updated[index] = value;
    setNomesIntegrantes(updated);
  };

  const adjustIntegrantes = (count: number) => {
    const clamped = Math.max(2, Math.min(20, count));
    setNumIntegrantes(clamped);
    const updated = [...nomesIntegrantes];
    while (updated.length < clamped) updated.push("");
    setNomesIntegrantes(updated.slice(0, clamped));
  };

  const getCoverData = (): CoverPageData => ({
    nomeEscola, tipoTrabalho, tema, nomeDocente, localidade, anoLectivo, classe, disciplina,
    sala, turma, numero, curso, modalidade,
    nomeAluno: modalidade === "individual" ? nomeAluno : undefined,
    nomesIntegrantes: modalidade === "grupo" ? nomesIntegrantes.filter(Boolean) : undefined,
  });

  // Phase 1: Generate structure
  const handleGenerateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim()) { toast.error("Insira o tema do trabalho"); return; }
    
    const canProceed = await checkLimit("trabalho");
    if (!canProceed) return;
    
    setLoading(true);
    setEtapa("A gerar estrutura...");

    try {
      const prompt = prompts.estruturaTrabalho({
        titulo: tema,
        disciplina: disciplina || "Geral",
        classe: classe || "10ª Classe",
        paginas,
        tipo: tipoTrabalho,
      });

      const response = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt, 4000, 0.7);
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("A IA não retornou uma estrutura válida");
      
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.subtemas?.length) throw new Error("Estrutura vazia");

      const newSubtemas: Subtema[] = parsed.subtemas.map((s: { titulo: string; tipo: string; descricao?: string }) => ({
        id: crypto.randomUUID(),
        titulo: s.titulo,
        tipo: s.tipo as Subtema["tipo"],
        descricao: s.descricao || "",
        conteudo: "",
        status: "pendente" as const,
      }));

      setSubtemas(newSubtemas);
      setFase("estrutura");
      toast.success("Estrutura gerada! Edite os subtemas e gere o conteúdo.");
    } catch (err) {
      console.error("Erro ao gerar estrutura:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar estrutura");
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  // Phase 2: Generate one subtema
  const handleGenerateOne = async (id: string) => {
    const index = subtemas.findIndex((s) => s.id === id);
    if (index === -1) return;

    const sub = subtemas[index];
    setSubtemas((prev) => prev.map((s) => (s.id === id ? { ...s, status: "gerando" } : s)));
    setLoading(true);
    setEtapa(`A gerar: ${sub.titulo}...`);

    try {
      // Build context from previously generated subtemas
      const capitulos = subtemas.filter((s) => s.status === "gerado" && s.id !== id);
      const contexto = capitulos.map((s) => `${s.titulo}: ${s.conteudo.substring(0, 200)}`).join("\n");

      // Find bibliography content if already generated
      const bibSubtema = subtemas.find((s) => s.tipo === "bibliografia" && s.status === "gerado");
      const bibliografia = bibSubtema?.conteudo || undefined;

      const prompt = prompts.subtema({
        temaGeral: tema,
        tituloSubtema: sub.titulo,
        tipoSubtema: sub.tipo,
        disciplina: disciplina || "Geral",
        classe: classe || "10ª Classe",
        posicao: index + 1,
        totalSubtemas: subtemas.length,
        contexto: contexto || undefined,
        bibliografia,
      });

      const conteudo = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt, 6000, 0.7);

      // Validate bibliography against real references
      let conteudoFinal = conteudo;
      if (sub.tipo === "bibliografia") {
        conteudoFinal = validarBibliografia(conteudo, disciplina || "Geral");
      }

      setSubtemas((prev) =>
        prev.map((s) => (s.id === id ? { ...s, conteudo: conteudoFinal, status: "gerado" } : s))
      );
      toast.success(`"${sub.titulo}" gerado!`);
    } catch (err) {
      setSubtemas((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "pendente" } : s))
      );
      console.error("Erro ao gerar subtema:", err);
      toast.error(`Erro ao gerar "${sub.titulo}"`);
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  // Generate all pending subtemas sequentially (bibliography first for real citations)
  const handleGenerateAll = async () => {
    const pendentes = subtemas.filter((s) => s.status !== "gerado");
    if (pendentes.length === 0) {
      toast.info("Todos os subtemas já foram gerados");
      return;
    }

    // Generate bibliography first so citations in other sections can reference it
    const bibPendente = pendentes.find((s) => s.tipo === "bibliografia");
    if (bibPendente) {
      await handleGenerateOne(bibPendente.id);
    }

    // Then generate the rest in order
    const restantes = pendentes.filter((s) => s.id !== bibPendente?.id);
    for (const sub of restantes) {
      await handleGenerateOne(sub.id);
    }
  };

  // Phase 3: Compile
  const handleCompile = () => {
    // Build full markdown from all subtemas
    const sections = subtemas.map((s) => {
      const tituloPrefix = s.tipo === "capitulo"
        ? `## ${s.titulo}`
        : s.tipo === "introducao"
        ? "## Introdução"
        : s.tipo === "conclusao"
        ? "## Conclusão"
        : "## Bibliografia";
      return { titulo: tituloPrefix.replace("## ", ""), markdown: `${tituloPrefix}\n\n${s.conteudo}` };
    });

    // Generate Índice automatically with page numbers
    // Page 1 = Capa, Page 2 = Índice, Pages 3+ = content sections
    const indiceLinhas = sections.map((s, i) => `- ${s.titulo} .......... ${i + 3}`);
    const indiceMarkdown = `## Índice\n\n${indiceLinhas.join("\n")}`;

    const fullContent = [indiceMarkdown, ...sections.map((s) => s.markdown)].join("\n\n");
    setResultadoCompilado(fullContent);

    // Generate cover image
    if (tipoCapa === "personalizada" || tipoCapa === "padrao") {
      const imgUrl = generateImageUrl(imagePrompts.capaTrabaho(tema, disciplina || "Educação"));
      setCapaImageUrl(imgUrl);
    }

    setFase("resultado");
    toast.success("Trabalho compilado com sucesso!");
    
    // Log usage after successful compilation
    logUsage("trabalho");

    saveProject("trabalho", tema || "Trabalho sem título", {
      resultado: fullContent,
      tema,
      disciplina,
      classe,
      nomeEscola,
      nomeDocente,
      tipoTrabalho,
    });
  };

  const handleBack = () => {
    if (fase === "estrutura") {
      setFase("formulario");
    } else if (fase === "resultado") {
      setFase("estrutura");
    }
  };

  return (
    <div className="p-3 sm:p-6 md:p-10 max-w-3xl mx-auto md:bg-background bg-background min-h-screen">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          {fase !== "formulario" && (
            <Button type="button" variant="ghost" size="icon" onClick={handleBack} className="mr-1 text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <FileText className="h-4 w-4 md:h-5 md:w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-base md:text-xl font-display font-bold text-foreground">Gerar Trabalho</h1>
            <p className="text-[11px] md:text-sm text-muted-foreground">
              {fase === "formulario" && "Preencha os dados e gere a estrutura"}
              {fase === "estrutura" && "Edite os subtemas e gere o conteúdo"}
              {fase === "resultado" && "Exporte em PDF ou Word"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(["formulario", "estrutura", "resultado"] as Fase[]).map((f, i) => (
            <div key={f} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full transition-colors ${
                fase === f ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]" : i < ["formulario", "estrutura", "resultado"].indexOf(fase) ? "bg-primary/50" : "bg-border md:bg-border"
              }`} />
              {i < 2 && <div className="h-px w-6 md:w-8 bg-border md:bg-border" />}
            </div>
          ))}
          <span className="text-[10px] md:text-xs text-muted-foreground ml-2">
            Etapa {["formulario", "estrutura", "resultado"].indexOf(fase) + 1} de 3
          </span>
        </div>
      </motion.div>

      {/* PHASE 1: FORM */}
      {fase === "formulario" && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleGenerateStructure}
          className="space-y-4"
        >
          {/* Tema */}
          <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tema" className="text-foreground text-xs">Tema do Trabalho <span className="text-destructive">*</span></Label>
              <Input
                id="tema"
                placeholder="Ex: A importância da água no ecossistema angolano"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                required
                className="bg-muted md:bg-background border-border md:border-input text-foreground h-10"
              />
            </div>
          </div>

          {/* Dados da Instituição */}
          <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card space-y-3">
            <h2 className="font-display font-semibold text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">
              Dados da Instituição
            </h2>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Nome da Escola</Label>
              <Input
                placeholder="Ex: Instituto Médio de Economia"
                value={nomeEscola}
                onChange={(e) => setNomeEscola(e.target.value)}
                className="bg-muted md:bg-background border-border md:border-input text-foreground h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Logotipo</Label>
              <label className="flex items-center gap-3 px-3 py-2.5 border border-dashed border-border md:border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30 md:bg-accent/20">
                <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground block truncate">
                    {logoEscola ? logoEscola.name : "Carregar Logotipo"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Máx. 2MB</span>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          {/* Dados do Aluno e Turma */}
          <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card space-y-3">
            <h2 className="font-display font-semibold text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">
              Dados do Aluno e Turma
            </h2>

            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Modalidade</Label>
              <Tabs value={modalidade} onValueChange={(v) => setModalidade(v as "individual" | "grupo")}>
                <TabsList className="w-full bg-muted md:bg-muted">
                  <TabsTrigger value="individual" className="flex-1 text-xs">Individual</TabsTrigger>
                  <TabsTrigger value="grupo" className="flex-1 text-xs">Em Grupo</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {modalidade === "individual" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs">Nome do Aluno</Label>
                  <Input placeholder="Nome completo" value={nomeAluno} onChange={(e) => setNomeAluno(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
                </div>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-xs">Nº</Label>
                    <Input placeholder="01" value={numero} onChange={(e) => setNumero(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
                  </div>
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label className="text-foreground text-xs">Curso</Label>
                    <Input placeholder="Ex: Mecânico" value={curso} onChange={(e) => setCurso(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground text-xs">Integrantes</Label>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border md:border-input" onClick={() => adjustIntegrantes(numIntegrantes - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-[11px] font-medium w-12 text-center text-foreground">{numIntegrantes}</span>
                    <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border md:border-input" onClick={() => adjustIntegrantes(numIntegrantes + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {nomesIntegrantes.map((nome, i) => (
                    <Input key={i} placeholder={`Integrante ${i + 1}`} value={nome} onChange={(e) => updateIntegrante(i, e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Nome do Docente</Label>
              <Input placeholder="Nome do professor(a)" value={nomeDocente} onChange={(e) => setNomeDocente(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
            </div>

            <div className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Classe <span className="text-destructive">*</span></Label>
                <Select value={classe} onValueChange={setClasse}>
                  <SelectTrigger className="bg-muted md:bg-background border-border md:border-input text-foreground h-10 text-xs"><SelectValue placeholder="Classe" /></SelectTrigger>
                  <SelectContent>
                    {classesOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Turma</Label>
                <Input placeholder="A" value={turma} onChange={(e) => setTurma(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Sala</Label>
                <Input placeholder="12" value={sala} onChange={(e) => setSala(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Localidade</Label>
                <Input value={localidade} onChange={(e) => setLocalidade(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Ano Lectivo</Label>
                <Input value={anoLectivo} onChange={(e) => setAnoLectivo(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
              </div>
            </div>
          </div>

          {/* Configurações do Trabalho */}
          <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card space-y-3">
            <h2 className="font-display font-semibold text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">
              Configurações
            </h2>

            <div className="grid grid-cols-3 gap-2 md:grid-cols-1 md:gap-4">
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label className="text-foreground text-xs">Tipo</Label>
                <Select value={tipoTrabalho} onValueChange={setTipoTrabalho}>
                  <SelectTrigger className="bg-muted md:bg-background border-border md:border-input text-foreground h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tiposTrabalho.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Páginas</Label>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border md:border-input" onClick={() => setPaginas(Math.max(3, paginas - 1))}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium flex-1 text-center text-foreground">{paginas}</span>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border md:border-input" onClick={() => setPaginas(Math.min(30, paginas + 1))}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-4">
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label className="text-foreground text-xs">Disciplina</Label>
                <Select value={disciplinas.includes(disciplina) ? disciplina : "__outra__"} onValueChange={(v) => {
                  if (v === "__outra__") setDisciplina("");
                  else setDisciplina(v);
                }}>
                  <SelectTrigger className="bg-muted md:bg-background border-border md:border-input text-foreground h-10 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    {disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    <SelectItem value="__outra__">Outra</SelectItem>
                  </SelectContent>
                </Select>
                {!disciplinas.includes(disciplina) && (
                  <Input
                    placeholder="Escreva a disciplina..."
                    value={disciplina}
                    onChange={(e) => setDisciplina(e.target.value)}
                    className="mt-1 bg-muted md:bg-background border-border md:border-input text-foreground h-10"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Visuais</Label>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border md:border-input" onClick={() => setElementosVisuais(Math.max(0, elementosVisuais - 1))}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium flex-1 text-center text-foreground">{elementosVisuais}</span>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border md:border-input" onClick={() => setElementosVisuais(Math.min(10, elementosVisuais + 1))}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Personalização da Capa */}
          <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card space-y-3">
            <h2 className="font-display font-semibold text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">
              Capa
            </h2>

            <Tabs value={tipoCapa} onValueChange={(v) => setTipoCapa(v as "padrao" | "upload" | "personalizada")}>
              <TabsList className="w-full bg-muted md:bg-muted">
                <TabsTrigger value="padrao" className="flex-1 text-xs">Padrão</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 text-xs">Upload</TabsTrigger>
                <TabsTrigger value="personalizada" className="flex-1 text-xs">IA</TabsTrigger>
              </TabsList>
            </Tabs>

            {tipoCapa === "padrao" && (
              <p className="text-[11px] text-muted-foreground">
                Capa gerada automaticamente com os dados preenchidos.
              </p>
            )}

            {tipoCapa === "upload" && (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border md:border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30 md:bg-accent/20">
                <Image className="h-6 w-6 text-muted-foreground mb-1.5" />
                <span className="text-[11px] text-muted-foreground font-medium">
                  {capaUpload ? capaUpload.name : "Carregar imagem da capa"}
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={handleCapaUpload} />
              </label>
            )}

            {tipoCapa === "personalizada" && (
              <p className="text-[11px] text-muted-foreground">
                Capa personalizada gerada pela IA com design exclusivo.
              </p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full h-11 text-sm font-semibold shadow-[0_4px_16px_hsl(var(--primary)/0.3)]" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">{etapa || "A gerar..."}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Gerar Estrutura
                <CreditCostBadge modulo="trabalho" />
              </span>
            )}
          </Button>
        </motion.form>
      )}

      {/* PHASE 2: SUBTEMAS EDITOR */}
      {fase === "estrutura" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SubtemasEditor
            subtemas={subtemas}
            onUpdate={setSubtemas}
            onGenerateOne={handleGenerateOne}
            onGenerateAll={handleGenerateAll}
            onCompile={handleCompile}
            loading={loading}
            etapa={etapa}
          />
        </motion.div>
      )}

      {/* PHASE 3: RESULT */}
      {fase === "resultado" && resultadoCompilado && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Action buttons */}
          <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 md:p-4 shadow-sm md:shadow-card">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-display font-semibold text-sm text-foreground">Resultado</h2>
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setEditMode(!editMode);
                    toast.info(editMode ? "Modo visualização" : "Modo edição");
                  }}
                >
                  {editMode ? <><Eye className="h-3.5 w-3.5 mr-1" /> Ver</> : <><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</>}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { navigator.clipboard.writeText(resultadoCompilado); toast.success("Copiado!"); }}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={async () => {
                  try {
                    const nomeArquivo = tema.trim() ? tema.trim().substring(0, 50).replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").replace(/\s+/g, "_") : "trabalho_delle";
                    await exportToWord(resultadoCompilado, nomeArquivo, getCoverData());
                    toast.success("Ficheiro Word exportado!");
                  } catch { toast.error("Erro ao exportar Word"); }
                }}>
                  <FileDown className="h-3.5 w-3.5 mr-1" /> Word
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={async () => {
                  try {
                    const nomeArquivo = tema.trim() ? tema.trim().substring(0, 50).replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").replace(/\s+/g, "_") : "trabalho_delle";
                    await exportToPDF(resultadoCompilado, nomeArquivo, getCoverData());
                    toast.success("PDF exportado!");
                  } catch { toast.error("Erro ao exportar PDF"); }
                }}>
                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
              </div>
            </div>
            {editMode && (
              <p className="text-[10px] text-muted-foreground mt-2">
                💡 Clique no texto para editar. Seleccione para formatar.
              </p>
            )}
          </div>

          {/* Paginated A4 display */}
          <TrabalhoCompleto
            conteudo={resultadoCompilado}
            coverData={getCoverData()}
            capaImageUrl={capaImageUrl}
            editable={editMode}
            onContentChange={(updatedHtml) => setResultadoCompilado(updatedHtml)}
          />
        </motion.div>
      )}
    </div>
  );
};

export default TrabalhoPage;
