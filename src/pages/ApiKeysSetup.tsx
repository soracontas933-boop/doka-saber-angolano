import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ApiKeysSetup() {
  const { toast } = useToast();
  const [keys, setKeys] = useState({
    gemini: "AIzaSyDAHZQELdW9pXIU_gorQI-aOH1jTCY2yIo",
    groq: "",
    openrouter: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Limpar chaves existentes primeiro
      await supabase.from("api_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Inserir novas chaves
      const entries = [
        { servico: "gemini", chave: keys.gemini, ativo: true },
        { servico: "groq", chave: keys.groq, ativo: true },
        { servico: "openrouter", chave: keys.openrouter, ativo: true },
      ].filter((e) => e.chave.trim() !== "");

      const { error } = await supabase.from("api_keys").insert(entries);

      if (error) throw error;

      toast({
        title: "Chaves salvas!",
        description: `${entries.length} chave(s) API configurada(s) com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configurar Chaves API</CardTitle>
          <CardDescription>
            Cole as chaves das IAs para ativar os módulos do DOKA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini">Google AI Studio (Gemini)</Label>
            <Input
              id="gemini"
              type="password"
              value={keys.gemini}
              onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
              placeholder="AIzaSy..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groq">Groq</Label>
            <Input
              id="groq"
              type="password"
              value={keys.groq}
              onChange={(e) => setKeys({ ...keys, groq: e.target.value })}
              placeholder="gsk_..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openrouter">OpenRouter</Label>
            <Input
              id="openrouter"
              type="password"
              value={keys.openrouter}
              onChange={(e) => setKeys({ ...keys, openrouter: e.target.value })}
              placeholder="sk-or-v1-..."
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar Chaves API"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            As chaves são armazenadas de forma segura no banco de dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
