import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Image as ImageIcon, Loader2, LockKeyhole, Trash2, Video, WandSparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/hooks/use-admin";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

const MODELS = {
  image: [
    { id: "qwen-image-3", label: "Qwen Image 3" },
    { id: "nano-banana-2-lite", label: "Nano Banana 2 Lite" },
    { id: "gpt-image-2", label: "GPT Image 2" },
  ],
  video: [
    { id: "minimax-h3", label: "MiniMax H3" },
    { id: "ltx-2.5-pro", label: "LTX 2.5 Pro" },
    { id: "kling-3.0", label: "Kling 3.0" },
    { id: "veo-3.1-fast", label: "Veo 3.1 Fast" },
  ],
} as const;

type MediaType = keyof typeof MODELS;
type RequestStatus = "idle" | "submitting" | "queued" | "in_progress" | "completed" | "failed" | "canceled";

type GeneratedMedia = {
  id: string;
  type: MediaType;
  model: string;
  prompt: string;
  url: string;
  createdAt: string;
};

type HiggsfieldResponse = {
  status?: RequestStatus | string;
  request_id?: string;
  status_url?: string;
  cancel_url?: string;
  error?: string;
  images?: Array<{ url?: string }>;
  videos?: Array<{ url?: string }>;
  video?: { url?: string };
  output?: { url?: string };
  url?: string;
};

const HISTORY_KEY = "doka-higgsfield-media-history";
const TERMINAL_STATUSES = new Set(["completed", "failed", "nsfw", "canceled", "cancelled"]);

