import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, FileText, BookOpen, HelpCircle, ClipboardList, Trash2, Eye, Loader2, Download, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Componentes de Preview
import ResumoPreview from "@/components/resumo/ResumoPreview";
import QuestionarioPreview from "@/components/questionario/QuestionarioPreview";
import PlanoHorizontalResult from "@/components/plano-aula/PlanoHorizontalResult";
import TrabalhoCompleto from "@/components/trabalho/TrabalhoCompleto";

// Utilitários de Exportação
import { exportToPDF, exportToWord } from "@/lib/export-utils";
import { exportResumoPDF, exportResumoWord } from "@/lib/resumo-export";
import { exportQuestionarioPDF, exportQuestionarioWord } from "@/lib/questionario-export";
import { exportPlanoAulaPdf, exportPlanoAulaWord } from "@/lib/plano-aula-export";

interface Project {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: any;
  criado_em: string;
}

const tipoConfig: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
  trabalho: { label: "Trabalhos", icon: FileText, gradient: "from-primary to-secondary" },
  resumo: { label: "Resumos", icon: BookOpen, gradient: "from-secondary to-primary" },
  questionario: { label: "Questionários", icon: HelpCircle, gradient: "from-primary to-secondary" },
  "plano-aula": { label: "Planos de Aula", icon: ClipboardList, gradient: "from-secondary to-primary" },
};

const MeusProjetosPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await (supabase
      .from("projects") as any)
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
      if (selectedProject?.id === id) {
        setIsPreviewOpen(false);
        setSelectedProject(null);
      }
    }
  };

  const handleDownload = async (project: Project, format: 'pdf' | 'word') => {
    const { tipo, conteudo, titulo } = project;
    
    try {
      if (tipo === "trabalho") {
        if (format === 'pdf') {
          await exportToPDF(conteudo.conteudo, conteudo.coverData);
        } else {
          await exportToWord(conteudo.conteudo, conteudo.coverData);
        }
      } else if (tipo === "resumo") {
        if (format === 'pdf') {
          await exportResumoPDF(conteudo.resultado, conteudo.tipoResumo, conteudo.disciplina, titulo);
        } else {
          await exportResumoWord(conteudo.resultado, conteudo.tipoResumo, conteudo.disciplina, titulo);
        }
      } else if (tipo === "questionario") {
        if (format === 'pdf') {
          await exportQuestionarioPDF(conteudo.resultado, conteudo.tipo, conteudo.disciplina, titulo);
        } else {
          await exportQuestionarioWord(conteudo.resultado, conteudo.tipo, conteudo.disciplina, titulo);
        }
      } else if (tipo === "plano-aula") {
        if (conteudo.tipo === "horizontal") {
          if (format === 'pdf') {
            await exportPlanoAulaPdf(conteudo.dados, conteudo.fases);
          } else {
            await exportPlanoAulaWord(conteudo.dados, conteudo.fases);
          }
        } else {
          // Para plano vertical (texto simples) usamos exportadores de resumo como fallback
          if (format === 'pdf') {
            await exportResumoPDF(conteudo.resultado, "Plano de Aula", conteudo.disciplina, titulo);
          } else {
            await exportResumoWord(conteudo.resultado, "Plano de Aula", conteudo.disciplina, titulo);
          }
        }
      }
      toast.success(`Download em ${format.toUpperCase()} iniciado`);
    } catch (error) {
      console.error("Erro no download:", error);
      toast.error("Erro ao gerar ficheiro para download");
    }
  };

  const openPreview = (project: Project) => {
    setSelectedProject(project);
    setIsPreviewOpen(true);
  };

  const renderPreviewContent = () => {
    if (!selectedProject) return null;
    const { tipo, conteudo, titulo } = selectedProject;

    switch (tipo) {
      case "trabalho":
        return (
          <div className="max-w-4xl mx-auto bg-white p-4 md:p-8 rounded-lg shadow-inner overflow-auto max-h-[70vh]">
            <TrabalhoCompleto 
              conteudo={conteudo.conteudo} 
              coverData={conteudo.coverData} 
              capaImageUrl={conteudo.capaImageUrl}
              logoUrl={conteudo.logoUrl}
              editable={false}
            />
          </div>
        );
      case "resumo":
        return (
          <div className="max-w-4xl mx-auto bg-background p-4 rounded-lg overflow-auto max-h-[70vh]">
            <ResumoPreview 
              resultado={conteudo.resultado} 
              tipoResumo={conteudo.tipoResumo} 
              disciplina={conteudo.disciplina} 
            />
          </div>
        );
      case "questionario":
        return (
          <div className="max-w-4xl mx-auto bg-background p-4 rounded-lg overflow-auto max-h-[70vh]">
            <QuestionarioPreview 
              resultado={conteudo.resultado} 
              tipo={conteudo.tipo} 
              disciplina={conteudo.disciplina} 
            />
          </div>
        );
      case "plano-aula":
        if (conteudo.tipo === "horizontal") {
          return (
            <div className="max-w-5xl mx-auto bg-background p-4 rounded-lg overflow-auto max-h-[70vh]">
              <PlanoHorizontalResult 
                dados={conteudo.dados} 
                fases={conteudo.fases} 
              />
            </div>
          );
        }
        return (
          <div className="max-w-3xl mx-auto bg-card p-6 md:p-10 rounded-xl border shadow-sm overflow-auto max-h-[70vh]">
            <h2 className="text-2xl font-bold mb-6 text-center uppercase border-b pb-4">Plano de Aula</h2>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap font-serif">
              {conteudo.resultado}
            </div>
          </div>
        );
      default:
        return <div className="text-center py-10">Visualização não disponível para este tipo de projecto.</div>;
    }
  };

  const filtered = tab === "todos" ? projects : projects.filter((p) => p.tipo === tab);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-AO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-3 sm:p-6 md:p-10 max-w-7xl mx-auto md:bg-background bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <FolderOpen className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <h1 className="text-lg md:text-3xl font-display font-bold text-foreground">Meus Projetos</h1>
        </div>
        <p className="text-[11px] md:text-sm text-muted-foreground mb-4 md:mb-6">
          Vitrine de todos os conteúdos que já geraste. Visualiza em modo leitura ou baixa os ficheiros.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4 md:mb-6 flex-wrap h-auto gap-1 bg-card md:bg-muted p-1 rounded-xl">
          <TabsTrigger value="todos" className="text-[10px] sm:text-xs md:text-sm px-4 py-2">Todos</TabsTrigger>
          {Object.entries(tipoConfig).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key} className="text-[10px] sm:text-xs md:text-sm px-4 py-2">
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
              className="text-center py-20 bg-card/50 rounded-3xl border border-dashed border-border"
            >
              <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg font-medium">Nenhum projecto encontrado</p>
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            >
              {filtered.map((project) => {
                const cfg = tipoConfig[project.tipo] || tipoConfig.trabalho;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={project.id}
                    layoutId={project.id}
                    className="group bg-card border border-border/50 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${cfg.gradient} shadow-lg shadow-primary/10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                          {cfg.label}
                        </span>
                        <h3 className="text-sm md:text-base font-display font-bold text-foreground line-clamp-2 mt-0.5 leading-tight">
                          {project.titulo}
                        </h3>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                          {formatDate(project.criado_em)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex items-center gap-2 pt-4 border-t border-border/40">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs font-semibold h-9 rounded-xl"
                        onClick={() => openPreview(project)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Modo Leitura
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => handleDownload(project, 'pdf')} className="text-xs cursor-pointer">
                            Baixar em PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(project, 'word')} className="text-xs cursor-pointer">
                            Baixar em Word
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar projecto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acção não pode ser desfeita. O projecto "{project.titulo}" será eliminado permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteProject(project.id)} className="rounded-xl bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Preview (Modo Leitura) */}
      <AnimatePresence>
        {isPreviewOpen && selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-card border border-border shadow-2xl rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 md:p-6 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${tipoConfig[selectedProject.tipo]?.gradient || 'from-primary to-secondary'}`}>
                    {selectedProject.tipo === 'trabalho' && <FileText className="h-5 w-5 text-white" />}
                    {selectedProject.tipo === 'resumo' && <BookOpen className="h-5 w-5 text-white" />}
                    {selectedProject.tipo === 'questionario' && <HelpCircle className="h-5 w-5 text-white" />}
                    {selectedProject.tipo === 'plano-aula' && <ClipboardList className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-sm md:text-lg font-bold leading-tight line-clamp-1">{selectedProject.titulo}</h2>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{tipoConfig[selectedProject.tipo]?.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="hidden sm:flex rounded-xl h-9">
                        <Download className="h-4 w-4 mr-2" /> Baixar Ficheiro
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => handleDownload(selectedProject, 'pdf')} className="cursor-pointer">
                        Baixar em PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(selectedProject, 'word')} className="cursor-pointer">
                        Baixar em Word
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-9 w-9 hover:bg-muted"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/10">
                {renderPreviewContent()}
              </div>

              <div className="p-4 border-t bg-muted/30 flex justify-center sm:hidden">
                <div className="flex gap-2 w-full">
                  <Button onClick={() => handleDownload(selectedProject, 'pdf')} variant="outline" className="flex-1 rounded-xl h-10 text-xs">
                    PDF
                  </Button>
                  <Button onClick={() => handleDownload(selectedProject, 'word')} variant="outline" className="flex-1 rounded-xl h-10 text-xs">
                    Word
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeusProjetosPage;
