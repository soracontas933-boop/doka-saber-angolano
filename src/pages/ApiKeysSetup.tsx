import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PROVIDERS = [
  { key: "gemini", label: "Google AI Studio (Gemini)", placeholder: "AIzaSy...", description: "OCR + texto. Gratuito com limite diário." },
  { key: "groq", label: "Groq", placeholder: "gsk_...", description: "Llama 3.3 70B + Vision OCR. Muito rápido e gratuito." },
  { key: "cerebras", label: "Cerebras", placeholder: "csk-...", description: "Llama 3.3 70B. Extremamente rápido e gratuito." },
  { key: "together", label: "Together AI", placeholder: "tok_...", description: "Llama 3.3 70B free tier. Gratuito." },
  { key: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-...", description: "DeepSeek V3 gratuito. Fallback robusto." },
] as const;

export default function ApiKeysSetup() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<Record<string, string>>({
    gemini: "AIzaSyDAHZQELdW9pXIU_gorQI-aOH1jTCY2yIo",
    groq: "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",
    openrouter: "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",
    cerebras: "",
    together: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await supabase.from("api_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const entries = PROVIDERS
        .filter((p) => keys[p.key]?.trim())
        .map((p) => ({ servico: p.key, chave: keys[p.key].trim(), ativo: true }));

      if (entries.length === 0) {
        toast({ title: "Nenhuma chave inserida", variant: "destructive" });
        return;
      }

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
            Cole as chaves das IAs gratuitas. Quanto mais provedores, menos chances de limite!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((provider) => (
            <div key={provider.key} className="space-y-1">
              <Label htmlFor={provider.key}>{provider.label}</Label>
              <Input
                id={provider.key}
                type="password"
                value={keys[provider.key] || ""}
                onChange={(e) => setKeys({ ...keys, [provider.key]: e.target.value })}
                placeholder={provider.placeholder}
              />
              <p className="text-xs text-muted-foreground">{provider.description}</p>
            </div>
          ))}

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar Chaves API"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            As chaves são armazenadas de forma segura. O sistema usa fallback automático entre provedores.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