function getStoredHistory(): GeneratedMedia[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function getOutputUrl(data: HiggsfieldResponse): string | undefined {
  return data.images?.find((item) => item.url)?.url
    || data.videos?.find((item) => item.url)?.url
    || data.video?.url
    || data.output?.url
    || data.url;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const GeradorMediaPage = () => {
  const { isAdmin } = useAdmin();
  const { isFeatureEnabled } = useFeatureFlags();
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [model, setModel] = useState<string>(MODELS.image[0].id);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<GeneratedMedia | null>(null);
  const [history, setHistory] = useState<GeneratedMedia[]>(getStoredHistory);
  const [request, setRequest] = useState<{ statusUrl?: string; cancelUrl?: string } | null>(null);
  const pollingRef = useRef(false);

  const modelOptions = MODELS[mediaType];
  const selectedModelLabel = useMemo(
    () => modelOptions.find((item) => item.id === model)?.label || model,
    [model, modelOptions],
  );

  useEffect(() => {
    if (!modelOptions.some((item) => item.id === model)) setModel(modelOptions[0].id);
  }, [mediaType, model, modelOptions]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
  }, [history]);

  const invoke = async (body: Record<string, unknown>): Promise<HiggsfieldResponse> => {
    const { data, error } = await supabase.functions.invoke("higgsfield-media", { body });
    if (error) throw new Error(error.message || "Não foi possível contactar a Higgsfield.");
    const response = (data || {}) as HiggsfieldResponse;
    if (response.error) throw new Error(response.error);
    return response;
  };

  const pollResult = async (initial: HiggsfieldResponse, result: GeneratedMedia) => {
    if (!initial.status_url || !initial.cancel_url) throw new Error("A Higgsfield não devolveu os links do pedido.");
    setRequest({ statusUrl: initial.status_url, cancelUrl: initial.cancel_url });
    let delay = 2000;
    let latest = initial;

    for (let attempt = 0; attempt < 90 && pollingRef.current; attempt += 1) {
      const normalizedStatus = latest.status === "cancelled" ? "canceled" : latest.status;
      if (normalizedStatus && TERMINAL_STATUSES.has(normalizedStatus)) break;
      setStatus(normalizedStatus === "in_progress" ? "in_progress" : "queued");
      setStatusMessage(normalizedStatus === "in_progress" ? "A gerar a tua criação…" : "Pedido na fila…");
      await sleep(delay);
      latest = await invoke({ action: "status", status_url: initial.status_url });
      delay = Math.min(Math.round(delay * 1.35), 10000);
    }

    if (latest.status === "completed") {
      const outputUrl = getOutputUrl(latest);
      if (!outputUrl) throw new Error("A geração terminou, mas não devolveu um ficheiro.");
      const completed = { ...result, url: outputUrl };
      setCurrentUrl(outputUrl);
      setCurrentResult(completed);
      setHistory((previous) => [completed, ...previous.filter((item) => item.id !== completed.id)].slice(0, 12));
      setStatus("completed");
      setStatusMessage("Criação concluída.");
      toast.success("A tua criação está pronta.");
    } else if (latest.status === "canceled" || latest.status === "cancelled") {
      setStatus("canceled");
      setStatusMessage("Pedido cancelado.");
    } else {
      throw new Error(latest.error || "A geração não foi concluída.");
    }
  };

  const handleGenerate = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      toast.error("Escreve uma descrição para gerar a tua criação.");
      return;
    }
    pollingRef.current = true;
    setCurrentUrl(null);
    setCurrentResult(null);
    setStatus("submitting");
    setStatusMessage("A enviar o pedido…");
    try {
      const initial = await invoke({ action: "submit", type: mediaType, model, prompt: cleanPrompt });
      const result: GeneratedMedia = {
        id: initial.request_id || crypto.randomUUID(),
        type: mediaType,
        model: selectedModelLabel,
        prompt: cleanPrompt,
        url: "",
        createdAt: new Date().toISOString(),
      };
      await pollResult(initial, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível gerar a criação.";
      setStatus("failed");
      setStatusMessage(message);
      toast.error(message);
    } finally {
      pollingRef.current = false;
      setRequest(null);
    }
  };

  const handleCancel = async () => {
    if (!request?.cancelUrl) return;
    pollingRef.current = false;
    try {
      await invoke({ action: "cancel", cancel_url: request.cancelUrl });
      setStatus("canceled");
      setStatusMessage("Pedido cancelado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar o pedido.");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setCurrentUrl(null);
    setCurrentResult(null);
  };

  if (!isAdmin && !isFeatureEnabled("gerador-media")) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[55vh] max-w-lg items-center justify-center">
          <Card className="w-full rounded-3xl border-border/60 text-center shadow-sm">
            <CardContent className="space-y-4 p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-display font-bold">Funcionalidade indisponível</h1>
                <p className="text-sm text-muted-foreground">O acesso à geração de imagens e vídeos está desactivado para a tua conta.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <WandSparkles className="h-3.5 w-3.5" />
              Laboratório criativo
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight sm:text-3xl">Gerar imagens e vídeos</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Transforma uma ideia em uma imagem ou vídeo com os modelos Higgsfield disponíveis.</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Nova criação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
                <button type="button" onClick={() => setMediaType("image")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${mediaType === "image" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>
                  <ImageIcon className="h-4 w-4" /> Imagem
                </button>
                <button type="button" onClick={() => setMediaType("video")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${mediaType === "video" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>
                  <Video className="h-4 w-4" /> Vídeo
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="higgsfield-model">Modelo</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="higgsfield-model" className="rounded-xl"><SelectValue placeholder="Escolhe um modelo" /></SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="higgsfield-prompt">Descrição</Label>
                  <span className="text-[11px] text-muted-foreground">{prompt.length}/4000</span>
                </div>
                <Textarea id="higgsfield-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value.slice(0, 4000))} placeholder={mediaType === "image" ? "Ex.: Um cartaz cultural angolano sobre Hip-Hop, cores preto e dourado…" : "Ex.: Um plano cinematográfico de uma noite cultural em Luanda, luzes douradas e movimento suave…"} className="min-h-36 resize-y rounded-2xl" />
              </div>

              <Button onClick={handleGenerate} disabled={status === "submitting" || status === "queued" || status === "in_progress"} className="h-11 w-full rounded-xl font-semibold">
                {status === "submitting" || status === "queued" || status === "in_progress" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                {status === "submitting" || status === "queued" || status === "in_progress" ? "A gerar…" : `Gerar ${mediaType === "image" ? "imagem" : "vídeo"}`}
              </Button>

              {(status !== "idle" && status !== "completed") && (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>{statusMessage}</span>
                    {(status === "queued" || status === "in_progress" || status === "submitting") && <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 rounded-lg"><X className="mr-1 h-3.5 w-3.5" /> Cancelar</Button>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[430px] rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Resultado</CardTitle>
              {currentUrl && <a href={currentUrl} download target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="rounded-xl"><Download className="mr-2 h-4 w-4" /> Baixar</Button></a>}
            </CardHeader>
            <CardContent className="flex min-h-[350px] items-center justify-center p-4 sm:p-6">
              {currentUrl ? (mediaType === "video" ? <video src={currentUrl} controls className="max-h-[620px] w-full rounded-2xl bg-black object-contain" /> : <img src={currentUrl} alt={currentResult?.prompt || "Imagem gerada"} className="max-h-[620px] w-full rounded-2xl object-contain" />) : (
                <div className="max-w-sm text-center text-muted-foreground">
                  {status === "submitting" || status === "queued" || status === "in_progress" ? <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" /> : mediaType === "image" ? <ImageIcon className="mx-auto mb-4 h-12 w-12 opacity-30" /> : <Video className="mx-auto mb-4 h-12 w-12 opacity-30" />}
                  <p className="text-sm">{statusMessage || "O resultado da tua próxima criação aparecerá aqui."}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Histórico recente</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">As últimas criações ficam guardadas neste dispositivo.</p>
            </div>
            {history.length > 0 && <Button variant="ghost" size="sm" onClick={clearHistory} className="rounded-xl text-muted-foreground"><Trash2 className="mr-2 h-4 w-4" /> Limpar</Button>}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Ainda não há criações guardadas.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{history.map((item) => <button key={item.id} type="button" onClick={() => { setMediaType(item.type); setCurrentUrl(item.url); setCurrentResult(item); }} className="group overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-left transition hover:border-primary/50"><div className="aspect-square overflow-hidden bg-muted">{item.type === "video" ? <video src={item.url} muted className="h-full w-full object-cover" /> : <img src={item.url} alt={item.prompt} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}</div><div className="p-2"><p className="line-clamp-2 text-xs font-medium">{item.prompt}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.model}</p></div></button>)}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GeradorMediaPage;
