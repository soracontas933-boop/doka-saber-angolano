import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Presentation, Download, Loader2, Sparkles, Send,
  Edit2, Trash2, Plus, Save, Shuffle, Play,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateWithAI, DELLE_SYSTEM_PROMPT } from "@/lib/ai-service";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { saveProject } from "@/lib/save-project";
import { DECK_THEMES } from "@/lib/presentation/themes";
import { composeSlots, assembleDeck, newSeed, pickTheme } from "@/lib/presentation/variator";
import { generateDeckContent, generateDeckImages, type DensityLevel } from "@/lib/presentation/ai-deck";
import { DeckRenderer } from "@/components/apresentacao/DeckRenderer";
import { exportDeckToPDF } from "@/lib/presentation/deck-export";
import type { Deck, AspectRatio } from "@/types/presentation";

interface Card { id: string; title: string; subtopics: string[] }

type Step = "chat" | "cards" | "customize" | "generating" | "preview";

export default function ApresentacaoPage() {
  const navigate = useNavigate();
  const { checkLimit, logUsage } = useUsageTracker();

  const [step, setStep] = useState<Step>("chat");
  const [chatMessage, setChatMessage] = useState("");
  const [numCards, setNumCards] = useState(8);
  const [language] = useState<"pt-AO" | "pt-BR">("pt-AO");

  const [mainTopic, setMainTopic] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [themeId, setThemeId] = useState<string>("midnight-executive");
  const [density, setDensity] = useState<DensityLevel>("medium");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [extraKeywords] = useState<string[]>([]);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [generatingImages, setGeneratingImages] = useState(false);

  // ─── Step 1: Chat ───────────────────────────
  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) return toast.error("Descreve o tema da tua apresentação.");
    setLoading(true);
    try {
      const r = await generateWithAI(
        DELLE_SYSTEM_PROMPT,
        `Tema: "${chatMessage}". Cria um título principal premium e ${numCards} cartões de subtemas (cada um com 2-4 bullets curtos). JSON: {"mainTopic":"...","cards":[{"title":"...","subtopics":["..."]}]}.`,
        2500, 0.75,
      );
      const m = r.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m![0]);
      setMainTopic(parsed.mainTopic);
      setCards((parsed.cards || []).map((c: any, i: number) => ({
        id: `c-${i}`, title: c.title, subtopics: c.subtopics || [],
      })));
      setStep("cards");
    } catch {
      toast.error("Erro a interpretar o tema. Tenta novamente.");
    } finally { setLoading(false); }
  };

  // ─── Step 3: Generate ───────────────────────
  const generate = async (regenerateOnly = false) => {
    const allowed = await checkLimit("apresentacao" as any);
    if (!allowed) return;

    setStep("generating");
    setLoading(true);
    setProgress("A compor estrutura narrativa…");

    try {
      const seed = newSeed();
      const targetCount = Math.max(10, cards.length + 6); // garante seções obrigatórias
      const slots = composeSlots(targetCount, seed);
      const theme = pickTheme(seed, themeId);

      const cardsOutline = cards.map(c =>
        `${c.title}: ${c.subtopics.join("; ")}`
      ).join("\n");

      setProgress("A gerar conteúdo cinematográfico…");
      const aiSlides = await generateDeckContent({
        topic: mainTopic || chatMessage,
        cardsOutline,
        slots,
        language,
        density,
        extraKeywords,
      });

      const newDeck = assembleDeck({
        topic: mainTopic || chatMessage,
        slots, aiSlides, theme, seed, aspectRatio,
      });
      setDeck(newDeck);
      setCurrentSlide(0);
      setStep("preview");

      // imagens em background
      setGeneratingImages(true);
      generateDeckImages(newDeck, (idx, url) => {
        setDeck(prev => {
          if (!prev) return prev;
          const next = { ...prev, slides: prev.slides.map((s, i) => i === idx ? { ...s, imageUrl: url } : s) };
          return next;
        });
      }).finally(() => setGeneratingImages(false));

      if (!regenerateOnly) logUsage("apresentacao" as any);
    } catch (e) {
      console.error(e);
      toast.error("Erro a gerar a apresentação.");
      setStep("customize");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  // ─── Reshuffle: same content, new seed/theme/layouts ──
  const reshuffle = () => {
    if (!deck) return;
    const seed = newSeed();
    const slots = composeSlots(deck.slides.length, seed);
    // mantém o conteúdo mas redistribui — usa títulos/body existentes
    const aiSlides = deck.slides.map(s => ({
      title: s.title, subtitle: s.subtitle, body: s.body, blocks: s.blocks, imagePrompt: s.imagePrompt,
    }));
    const theme = pickTheme(seed); // tema aleatório novo
    const newDeck = assembleDeck({
      topic: deck.topic, slots, aiSlides, theme, seed, aspectRatio: deck.aspectRatio,
    });
    // preserva imagens já geradas
    deck.slides.forEach((s, i) => { if (s.imageUrl && newDeck.slides[i]) newDeck.slides[i].imageUrl = s.imageUrl; });
    setDeck(newDeck);
    setCurrentSlide(0);
    toast.success(`Novo design: ${theme.name}`);
  };

  const handleSave = async () => {
    if (!deck) return;
    try {
      await saveProject("trabalho" as any, `Apresentação - ${deck.topic}`, deck as unknown as Record<string, unknown>);
      toast.success("Apresentação guardada.");
    } catch { toast.error("Erro a guardar."); }
  };

  const handleExport = async () => {
    if (!deck) return;
    toast.info("A exportar PDF…");
    try {
      await exportDeckToPDF(deck, `${deck.topic || "apresentacao"}.pdf`);
      toast.success("PDF gerado.");
    } catch (e) { console.error(e); toast.error("Erro ao exportar."); }
  };

  // ─── UI ─────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-16 border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <Presentation className="h-6 w-6 text-primary" />
            <h1 className="font-bold text-lg hidden md:block">Apresentações Premium</h1>
          </div>
        </div>
        {step === "preview" && deck && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reshuffle}><Shuffle className="h-4 w-4 mr-2" />Re-design</Button>
            <Button variant="outline" size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-2" />Guardar</Button>
            <Button size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-2" />PDF</Button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* CHAT */}
          {step === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto py-12 px-6 space-y-10">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight">Cria uma apresentação cinematográfica</h2>
                <p className="text-muted-foreground text-lg">
                  Diz-me o tema. A engenharia narrativa Gamma+ trata de tudo.
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-2 shadow-sm">
                <textarea
                  value={chatMessage} onChange={e => setChatMessage(e.target.value)}
                  placeholder="Ex: O futuro da agricultura sustentável em Angola…"
                  className="w-full bg-transparent border-0 focus:ring-0 p-4 min-h-[120px] text-lg resize-none outline-none"
                />
                <div className="flex items-center justify-between p-2 border-t">
                  <select value={numCards} onChange={e => setNumCards(Number(e.target.value))}
                    className="text-sm rounded-lg border bg-background px-2 py-1">
                    {[6, 8, 10, 12, 14].map(n => <option key={n} value={n}>{n} blocos</option>)}
                  </select>
                  <Button onClick={handleChatSubmit} disabled={loading || !chatMessage.trim()} className="rounded-xl">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Marketing Digital", "História de Angola", "Energias Renováveis", "Saúde Pública"].map(s => (
                  <button key={s} onClick={() => setChatMessage(s)} className="px-4 py-2 rounded-full border text-sm hover:bg-muted">
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* CARDS */}
          {step === "cards" && (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-10 px-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">{mainTopic}</h2>
                  <p className="text-muted-foreground text-sm mt-1">Edita os blocos antes de gerar.</p>
                </div>
                <Button onClick={() => setStep("customize")}>Continuar →</Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {cards.map((c, i) => (
                  <div key={c.id} className="rounded-2xl border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      {editingCardId === c.id ? (
                        <input
                          autoFocus value={c.title}
                          onChange={e => setCards(cards.map(x => x.id === c.id ? { ...x, title: e.target.value } : x))}
                          onBlur={() => setEditingCardId(null)}
                          className="flex-1 font-bold text-lg bg-transparent border-b border-primary outline-none"
                        />
                      ) : (
                        <h3 className="font-bold text-lg flex-1">{i + 1}. {c.title}</h3>
                      )}
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditingCardId(c.id)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setCards(cards.filter(x => x.id !== c.id))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {c.subtopics.map((s, j) => (
                        <li key={j} className="flex gap-2"><span className="text-primary">•</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <button onClick={() => setCards([...cards, { id: `c-${Date.now()}`, title: "Novo bloco", subtopics: ["Subtema"] }])}
                  className="rounded-2xl border-2 border-dashed p-6 flex items-center justify-center gap-2 text-muted-foreground hover:bg-muted">
                  <Plus className="h-5 w-5" />Adicionar bloco
                </button>
              </div>
            </motion.div>
          )}

          {/* CUSTOMIZE */}
          {step === "customize" && (
            <motion.div key="customize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto py-10 px-6 space-y-8">
              <div>
                <h2 className="text-3xl font-bold">Personaliza o design</h2>
                <p className="text-muted-foreground">Cada paleta gera um estilo visual único.</p>
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider">Paleta</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {DECK_THEMES.map(t => (
                    <button key={t.id} onClick={() => setThemeId(t.id)}
                      className={`rounded-2xl overflow-hidden border-2 transition ${themeId === t.id ? "border-primary scale-[1.02]" : "border-transparent"}`}>
                      <div className="h-24 flex" style={{ backgroundColor: t.palette.bg }}>
                        <div className="flex-1" />
                        <div className="w-1/3" style={{ backgroundColor: t.palette.primary }} />
                        <div className="w-1/6" style={{ backgroundColor: t.palette.accent }} />
                      </div>
                      <div className="p-3 bg-card text-left">
                        <div className="text-sm font-bold">{t.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.motif}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Densidade de texto</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as DensityLevel[]).map(d => (
                      <button key={d} onClick={() => setDensity(d)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium ${density === d ? "border-primary bg-primary/5" : "border-border"}`}>
                        {d === "low" ? "Mínimo" : d === "medium" ? "Equilibrado" : "Detalhado"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Formato</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {(["16:9", "4:5", "1:1", "A4"] as AspectRatio[]).map(a => (
                      <button key={a} onClick={() => setAspectRatio(a)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium ${aspectRatio === a ? "border-primary bg-primary/5" : "border-border"}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("cards")}>← Voltar</Button>
                <Button onClick={() => generate(false)} disabled={loading} className="flex-1 h-12 text-lg">
                  <Sparkles className="h-5 w-5 mr-2" />Gerar apresentação
                </Button>
              </div>
            </motion.div>
          )}

          {/* GENERATING */}
          {step === "generating" && (
            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[70vh] flex items-center justify-center p-6">
              <div className="text-center space-y-6">
                <div className="relative h-32 w-32 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto h-10 w-10 text-primary animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">A compor a tua apresentação…</h2>
                  <p className="text-muted-foreground mt-2">{progress || "Estrutura narrativa, layouts e visuais."}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* PREVIEW */}
          {step === "preview" && deck && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-4rem)] flex flex-col">
              <div className="flex-1 min-h-0">
                <DeckRenderer deck={deck} current={currentSlide} onChange={setCurrentSlide} />
              </div>
              {generatingImages && (
                <div className="shrink-0 flex items-center justify-center gap-2 p-2 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                  <Loader2 className="h-3 w-3 animate-spin" />A gerar visuais HD…
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
