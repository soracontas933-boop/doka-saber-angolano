import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PROVIDERS = [
  { key: "gemini", label: "Google AI Studio (Gemini)", placeholder: "AIzaSy...", description: "OCR + texto. Gratuito com limite diário." },
  { key: "groq", label: "Groq", placeholder: "gsk_...", description: "Llama 3.3 70B + Vision OCR. Muito rápido e gratuito." },
  { key: "cerebras", label: "Cerebras", placeholder: "csk-...", description: "Llama 3.3 70B. Extremamente rápido e gratuito." },
  { key: "together", label: "Together AI", placeholder: "tok_...", description: "Llama 3.3 70B free tier. Gratuito." },
  { key: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-...", description: "Fallback robusto para geração de texto." },
  { key: "mistral", label: "Mistral AI", placeholder: "CET6...", description: "Mistral Small. Fallback adicional gratuito." },
] as const;

type ProviderKey = (typeof PROVIDERS)[number]["key"];
type ProviderConfig = (typeof PROVIDERS)[number];

interface KeyRow {
  id?: string;
  servico: string;
  chave: string;
  prioridade: number;
  ultimo_erro?: string | null;
  isNew?: boolean;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Erro desconhecido";
};

export default function ApiKeysSetup() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [bulkProvider, setBulkProvider] = useState<ProviderConfig | null>(null);
  const [bulkValue, setBulkValue] = useState("");

  const getNextPriority = (items: KeyRow[], servico: ProviderKey) => {
    const existing = items.filter((item) => item.servico === servico);
    return existing.length > 0 ? Math.max(...existing.map((item) => item.prioridade)) + 1 : 0;
  };

  const ensureProviderHasEmptySlot = (items: KeyRow[], servico: ProviderKey) => {
    const nextItems = [...items];
    const hasEmpty = nextItems.some((item) => item.servico === servico && !item.chave?.trim());

    if (!hasEmpty) {
      nextItems.push({
        servico,
        chave: "",
        prioridade: getNextPriority(nextItems, servico),
        isNew: true,
      });
    }

    return nextItems;
  };

  const ensureAllProvidersHaveEmptySlots = (items: KeyRow[]) => {
    return PROVIDERS.reduce<KeyRow[]>((acc, provider) => ensureProviderHasEmptySlot(acc, provider.key), [...items]);
  };

  const getRowKey = (row: KeyRow, fallbackIndex: number) => row.id ?? `${row.servico}-${row.prioridade}-${fallbackIndex}`;

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, servico, chave, prioridade, ultimo_erro")
        .eq("ativo", true)
        .order("servico")
        .order("prioridade");

      if (error) throw error;

      const loaded: KeyRow[] = data?.map((row) => ({
        ...row,
        prioridade: row.prioridade ?? 0,
      })) ?? [];

      setKeys(ensureAllProvidersHaveEmptySlots(loaded));
    } catch (error) {
      setKeys(ensureAllProvidersHaveEmptySlots([]));
      toast({
        title: "Erro ao carregar chaves",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const addKey = (servico: ProviderKey) => {
    setKeys((current) => [
      ...current,
      { servico, chave: "", prioridade: getNextPriority(current, servico), isNew: true },
    ]);
  };

  const removeKey = (index: number) => {
    setKeys((current) => {
      const removed = current[index];
      const updated = current.filter((_, itemIndex) => itemIndex !== index);
      return removed ? ensureProviderHasEmptySlot(updated, removed.servico as ProviderKey) : updated;
    });
  };

  const updateKey = (index: number, value: string) => {
    setKeys((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], chave: value };
      return updated;
    });
  };

  const toggleVisibility = (rowKey: string) => {
    setHiddenKeys((current) => {
      const next = new Set(current);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const openBulkModal = (provider: ProviderConfig) => {
    setBulkProvider(provider);
    setBulkValue("");
  };

  const closeBulkModal = () => {
    setBulkProvider(null);
    setBulkValue("");
  };

  const handleBulkAdd = () => {
    if (!bulkProvider) return;

    const parsedKeys = Array.from(
      new Set(
        bulkValue
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      )
    );

    if (parsedKeys.length === 0) {
      toast({
        title: "Nada para adicionar",
        description: "Cole pelo menos uma chave, uma por linha.",
        variant: "destructive",
      });
      return;
    }

    const existingValues = new Set(
      keys
        .filter((row) => row.servico === bulkProvider.key)
        .map((row) => row.chave.trim())
        .filter(Boolean)
    );

    const newKeys = parsedKeys.filter((value) => !existingValues.has(value));

    if (newKeys.length === 0) {
      toast({
        title: "Sem novas chaves",
        description: `As chaves coladas para ${bulkProvider.label} já estão na lista.`,
        variant: "destructive",
      });
      return;
    }

    setKeys((current) => {
      const updated = [...current];
      const emptyIndexes = updated
        .map((row, index) => (row.servico === bulkProvider.key && !row.chave.trim() ? index : -1))
        .filter((index) => index >= 0);

      let nextPriority = getNextPriority(updated, bulkProvider.key);

      newKeys.forEach((value) => {
        const emptyIndex = emptyIndexes.shift();

        if (emptyIndex !== undefined) {
          updated[emptyIndex] = { ...updated[emptyIndex], chave: value };
          return;
        }

        updated.push({
          servico: bulkProvider.key,
          chave: value,
          prioridade: nextPriority,
          isNew: true,
        });
        nextPriority += 1;
      });

      return ensureProviderHasEmptySlot(updated, bulkProvider.key);
    });

    toast({
      title: "Chaves adicionadas",
      description: `${newKeys.length} nova(s) chave(s) adicionada(s) em ${bulkProvider.label}.`,
    });

    closeBulkModal();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const entries = PROVIDERS.flatMap((provider) =>
        keys
          .filter((row) => row.servico === provider.key && row.chave?.trim())
          .map((row, index) => ({
            servico: provider.key,
            chave: row.chave.trim(),
            ativo: true,
            prioridade: index,
          }))
      );

      if (entries.length === 0) {
        toast({ title: "Nenhuma chave inserida", variant: "destructive" });
        return;
      }

      const { error: deleteError } = await supabase
        .from("api_keys")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from("api_keys").insert(entries);
      if (insertError) throw insertError;

      toast({
        title: "Chaves salvas!",
        description: `${entries.length} chave(s) API configurada(s). O fallback automático está activo.`,
      });

      fetchKeys();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isExhausted = (row: KeyRow) => {
    // Desativado para manter as chaves sempre ativas visualmente
    return false;
  };

  const getProviderKeys = (providerKey: ProviderKey) => keys.filter((row) => row.servico === providerKey);
  const getFilledCount = (providerKey: ProviderKey) => keys.filter((row) => row.servico === providerKey && row.chave?.trim()).length;
  const totalActiveKeys = keys.filter((row) => row.chave?.trim()).length;

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">Carregando chaves...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Chaves API</CardTitle>
              <CardDescription>
                Use os campos abaixo ou o modal de colagem para adicionar novas chaves. Pode colar várias chaves do mesmo provedor, uma por linha.
                <span className="mt-2 block font-medium text-primary">
                  {totalActiveKeys} chave(s) activa(s) no total
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {PROVIDERS.map((provider) => {
                const providerKeys = getProviderKeys(provider.key);
                const filledCount = getFilledCount(provider.key);
                const exhaustedCount = providerKeys.filter(isExhausted).length;

                return (
                  <div key={provider.key} className="space-y-4 rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label className="text-sm font-semibold">{provider.label}</Label>
                          <Badge variant="secondary">
                            {filledCount} chave{filledCount === 1 ? "" : "s"}
                          </Badge>
                          {exhaustedCount > 0 && (
                            <Badge variant="secondary">{exhaustedCount} indisponível(eis)</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{provider.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openBulkModal(provider)}>
                          Colar chaves
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addKey(provider.key)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Adicionar campo
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {providerKeys.map((keyRow) => {
                        const globalIndex = keys.findIndex((row) => row === keyRow);
                        const rowKey = getRowKey(keyRow, globalIndex);
                        const exhausted = isExhausted(keyRow);
                        const isHidden = hiddenKeys.has(rowKey);

                        return (
                          <div key={rowKey} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={isHidden ? "password" : "text"}
                                value={keyRow.chave}
                                onChange={(event) => updateKey(globalIndex, event.target.value)}
                                placeholder={`Cole aqui a chave ${provider.placeholder}`}
                                className={exhausted ? "border-destructive pr-16" : "pr-16"}
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleVisibility(rowKey)}
                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                              >
                                {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                            </div>

                            {exhausted && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
                            {!exhausted && keyRow.chave?.trim() && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeKey(globalIndex)}
                              className="h-8 w-8 shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar Todas as Chaves"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Se uma chave falhar ou atingir limite, o sistema tenta automaticamente a próxima chave do mesmo provedor e depois outros provedores disponíveis.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!bulkProvider} onOpenChange={(open) => !open && closeBulkModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Colar novas chaves {bulkProvider ? `de ${bulkProvider.label}` : "API"}
            </DialogTitle>
            <DialogDescription>
              Cole uma ou várias chaves, uma por linha. Ao confirmar, elas serão adicionadas imediatamente aos campos deste provedor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="bulk-api-keys">Chaves API</Label>
            <Textarea
              id="bulk-api-keys"
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
              placeholder={bulkProvider ? `Uma chave ${bulkProvider.label} por linha...` : "Cole as chaves aqui..."}
              className="min-h-40"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeBulkModal}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleBulkAdd}>
              Adicionar chaves
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
