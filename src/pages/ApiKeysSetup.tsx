import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAdmin } from "@/hooks/use-admin";
import { Plus, Trash2, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft, ChevronDown, ChevronRight, Minimize2, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TEXT_PROVIDERS = [
  { key: "gemini", label: "Google AI Studio (Gemini)", placeholder: "AIzaSy...", description: "OCR + texto. Gratuito com limite diário." },
  { key: "groq", label: "Groq", placeholder: "gsk_...", description: "Llama 3.3 70B + Vision OCR. Muito rápido e gratuito." },
  { key: "cerebras", label: "Cerebras", placeholder: "csk-...", description: "Llama 3.3 70B. Extremamente rápido e gratuito." },
  { key: "together", label: "Together AI", placeholder: "tok_...", description: "Llama 3.3 70B free tier. Gratuito." },
  { key: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-...", description: "Fallback robusto para geração de texto." },
  { key: "mistral", label: "Mistral AI", placeholder: "CET6...", description: "Mistral Small. Fallback adicional gratuito." },
] as const;

const IMAGE_PROVIDERS = [
  { key: "stability", label: "Stability AI", placeholder: "sk-...", description: "SDXL / SD3. Alta qualidade para imagens em trabalhos e apresentações." },
  { key: "huggingface", label: "Hugging Face", placeholder: "hf_...", description: "Inference API gratuita. SDXL e modelos open-source." },
  { key: "replicate", label: "Replicate", placeholder: "r8_...", description: "Flux, SDXL e mais. Pay-per-use com free tier." },
  { key: "cloudflare_ai", label: "Cloudflare Workers AI", placeholder: "Bearer ...", description: "Modelos de imagem via Cloudflare. Rápido e com free tier." },
  { key: "segmind", label: "Segmind", placeholder: "SG_...", description: "SDXL e variantes. API rápida com free tier." },
  { key: "leonardo", label: "Leonardo.ai", placeholder: "Bearer ...", description: "Geração de imagens de alta qualidade. Free tier disponível." },
] as const;

const PROVIDERS = [...TEXT_PROVIDERS, ...IMAGE_PROVIDERS] as const;

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
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading, isAuthReady } = useAdmin();

  useEffect(() => {
    if (isAuthReady && !adminLoading && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, isAuthReady, navigate, toast]);

  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());
  const [bulkProvider, setBulkProvider] = useState<ProviderConfig | null>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [now, setNow] = useState(Date.now());

  // Atualizar o tempo real a cada segundo para o cooldown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleProviderCollapsed = (providerKey: string) => {
    setCollapsedProviders((current) => {
      const next = new Set(current);
      if (next.has(providerKey)) next.delete(providerKey);
      else next.add(providerKey);
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedProviders(new Set(PROVIDERS.map((p) => p.key)));
  };

  const expandAll = () => {
    setCollapsedProviders(new Set());
  };

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

      // Identificar chaves que foram removidas da UI para desativá-las
      const currentKeysIds = keys.map(k => k.id).filter((id): id is string => !!id);
      
      try {
        // Marcar como inativas as chaves que não estão mais na lista
        if (currentKeysIds.length > 0) {
          await supabase
            .from("api_keys")
            .update({ ativo: false })
            .not("id", "in", `(${currentKeysIds.join(',')})`);
        } else {
          // Se não houver IDs, desativar todas as chaves ativas
          await supabase
            .from("api_keys")
            .update({ ativo: false })
            .eq("ativo", true);
        }
      } catch (cleanupErr) {
        console.error("Erro não-crítico na limpeza:", cleanupErr);
      }

      // Preparar entradas para upsert (preservando IDs se existirem)
      const upsertEntries = PROVIDERS.flatMap((provider) =>
        keys
          .filter((row) => row.servico === provider.key && row.chave?.trim())
          .map((row, index) => ({
            ...(row.id ? { id: row.id } : {}),
            servico: provider.key,
            chave: row.chave.trim(),
            ativo: true,
            prioridade: index,
          }))
      );

      const { error: upsertError } = await supabase.from("api_keys").upsert(upsertEntries, {
        onConflict: 'id'
      });

      if (upsertError) {
        console.error("Erro ao salvar chaves:", upsertError);
        const errorMsg = upsertError.code === '42501'
          ? "Permissão negada (RLS). Verifique se seu email está na lista de Admin Master ou se as políticas permitem UPSERT."
          : upsertError.message;
        throw new Error(`Erro ao salvar chaves: ${errorMsg}`);
      }

      toast({
        title: "Chaves salvas!",
        description: `${upsertEntries.length} chave(s) API configurada(s). O fallback automático está activo.`,
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

  const getCooldownUntil = (row: KeyRow) => {
    if (!row.ultimo_erro) return 0;
    const timestamp = new Date(row.ultimo_erro).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const isExhausted = (row: KeyRow) => getCooldownUntil(row) > now;

  const getCooldownRemaining = (row: KeyRow) => {
    const remaining = getCooldownUntil(row) - now;
    if (remaining <= 0) return "0s";
    if (remaining < 60_000) return `${Math.ceil(remaining / 1000)}s`;
    if (remaining < 60 * 60 * 1000) {
      const mins = Math.floor(remaining / 60_000);
      const secs = Math.ceil((remaining % 60_000) / 1000);
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.ceil((remaining % (60 * 60 * 1000)) / 60_000);
    return `${hours}h ${mins}m`;
  };

  const getProviderKeys = (providerKey: ProviderKey) => keys.filter((row) => row.servico === providerKey);
  const getFilledCount = (providerKey: ProviderKey) => keys.filter((row) => row.servico === providerKey && row.chave?.trim()).length;
  const totalActiveKeys = keys.filter((row) => row.chave?.trim()).length;

  if (fetching || adminLoading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="gap-2 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Painel
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Configurar Chaves API</CardTitle>
              <CardDescription>
                Use os campos abaixo ou o modal de colagem para adicionar novas chaves. Pode colar várias chaves do mesmo provedor, uma por linha.
                <span className="mt-2 block font-medium text-primary">
                  {totalActiveKeys} chave(s) activa(s) no total
                </span>
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1.5">
                  <Minimize2 className="h-3.5 w-3.5" />
                  Recolher tudo
                </Button>
                <Button variant="outline" size="sm" onClick={expandAll} className="gap-1.5">
                  <Maximize2 className="h-3.5 w-3.5" />
                  Expandir tudo
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">APIs de Texto (IA)</h3>
              {TEXT_PROVIDERS.map((provider) => {
                const providerKeys = getProviderKeys(provider.key);
                const filledCount = getFilledCount(provider.key);
                const exhaustedCount = providerKeys.filter(isExhausted).length;

                return (
                  <div key={provider.key} className="space-y-4 rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <button
                        type="button"
                        onClick={() => toggleProviderCollapsed(provider.key)}
                        className="flex items-start gap-2 text-left flex-1 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        {collapsedProviders.has(provider.key) ? (
                          <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                        )}
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Label className="text-sm font-semibold cursor-pointer">{provider.label}</Label>
                            <Badge variant="secondary">
                              {filledCount} chave{filledCount === 1 ? "" : "s"}
                            </Badge>
                            {exhaustedCount > 0 && (
                              <Badge variant="destructive">{exhaustedCount} em cooldown</Badge>
                            )}
                          </div>
                          {!collapsedProviders.has(provider.key) && (
                            <p className="text-xs text-muted-foreground">{provider.description}</p>
                          )}
                        </div>
                      </button>

                      {!collapsedProviders.has(provider.key) && (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openBulkModal(provider)}>
                            Colar chaves
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => addKey(provider.key)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Adicionar campo
                          </Button>
                        </div>
                      )}
                    </div>

                    {!collapsedProviders.has(provider.key) && (
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

                            {exhausted && (
                              <span className="text-xs text-destructive whitespace-nowrap" title={`Cooldown restante: ${getCooldownRemaining(keyRow)}`}>
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                {getCooldownRemaining(keyRow)}
                              </span>
                            )}
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
                    )}
                  </div>
                );
              })}

              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-4 border-t border-border">APIs de Imagem (Trabalhos & Apresentações)</h3>
              {IMAGE_PROVIDERS.map((provider) => {
                const providerKeys = getProviderKeys(provider.key);
                const filledCount = getFilledCount(provider.key);
                const exhaustedCount = providerKeys.filter(isExhausted).length;

                return (
                  <div key={provider.key} className="space-y-4 rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <button
                        type="button"
                        onClick={() => toggleProviderCollapsed(provider.key)}
                        className="flex items-start gap-2 text-left flex-1 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        {collapsedProviders.has(provider.key) ? (
                          <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                        )}
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Label className="text-sm font-semibold cursor-pointer">{provider.label}</Label>
                            <Badge variant="secondary">
                              {filledCount} chave{filledCount === 1 ? "" : "s"}
                            </Badge>
                            {exhaustedCount > 0 && (
                              <Badge variant="destructive">{exhaustedCount} em cooldown</Badge>
                            )}
                          </div>
                          {!collapsedProviders.has(provider.key) && (
                            <p className="text-xs text-muted-foreground">{provider.description}</p>
                          )}
                        </div>
                      </button>

                      {!collapsedProviders.has(provider.key) && (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openBulkModal(provider)}>
                            Colar chaves
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => addKey(provider.key)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Adicionar campo
                          </Button>
                        </div>
                      )}
                    </div>

                    {!collapsedProviders.has(provider.key) && (
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

                            {exhausted && (
                              <span className="text-xs text-destructive whitespace-nowrap" title={`Cooldown restante: ${getCooldownRemaining(keyRow)}`}>
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                {getCooldownRemaining(keyRow)}
                              </span>
                            )}
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
                    )}
                  </div>
                );
              })}

              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar Todas as Chaves"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Se uma chave falhar ou atingir limite, ela entra em cooldown dinâmico e o sistema avança logo para a próxima opção saudável.
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
