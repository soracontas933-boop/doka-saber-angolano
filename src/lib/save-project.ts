import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function saveProject(
  tipo: "trabalho" | "resumo" | "questionario" | "plano-aula",
  titulo: string,
  conteudo: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error("Precisas estar autenticado para guardar projectos.");
    return null;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      tipo,
      titulo,
      conteudo,
    })
    .select()
    .single();

  if (error) {
    toast.error("Erro ao guardar projecto");
    console.error(error);
    return null;
  }

  toast.success("Projecto guardado em Meus Projetos!");
  return data;
}
