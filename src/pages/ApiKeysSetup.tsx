import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [hiddenKeys, setHiddenKeys] = useState<Set<number>>(new Set());

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

    const loaded: KeyRow[] = data?.map(r => ({ ...r, prioridade: r.prioridade ?? 0 })) ?? [];

    // Ensure every provider has at least 1 empty slot
    const result: KeyRow[] = [...loaded];
    for (const p of PROVIDERS) {
      const hasEmpty = result.some(k => k.servico === p.key && !k.chave?.trim());
      if (!hasEmpty) {
        const existing = result.filter(k => k.servico === p.key);
        const maxPrio = existing.length > 0 ? Math.max(...existing.map(k => k.prioridade)) + 1 : 0;
        result.push({ servico: p.key, chave: "", prioridade: maxPrio, isNew: true });
      }
    }
    setKeys(result);
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

  const toggleVisibility = (index: number) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await supabase.from("api_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const entries = keys
        .filter(k => k.chave?.trim())
        .map((k) => ({
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
        description: `${entries.length} chave(s) API configurada(s). Substituição automática activa.`,
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
    return new Date(k.ultimo_erro).getTime() > Date.now() - 6 * 60 * 60 * 1000;
  };

  const getProviderKeys = (providerKey: string) => keys.filter(k => k.servico === providerKey);
  const getFilledCount = (providerKey: string) => keys.filter(k => k.servico === providerKey && k.chave?.trim()).length;
  const totalActiveKeys = keys.filter(k => k.chave?.trim()).length;

  if (fetching) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Configurar Chaves API</CardTitle>
          <CardDescription>
            Cole as chaves directamente nos campos abaixo. Clique em <strong>"+ Adicionar outra chave"</strong> para adicionar mais do mesmo provedor.
            <span className="block mt-1 font-medium text-primary">
              {totalActiveKeys} chave(s) activa(s) no total
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {PROVIDERS.map((provider) => {
            const providerKeys = getProviderKeys(provider.key);
            const filledCount = getFilledCount(provider.key);
            return (
              <div key={provider.key} className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-semibold">{provider.label}</Label>
                      {filledCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {filledCount} chave{filledCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                  </div>
                </div>

                {providerKeys.map((keyRow) => {
                  const globalIndex = keys.indexOf(keyRow);
                  const exhausted = isExhausted(keyRow);
                  const isHidden = hiddenKeys.has(globalIndex);
                  return (
                    <div key={globalIndex} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={isHidden ? "password" : "text"}
                          value={keyRow.chave}
                          onChange={(e) => updateKey(globalIndex, e.target.value)}
                          placeholder={`Cole aqui a chave ${provider.label}...`}
                          className={exhausted ? "border-destructive pr-16" : "pr-16"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(globalIndex)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        >
                          {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      {exhausted && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                      {!exhausted && keyRow.chave?.trim() && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addKey(provider.key)}
                  className="w-full border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar outra chave {provider.label.split(" ")[0]}
                </Button>
              </div>
            );
          })}

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar Todas as Chaves"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Substituição automática: se uma chave esgota, passa para a próxima do mesmo provedor.
            Chaves exaustas são reactivadas após 6 horas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
