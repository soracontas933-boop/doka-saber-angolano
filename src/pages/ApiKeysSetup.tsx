import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

const PROVIDERS = [
  { key: "gemini", label: "Google AI Studio (Gemini)", placeholder: "AIzaSy...", description: "OCR + texto. Gratuito com limite diário." },
  { key: "groq", label: "Groq", placeholder: "gsk_...", description: "Llama 3.3 70B + Vision OCR. Muito rápido e gratuito." },
  { key: "cerebras", label: "Cerebras", placeholder: "csk-...", description: "Llama 3.3 70B. Extremamente rápido e gratuito." },
  { key: "together", label: "Together AI", placeholder: "tok_...", description: "Llama 3.3 70B free tier. Gratuito." },
  { key: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-...", description: "DeepSeek V3 gratuito. Fallback robusto." },
] as const;

interface KeyRow {
  id?: string;
  servico: string;
  chave: string;
  prioridade: number;
  ultimo_erro?: string | null;
  isNew?: boolean;
}

export default function ApiKeysSetup() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setFetching(true);
    const { data } = await supabase
      .from("api_keys")
      .select("id, servico, chave, prioridade, ultimo_erro")
      .eq("ativo", true)
      .order("servico")
      .order("prioridade");

    if (data && data.length > 0) {
      setKeys(data.map(r => ({ ...r, prioridade: r.prioridade ?? 0 })));
    } else {
      // Seed with default empty rows
      setKeys(PROVIDERS.map((p, i) => ({ servico: p.key, chave: "", prioridade: i, isNew: true })));
    }
    setFetching(false);
  };

  const addKey = (servico: string) => {
    const existing = keys.filter(k => k.servico === servico);
    const maxPrio = existing.length > 0 ? Math.max(...existing.map(k => k.prioridade)) + 1 : 0;
    setKeys([...keys, { servico, chave: "", prioridade: maxPrio, isNew: true }]);
  };

  const removeKey = (index: number) => {
    setKeys(keys.filter((_, i) => i !== index));
  };

  const updateKey = (index: number, value: string) => {
    const updated = [...keys];
    updated[index] = { ...updated[index], chave: value };
    setKeys(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete all existing keys
      await supabase.from("api_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const entries = keys
        .filter(k => k.chave?.trim())
        .map((k, i) => ({
          servico: k.servico,
          chave: k.chave.trim(),
          ativo: true,
          prioridade: k.prioridade,
        }));

      if (entries.length === 0) {
        toast({ title: "Nenhuma chave inserida", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("api_keys").insert(entries);
      if (error) throw error;

      toast({
        title: "Chaves salvas!",
        description: `${entries.length} chave(s) API configurada(s). Sistema de substituição automática activo.`,
      });
      fetchKeys();
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

  const isExhausted = (k: KeyRow) => {
    if (!k.ultimo_erro) return false;
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    return new Date(k.ultimo_erro).getTime() > sixHoursAgo;
  };

  const getProviderKeys = (providerKey: string) => keys.filter(k => k.servico === providerKey);
  const totalActiveKeys = keys.filter(k => k.chave?.trim()).length;

  if (fetching) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Configurar Chaves API</CardTitle>
          <CardDescription>
            Adicione múltiplas chaves por provedor para substituição automática quando uma esgota.
            <span className="block mt-1 font-medium text-primary">
              {totalActiveKeys} chave(s) activa(s) — quanto mais, maior a capacidade diária!
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {PROVIDERS.map((provider) => {
            const providerKeys = getProviderKeys(provider.key);
            return (
              <div key={provider.key} className="space-y-2 border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">{provider.label}</Label>
                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addKey(provider.key)}
                    className="shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Chave
                  </Button>
                </div>

                {providerKeys.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhuma chave adicionada</p>
                )}

                {providerKeys.map((keyRow) => {
                  const globalIndex = keys.indexOf(keyRow);
                  const exhausted = isExhausted(keyRow);
                  return (
                    <div key={globalIndex} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="password"
                          value={keyRow.chave}
                          onChange={(e) => updateKey(globalIndex, e.target.value)}
                          placeholder={provider.placeholder}
                          className={exhausted ? "border-destructive" : ""}
                        />
                      </div>
                      {exhausted ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : keyRow.chave?.trim() ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeKey(globalIndex)}
                        className="shrink-0 h-8 w-8"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar Todas as Chaves"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            O sistema usa substituição automática: se uma chave esgota, passa para a próxima do mesmo provedor.
            Chaves exaustas são reactivadas automaticamente após 6 horas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
