import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Copy, Upload, Plus, Minus, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { generateWithGroq, reviewWithOpenRouter, generateImageUrl, imagePrompts, prompts, DOKA_SYSTEM_PROMPT } from "@/lib/ai-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

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

const TrabalhoPage = () => {
  const [tema, setTema] = useState("");
  const [nomeEscola, setNomeEscola] = useState("");
  const [logoEscola, setLogoEscola] = useState<File | null>(null);
  const [modalidade, setModalidade] = useState<"individual" | "grupo">("individual");
  const [numIntegrantes, setNumIntegrantes] = useState(4);
  const [nomesIntegrantes, setNomesIntegrantes] = useState<string[]>(["", "", "", ""]);
  const [nomeAluno, setNomeAluno] = useState("");
  const [nomeDocente, setNomeDocente] = useState("");
  const [classe, setClasse] = useState("");
  const [turma, setTurma] = useState("");
  const [sala, setSala] = useState("");
  const [localidade, setLocalidade] = useState("Luanda - Angola");
  const [anoLectivo, setAnoLectivo] = useState("2025/2026");
  const [tipoTrabalho, setTipoTrabalho] = useState("Trabalho de Pesquisa");
  const [disciplina, setDisciplina] = useState("");
  const [paginas, setPaginas] = useState(5);
  const [elementosVisuais, setElementosVisuais] = useState(2);
  const [tipoCapa, setTipoCapa] = useState<"padrao" | "upload" | "personalizada">("padrao");
  const [capaUpload, setCapaUpload] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

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

  const [capaImageUrl, setCapaImageUrl] = useState<string | null>(null);
  const [etapa, setEtapa] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim()) { toast.error("Insira o tema do trabalho"); return; }
    setLoading(true);
    setResultado(null);
    setCapaImageUrl(null);

    try {
      // Etapa 1: Groq gera o trabalho
      setEtapa("A gerar trabalho com IA...");
      const prompt = prompts.trabalho({
        titulo: tema,
        disciplina: disciplina || "Geral",
        classe: classe || "10ª Classe",
        paginas,
        tipo: tipoTrabalho,
        nomeEscola,
        nomeAluno: modalidade === "individual" ? nomeAluno : nomesIntegrantes.filter(Boolean).join(", "),
        nomeDocente,
        anoLectivo,
        localidade,
      });

      const conteudo = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt);

      // Etapa 2: OpenRouter revisa
      setEtapa("A revisar conteúdo...");
      const revisado = await reviewWithOpenRouter(conteudo);
      setResultado(revisado);

      // Etapa 3: Pollinations gera imagem da capa
      if (tipoCapa === "personalizada" || tipoCapa === "padrao") {
        setEtapa("A gerar imagem da capa...");
        const imgUrl = generateImageUrl(imagePrompts.capaTrabaho(tema, disciplina || "Educação"));
        setCapaImageUrl(imgUrl);
      }

      toast.success("Trabalho gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar trabalho:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o trabalho. Verifique as chaves API.");
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <FileText className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">Gerar Trabalho Escolar</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados e gere o seu trabalho completo</p>
          </div>
        </div>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleGenerate}
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
            <div className="space-y-2">
              <Label>Nome do Aluno</Label>
              <Input
                placeholder="Nome completo"
                value={nomeAluno}
                onChange={(e) => setNomeAluno(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Número de Integrantes</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => adjustIntegrantes(numIntegrantes - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-sm font-medium w-16 text-center">
                    {numIntegrantes} integrantes
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => adjustIntegrantes(numIntegrantes + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nomes dos Integrantes</Label>
                {nomesIntegrantes.map((nome, i) => (
                  <Input
                    key={i}
                    placeholder={`Integrante ${i + 1}`}
                    value={nome}
                    onChange={(e) => updateIntegrante(i, e.target.value)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome do Docente</Label>
            <Input
              placeholder="Nome do professor(a)"
              value={nomeDocente}
              onChange={(e) => setNomeDocente(e.target.value)}
            />
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
          {loading ? "A gerar trabalho..." : "Gerar Trabalho"}
        </Button>
      </motion.form>

      {resultado && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Resultado</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(resultado); toast.success("Copiado!"); }}>
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-1" /> Exportar PDF
              </Button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-card-foreground">
            <p>{resultado}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TrabalhoPage;
