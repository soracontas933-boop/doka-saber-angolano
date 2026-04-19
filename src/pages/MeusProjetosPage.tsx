import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FolderOpen,
  FileText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Trash2,
  Eye,
  Loader2,
  Pencil,
  FileDown,
  Download,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TrabalhoCompleto from "@/components/trabalho/TrabalhoCompleto";
import { exportToWord, exportToPDF, type CoverPageData } from "@/lib/export-utils";

interface Project {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: Record<string, unknown>;
  criado_em: string;
}

const tipoConfig: Record<
  string,
  { label: string; icon: React.ElementType; gradient: string; spineColor: string }
> = {
  trabalho: {
    label: "Trabalhos",
    icon: FileText,
    gradient: "from-blue-600 via-blue-500 to-blue-700",
    spineColor: "bg-blue-900",
  },
  resumo: {
    label: "Resumos",
    icon: BookOpen,
    gradient: "from-emerald-600 via-emerald-500 to-emerald-700",
    spineColor: "bg-emerald-900",
  },
  questionario: {
    label: "Questionários",
    icon: HelpCircle,
    gradient: "from-purple-600 via-purple-500 to-purple-700",
    spineColor: "bg-purple-900",
  },
  "plano-aula": {
    label: "Planos de Aula",
    icon: ClipboardList,
    gradient: "from-amber-600 via-orange-500 to-amber-700",
    spineColor: "bg-amber-900",
  },
};

const tipoRoutes: Record<string, string> = {
  trabalho: "/trabalho",
  resumo: "/resumo",
  questionario: "/questionario",
  "plano-aula": "/plano-aula",
};

// Build a CoverPageData object from a stored project payload (best effort)
function extractCoverData(project: Project): CoverPageData {
  const c = (project.conteudo || {}) as Record<string, any>;
  return {
    nomeEscola: c.nomeEscola || c.escola || "",
    tipoTrabalho: c.tipoTrabalho || c.tipo || "Trabalho",
    tema: c.tema || project.titulo || "",
    nomeAluno: c.nomeAluno || c.aluno || "",
    numero: c.numero || "",
    sala: c.sala || "",
    turma: c.turma || "",
    curso: c.curso || "",
    disciplina: c.disciplina || "",
    nomeDocente: c.nomeDocente || c.docente || "",
    localidade: c.localidade || "Luanda - Angola",
    anoLectivo: c.anoLectivo || "",
    classe: c.classe || "",
    nomesIntegrantes: c.nomesIntegrantes || [],
    modalidade: c.modalidade || "individual",
  };
}

function extractMarkdown(project: Project): string {
  const c = (project.conteudo || {}) as Record<string, any>;
  return (
    c.resultadoCompilado ||
    c.markdown ||
    c.conteudo ||
    c.texto ||
    c.html ||
    ""
  );
}

interface BookCoverProps {
  project: Project;
  onView: () => void;
  onEdit: () => void;
  onDownloadWord: () => void;
  onDownloadPdf: () => void;
  onDelete: () => void;
}

const BookCover: React.FC<BookCoverProps> = ({
  project,
  onView,
  onEdit,
  onDownloadWord,
  onDownloadPdf,
  onDelete,
}) => {
  const cfg = tipoConfig[project.tipo] || tipoConfig.trabalho;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group relative"
    >
      {/* Book cover */}
      <div
        className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-r-md rounded-l-sm shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] transition-shadow"
        onClick={onView}
      >
        {/* Spine */}
        <div className={`absolute left-0 top-0 h-full w-2 ${cfg.spineColor} z-10`} />
        {/* Gradient cover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient}`} />
        {/* Texture overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        {/* Cover content */}
        <div className="relative z-20 flex h-full flex-col justify-between p-4 text-white">
          <div>
            <div className="flex items-center gap-1.5 opacity-90">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[9px] font-semibold uppercase tracking-widest">
                {cfg.label.replace(/s$/, "")}
              </span>
            </div>
          </div>

          <div>
            <h3 className="line-clamp-4 text-sm md:text-base font-display font-bold leading-tight">
              {project.titulo}
            </h3>
            <div className="mt-3 h-px w-8 bg-white/60" />
            <p className="mt-2 text-[10px] opacity-80">
              {new Date(project.criado_em).toLocaleDateString("pt-AO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
          <Button size="sm" variant="secondary" className="shadow-lg">
            <Eye className="mr-1.5 h-4 w-4" />
            Ver
          </Button>
        </div>
      </div>

      {/* Actions row */}
      <div className="mt-2 flex items-center justify-between gap-1">
        <div className="flex flex-1 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onEdit}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onDownloadWord}
            title="Baixar Word"
          >
            <FileDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onDownloadPdf}
            title="Baixar PDF"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar projecto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acção não pode ser desfeita. O projecto será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
};

const MeusProjetosPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await (supabase.from("projects") as any)
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar projetos");
    } else {
      setProjects((data as Project[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const deleteProject = async (id: string) => {
    const { error } = await (supabase.from("projects") as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao eliminar projecto");
    } else {
      toast.success("Projecto eliminado");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filtered = useMemo(
    () => (tab === "todos" ? projects : projects.filter((p) => p.tipo === tab)),
    [tab, projects],
  );

  const handleEdit = (project: Project) => {
    navigate(tipoRoutes[project.tipo] || "/dashboard", {
      state: { projectId: project.id, conteudo: project.conteudo, editMode: true },
    });
  };

  const handleDownloadWord = async (project: Project) => {
    const md = extractMarkdown(project);
    if (!md) {
      toast.error("Este projeto não tem conteúdo exportável.");
      return;
    }
    try {
      await exportToWord(md, project.titulo, extractCoverData(project));
    } catch {
      toast.error("Falha ao exportar Word.");
    }
  };

  const handleDownloadPdf = async (project: Project) => {
    const md = extractMarkdown(project);
    if (!md) {
      toast.error("Este projeto não tem conteúdo exportável.");
      return;
    }
    try {
      await exportToPDF(md, project.titulo, extractCoverData(project));
    } catch {
      toast.error("Falha ao exportar PDF.");
    }
  };

  const previewMarkdown = previewProject ? extractMarkdown(previewProject) : "";
  const previewCover = previewProject ? extractCoverData(previewProject) : null;

  return (
    <div className="p-3 sm:p-6 md:p-10 max-w-7xl mx-auto bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <FolderOpen className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <h1 className="text-lg md:text-3xl font-display font-bold text-foreground">
            Minha Biblioteca
          </h1>
        </div>
        <p className="text-[11px] md:text-sm text-muted-foreground mb-4 md:mb-6">
          Os teus trabalhos e projetos organizados como uma estante de livros.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4 md:mb-6 flex-wrap h-auto gap-1 bg-card md:bg-muted">
          <TabsTrigger value="todos" className="text-[10px] sm:text-xs md:text-sm">
            Todos
          </TabsTrigger>
          {Object.entries(tipoConfig).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key} className="text-[10px] sm:text-xs md:text-sm">
              {cfg.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg font-medium">
                A tua estante está vazia
              </p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                Comece a criar conteúdos nas ferramentas disponíveis.
              </p>
              <Button className="mt-6" onClick={() => navigate("/dashboard")}>
                Ir para o Painel
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5 md:gap-6"
            >
              {filtered.map((project) => (
                <BookCover
                  key={project.id}
                  project={project}
                  onView={() => setPreviewProject(project)}
                  onEdit={() => handleEdit(project)}
                  onDownloadWord={() => handleDownloadWord(project)}
                  onDownloadPdf={() => handleDownloadPdf(project)}
                  onDelete={() => deleteProject(project.id)}
                />
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Inline preview dialog (compiled work inside Meus Projetos) */}
      <Dialog open={!!previewProject} onOpenChange={(open) => !open && setPreviewProject(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-6xl h-[92vh] p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <h2 className="truncate text-sm md:text-base font-display font-semibold">
                {previewProject?.titulo}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => previewProject && handleEdit(previewProject)}
                className="hidden sm:inline-flex"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => previewProject && handleDownloadWord(previewProject)}
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" /> Word
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => previewProject && handleDownloadPdf(previewProject)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setPreviewProject(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto bg-muted/30 p-3 md:p-6">
            {previewProject && previewMarkdown && previewCover ? (
              previewProject.tipo === "trabalho" ? (
                <div className="origin-top mx-auto" style={{ maxWidth: "210mm" }}>
                  <TrabalhoCompleto
                    conteudo={previewMarkdown}
                    coverData={previewCover}
                    capaImageUrl={null}
                    editable={false}
                  />
                </div>
              ) : (
                <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 md:p-10 shadow-md text-foreground">
                  <article
                    className="prose prose-sm md:prose-base max-w-none whitespace-pre-wrap"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {previewMarkdown}
                  </article>
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Sem conteúdo disponível para pré-visualização.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeusProjetosPage;
