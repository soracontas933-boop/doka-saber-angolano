import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, FileText, BookOpen, HelpCircle, ClipboardList, Trash2, Eye, Loader2 } from "lucide-react";
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

interface Project {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: Record<string, unknown>;
  criado_em: string;
}

const tipoConfig: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
  trabalho: { label: "Trabalhos", icon: FileText, gradient: "from-primary to-secondary" },
  resumo: { label: "Resumos", icon: BookOpen, gradient: "from-secondary to-primary" },
  questionario: { label: "Questionários", icon: HelpCircle, gradient: "from-primary to-secondary" },
  "plano-aula": { label: "Planos de Aula", icon: ClipboardList, gradient: "from-secondary to-primary" },
};

const tipoRoutes: Record<string, string> = {
  trabalho: "/trabalho",
  resumo: "/resumo",
  questionario: "/questionario",
  "plano-aula": "/plano-aula",
};

const MeusProjetosPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");
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
    <div className="p-3 sm:p-6 md:p-10 max-w-5xl mx-auto md:bg-background bg-background min-h-screen">
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
          Todos os conteúdos que geraste organizados por tipo.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4 md:mb-6 flex-wrap h-auto gap-1 bg-card md:bg-muted">
          <TabsTrigger value="todos" className="text-[10px] sm:text-xs md:text-sm">Todos</TabsTrigger>
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
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
            >
              {filtered.map((project) => {
                const cfg = tipoConfig[project.tipo] || tipoConfig.trabalho;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-5 shadow-sm md:shadow-card hover:md:shadow-card-hover transition-shadow"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className={`inline-flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex-shrink-0`}>
                        <Icon className="h-4 sm:h-5 w-4 sm:w-5 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {cfg.label}
                        </span>
                        <h3 className="text-xs sm:text-sm font-display font-semibold text-foreground truncate mt-0.5">
                          {project.titulo}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          {formatDate(project.criado_em)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[10px] sm:text-xs bg-muted md:bg-background border-border md:border-input text-foreground h-8 sm:h-9"
                        onClick={() => navigate(tipoRoutes[project.tipo] || "/dashboard", { state: { projectId: project.id, conteudo: project.conteudo } })}
                      >
                        <Eye className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                        Ver
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 sm:h-9">
                            <Trash2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
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
                            <AlertDialogAction onClick={() => deleteProject(project.id)}>
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
    </div>
  );
};

export default MeusProjetosPage;
