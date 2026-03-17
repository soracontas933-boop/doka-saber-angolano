import { useState } from "react";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { FileText, Download, Copy, Upload, Plus, Minus, Image, Loader2, FileDown, ArrowLeft, Pencil, Eye, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { generateWithGroq, generateImageUrl, imagePrompts, prompts, DOKA_SYSTEM_PROMPT } from "@/lib/ai-service";
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

      const prompt = prompts.subtema({
        temaGeral: tema,
        tituloSubtema: sub.titulo,
        tipoSubtema: sub.tipo,
        disciplina: disciplina || "Geral",
        classe: classe || "10ª Classe",
        posicao: index + 1,
        totalSubtemas: subtemas.length,
        contexto: contexto || undefined,
      });

      const conteudo = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt, 6000, 0.7);

      setSubtemas((prev) =>
        prev.map((s) => (s.id === id ? { ...s, conteudo, status: "gerado" } : s))
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

  // Generate all pending subtemas sequentially
  const handleGenerateAll = async () => {
    const pendentes = subtemas.filter((s) => s.status !== "gerado");
    if (pendentes.length === 0) {
      toast.info("Todos os subtemas já foram gerados");
      return;
    }

    for (const sub of pendentes) {
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
      return `${tituloPrefix}\n\n${s.conteudo}`;
    });

    const fullContent = sections.join("\n\n");
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
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          {fase !== "formulario" && (
            <Button type="button" variant="ghost" size="icon" onClick={handleBack} className="mr-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <FileText className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">Gerar Trabalho Escolar</h1>
            <p className="text-sm text-muted-foreground">
              {fase === "formulario" && "Preencha os dados e gere a estrutura do trabalho"}
              {fase === "estrutura" && "Edite os subtemas e gere o conteúdo de cada um"}
              {fase === "resultado" && "Trabalho compilado — exporte em PDF ou Word"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(["formulario", "estrutura", "resultado"] as Fase[]).map((f, i) => (
            <div key={f} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full transition-colors ${
                fase === f ? "bg-primary" : i < ["formulario", "estrutura", "resultado"].indexOf(fase) ? "bg-primary/50" : "bg-border"
              }`} />
              {i < 2 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-2">
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
          className="space-y-6"
        >
          {/* Tema */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tema">Tema do Trabalho <span className="text-destructive">*</span></Label>
              <Input
                id="tema"
                placeholder="Ex: A importância da água no ecossistema angolano"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Dados da Instituição */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Dados da Instituição
            </h2>
            <div className="space-y-2">
              <Label>Nome da Escola/Instituto</Label>
              <Input
                placeholder="Ex: Instituto Médio de Economia de Luanda"
                value={nomeEscola}
                onChange={(e) => setNomeEscola(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Logotipo da Escola</Label>
              <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/20">
                <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground block truncate">
                    {logoEscola ? logoEscola.name : "Carregar Logotipo"}
                  </span>
                  <span className="text-xs text-muted-foreground">Máx. 2MB</span>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          {/* Dados do Aluno e Turma */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Dados do Aluno e Turma
            </h2>

            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Tabs value={modalidade} onValueChange={(v) => setModalidade(v as "individual" | "grupo")}>
                <TabsList className="w-full">
                  <TabsTrigger value="individual" className="flex-1">Individual</TabsTrigger>
                  <TabsTrigger value="grupo" className="flex-1">Em Grupo</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {modalidade === "individual" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Aluno</Label>
                  <Input placeholder="Nome completo" value={nomeAluno} onChange={(e) => setNomeAluno(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nº</Label>
                    <Input placeholder="Ex: 01" value={numero} onChange={(e) => setNumero(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Curso</Label>
                    <Input placeholder="Ex: Mecânico Frio e Climatização" value={curso} onChange={(e) => setCurso(e.target.value)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Número de Integrantes</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustIntegrantes(numIntegrantes - 1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm font-medium w-16 text-center">{numIntegrantes} integrantes</span>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustIntegrantes(numIntegrantes + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nomes dos Integrantes</Label>
                  {nomesIntegrantes.map((nome, i) => (
                    <Input key={i} placeholder={`Integrante ${i + 1}`} value={nome} onChange={(e) => updateIntegrante(i, e.target.value)} />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome do Docente</Label>
              <Input placeholder="Nome do professor(a)" value={nomeDocente} onChange={(e) => setNomeDocente(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Classe <span className="text-destructive">*</span></Label>
                <Select value={classe} onValueChange={setClasse}>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    {classesOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Turma</Label>
                <Input placeholder="Ex: A" value={turma} onChange={(e) => setTurma(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sala</Label>
                <Input placeholder="Ex: 12" value={sala} onChange={(e) => setSala(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Localidade</Label>
                <Input value={localidade} onChange={(e) => setLocalidade(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ano Lectivo</Label>
              <Input value={anoLectivo} onChange={(e) => setAnoLectivo(e.target.value)} />
            </div>
          </div>

          {/* Configurações do Trabalho */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Configurações do Trabalho
            </h2>

            <div className="space-y-2">
              <Label>Tipo de Trabalho</Label>
              <Select value={tipoTrabalho} onValueChange={setTipoTrabalho}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposTrabalho.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={disciplina} onValueChange={setDisciplina}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Páginas</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setPaginas(Math.max(3, paginas - 1))}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-sm font-medium flex-1 text-center">{paginas} páginas</span>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setPaginas(Math.min(30, paginas + 1))}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Elementos Visuais</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setElementosVisuais(Math.max(0, elementosVisuais - 1))}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-sm font-medium flex-1 text-center">{elementosVisuais}</span>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setElementosVisuais(Math.min(10, elementosVisuais + 1))}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Personalização da Capa */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Personalização da Capa
            </h2>
            <p className="text-xs text-muted-foreground">Escolha entre capa padrão, upload ou personalizada</p>

            <Tabs value={tipoCapa} onValueChange={(v) => setTipoCapa(v as "padrao" | "upload" | "personalizada")}>
              <TabsList className="w-full">
                <TabsTrigger value="padrao" className="flex-1">Padrão</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
                <TabsTrigger value="personalizada" className="flex-1">Personalizada</TabsTrigger>
              </TabsList>
            </Tabs>

            {tipoCapa === "padrao" && (
              <p className="text-sm text-muted-foreground">
                A capa será gerada automaticamente com os dados preenchidos acima.
              </p>
            )}

            {tipoCapa === "upload" && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/20">
                <Image className="h-7 w-7 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground font-medium">
                  {capaUpload ? capaUpload.name : "Carregar imagem da capa"}
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={handleCapaUpload} />
              </label>
            )}

            {tipoCapa === "personalizada" && (
              <p className="text-sm text-muted-foreground">
                A capa personalizada será gerada pela IA com design exclusivo baseado no tema do trabalho.
              </p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {etapa || "A gerar..."}
              </span>
            ) : "Gerar Estrutura"}
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
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-display font-semibold">Resultado</h2>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setEditMode(!editMode);
                    toast.info(editMode ? "Modo visualização" : "Modo edição — clique no texto para editar");
                  }}
                >
                  {editMode ? <><Eye className="h-4 w-4 mr-1" /> Visualizar</> : <><Pencil className="h-4 w-4 mr-1" /> Editar</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(resultadoCompilado); toast.success("Copiado!"); }}>
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const nomeArquivo = tema.trim() ? tema.trim().substring(0, 50).replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").replace(/\s+/g, "_") : "trabalho_doka";
                    await exportToWord(resultadoCompilado, nomeArquivo, getCoverData());
                    toast.success("Ficheiro Word exportado!");
                  } catch { toast.error("Erro ao exportar Word"); }
                }}>
                  <FileDown className="h-4 w-4 mr-1" /> Word
                </Button>
                <Button size="sm" onClick={async () => {
                  try {
                    const nomeArquivo = tema.trim() ? tema.trim().substring(0, 50).replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").replace(/\s+/g, "_") : "trabalho_doka";
                    await exportToPDF(resultadoCompilado, nomeArquivo, getCoverData());
                    toast.success("PDF exportado!");
                  } catch { toast.error("Erro ao exportar PDF"); }
                }}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </div>
            {editMode && (
              <p className="text-xs text-muted-foreground mt-2">
                💡 Clique em qualquer texto para editar. Seleccione texto para ver a barra de formatação.
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
